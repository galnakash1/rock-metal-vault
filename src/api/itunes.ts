import type { ITunesTrackRaw, Track } from '../types/track'
import {
  DEEP_CATALOG_ARTIST_IDS,
  HEADLINER_ARTIST_IDS,
  SPOTLIGHT_ARTIST_IDS,
} from '../utils/artistMetadata'
import {
  CATALOG_CACHE_KEY,
  mergeCatalogTracks,
  parseCatalogCache,
  serializeCatalogCache,
} from '../utils/catalogCache'
import { getBrowserStorage } from '../utils/setlistUtils'
import { isVaultTrack, normalizeTracks, parseSearchResults } from '../utils/trackUtils'

// ---------- Request plan ----------
// Apple allows roughly 20 requests per minute. A cold catalog load makes 12 requests (and the
// 6-hour localStorage cache means most loads make none), all in parallel:
// - 3 broad searches for the mainstream;
// - 3 deep lookups: the top 50 songs of 21 flagship bands (Metallica, Slipknot, Meshuggah…) —
//   about half are live, compilation or duplicate versions, so after filtering each band keeps
//   20–25 studio songs (the merge caps every artist at 25);
// - 2 headliner lookups: the top 10 songs of the other flagship bands;
// - 4 spotlight lookups: 5 songs from every other curated band (Israel, Scandinavia, Japan…).
// Live, compilation and duplicate versions are filtered out afterwards. Uncached lookups slow down
// sharply with more ids × songs, hence the small chunks (7 × 50 songs ≈ 3.5–4.5 s).

const SEARCH_URL = 'https://itunes.apple.com/search'
const LOOKUP_URL = 'https://itunes.apple.com/lookup'
const SEARCH_TERMS = ['rock', 'metal', 'metalcore'] as const
const RESULTS_PER_TERM = 50
// The Lookup API applies `limit` per artist. Chunk sizes keep each uncached lookup ~2–5 s.
export const LOOKUP_TIERS = {
  deep: { songsPerArtist: 50, idsPerLookup: 7 },
  headliner: { songsPerArtist: 10, idsPerLookup: 12 },
  spotlight: { songsPerArtist: 5, idsPerLookup: 16 },
} as const

type LookupTier = (typeof LOOKUP_TIERS)[keyof typeof LOOKUP_TIERS]
const REQUEST_TIMEOUT_MS = 15_000

export function buildSearchUrl(term: string): string {
  const params = new URLSearchParams({
    term,
    media: 'music',
    entity: 'song',
    limit: String(RESULTS_PER_TERM),
  })
  return `${SEARCH_URL}?${params}`
}

export function buildLookupUrls(
  artistIds: readonly number[],
  tier: LookupTier = LOOKUP_TIERS.spotlight,
): string[] {
  const urls: string[] = []
  for (let start = 0; start < artistIds.length; start += tier.idsPerLookup) {
    const params = new URLSearchParams({
      id: artistIds.slice(start, start + tier.idsPerLookup).join(','),
      entity: 'song',
      limit: String(tier.songsPerArtist),
    })
    urls.push(`${LOOKUP_URL}?${params}`)
  }
  return urls
}

/** Every URL one catalog load requests. */
export function getCatalogRequestUrls(): string[] {
  return [
    ...SEARCH_TERMS.map(buildSearchUrl),
    ...buildLookupUrls(DEEP_CATALOG_ARTIST_IDS, LOOKUP_TIERS.deep),
    ...buildLookupUrls(HEADLINER_ARTIST_IDS, LOOKUP_TIERS.headliner),
    ...buildLookupUrls(SPOTLIGHT_ARTIST_IDS, LOOKUP_TIERS.spotlight),
  ]
}

// ---------- Network ----------

async function requestSongs(url: string): Promise<ITunesTrackRaw[]> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, { signal: timeout })
  } catch (error) {
    const message = timeout.aborted
      ? 'The iTunes API took too long to respond. Try again in a moment.'
      : "Couldn't reach the iTunes API. Check your connection and try again."
    throw new Error(message, { cause: error })
  }

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Apple's iTunes API is rate-limiting requests. Wait a minute, then try again."
        : `The iTunes API responded with an error (HTTP ${response.status}).`,
    )
  }

  const data: unknown = await response.json()
  return parseSearchResults(data)
}

// ---------- Progressive batch, caches & request sharing ----------

/** Receives the merged catalog so far, each time another request in the batch lands. */
export type CatalogProgressListener = (tracksSoFar: Track[]) => void

interface CatalogBatch {
  tracks: Track[] // merged so far
  listeners: Set<CatalogProgressListener>
  promise: Promise<Track[]> // settles once every request has finished
}

let memoryCache: Track[] | null = null
let batch: CatalogBatch | null = null

function readPersistentCache(): Track[] | null {
  try {
    return parseCatalogCache(getBrowserStorage()?.getItem(CATALOG_CACHE_KEY) ?? null, Date.now())
  } catch {
    return null
  }
}

function writePersistentCache(tracks: Track[]): void {
  try {
    getBrowserStorage()?.setItem(CATALOG_CACHE_KEY, serializeCatalogCache(tracks, Date.now()))
  } catch {
    // Storage full or blocked: the in-memory cache still covers this page load.
  }
}

function clearCaches(): void {
  memoryCache = null
  try {
    getBrowserStorage()?.removeItem(CATALOG_CACHE_KEY)
  } catch {
    // Nothing to clear.
  }
}

/**
 * A fresh cached catalog (memory first, then localStorage), or null. Synchronous, so the very
 * first render can show the catalog without a loading state.
 */
export function getCachedCatalog(): Track[] | null {
  memoryCache ??= readPersistentCache()
  return memoryCache
}

/**
 * Starts every request in parallel and merges each response into the catalog the moment it
 * lands (progressive rendering: the fastest search usually arrives in a few hundred ms).
 * One failed request doesn't sink the catalog; it only rejects when nothing came back at all.
 */
function startBatch(): CatalogBatch {
  const current: CatalogBatch = { tracks: [], listeners: new Set(), promise: Promise.resolve([]) }

  const requests = getCatalogRequestUrls().map(async (url) => {
    const incoming = normalizeTracks(await requestSongs(url)).filter(isVaultTrack)
    const merged = mergeCatalogTracks(current.tracks, incoming)
    if (merged.length === current.tracks.length) return
    current.tracks = merged
    for (const listener of current.listeners) listener(merged)
  })

  current.promise = Promise.allSettled(requests)
    .then((results) => {
      const failure = results.find((result) => result.status === 'rejected')
      if (failure && current.tracks.length === 0) {
        const reason: unknown = failure.reason
        throw reason instanceof Error
          ? reason
          : new Error('Something went wrong while loading the Vault.')
      }
      memoryCache = current.tracks
      // Partial results are used now but not persisted, so the next load tries again.
      if (!failure) writePersistentCache(current.tracks)
      return current.tracks
    })
    .finally(() => {
      if (batch === current) batch = null
    })
  return current
}

/**
 * Lets one caller stop waiting without cancelling the shared request: when `signal` aborts,
 * only this caller's promise rejects (with an AbortError), and the batch still fills the cache.
 */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException('The catalog request was aborted.', 'AbortError'))
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

export interface FetchCatalogOptions {
  /** Abort waiting for the catalog (e.g. on unmount); the shared batch keeps running. */
  signal?: AbortSignal
  /** Skip both caches and fetch fresh data — used by the Retry button. */
  forceRefresh?: boolean
  /** Called with the merged catalog so far whenever another network response arrives. */
  onProgress?: CatalogProgressListener
}

/**
 * Loads the Vault catalog:
 * 1. memory cache → 2. localStorage cache (6 h, shared across tabs) → 3. one shared network
 *    batch that reports partial results through `onProgress` as each request lands.
 * Concurrent callers (like React StrictMode's double mount) join the same in-flight batch.
 */
export function fetchCatalog({
  signal,
  forceRefresh = false,
  onProgress,
}: FetchCatalogOptions = {}): Promise<Track[]> {
  if (forceRefresh) {
    clearCaches()
    batch = null
  } else {
    const cached = getCachedCatalog()
    if (cached) return abortable(Promise.resolve(cached), signal)
  }

  batch ??= startBatch()
  const current = batch

  if (onProgress && !signal?.aborted) {
    current.listeners.add(onProgress)
    const unsubscribe = () => current.listeners.delete(onProgress)
    signal?.addEventListener('abort', unsubscribe, { once: true })
    current.promise.then(unsubscribe, unsubscribe)
    // A caller joining mid-batch (StrictMode's second mount) gets what has already arrived.
    if (current.tracks.length > 0) {
      const soFar = current.tracks
      queueMicrotask(() => {
        if (current.listeners.has(onProgress)) onProgress(soFar)
      })
    }
  }
  return abortable(current.promise, signal)
}
