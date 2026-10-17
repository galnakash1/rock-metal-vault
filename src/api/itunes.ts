import type { ITunesTrackRaw, Track } from '../types/track'
import { SPOTLIGHT_ARTIST_IDS } from '../utils/artistMetadata'
import { CATALOG_CACHE_KEY, parseCatalogCache, serializeCatalogCache } from '../utils/catalogCache'
import { isVaultTrack, normalizeTracks, parseSearchResults } from '../utils/trackUtils'

// ---------- Request plan ----------
// Apple allows roughly 20 requests per minute, so one catalog load stays at 4 requests:
// 3 broad searches for the mainstream, plus 1 Lookup call that returns a few songs from every
// curated international band (Israel, Scandinavia, Japan, Brazil…) by artist id.

const SEARCH_URL = 'https://itunes.apple.com/search'
const LOOKUP_URL = 'https://itunes.apple.com/lookup'
const SEARCH_TERMS = ['rock', 'metal', 'metalcore'] as const
const RESULTS_PER_TERM = 50
const SONGS_PER_SPOTLIGHT_ARTIST = 3 // the Lookup API applies `limit` per artist
const MAX_IDS_PER_LOOKUP = 100 // keeps each URL short; today's ~60 ids fit in one call
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

export function buildLookupUrls(artistIds: readonly number[]): string[] {
  const urls: string[] = []
  for (let start = 0; start < artistIds.length; start += MAX_IDS_PER_LOOKUP) {
    const params = new URLSearchParams({
      id: artistIds.slice(start, start + MAX_IDS_PER_LOOKUP).join(','),
      entity: 'song',
      limit: String(SONGS_PER_SPOTLIGHT_ARTIST),
    })
    urls.push(`${LOOKUP_URL}?${params}`)
  }
  return urls
}

/** Every URL one catalog load requests. */
export function getCatalogRequestUrls(): string[] {
  return [...SEARCH_TERMS.map(buildSearchUrl), ...buildLookupUrls(SPOTLIGHT_ARTIST_IDS)]
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

interface NetworkCatalog {
  tracks: Track[]
  complete: boolean // false when some requests failed but others returned tracks
}

/**
 * Runs every request in parallel. One failed request doesn't sink the catalog: the
 * successful ones are still used. It only throws when nothing at all came back.
 */
async function loadCatalogFromNetwork(): Promise<NetworkCatalog> {
  const settled = await Promise.allSettled(getCatalogRequestUrls().map(requestSongs))
  const raws = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  const failure = settled.find((result) => result.status === 'rejected')

  if (raws.length === 0 && failure) {
    const reason: unknown = failure.reason
    throw reason instanceof Error ? reason : new Error('Something went wrong while loading the Vault.')
  }
  return {
    tracks: normalizeTracks(raws).filter(isVaultTrack),
    complete: failure === undefined,
  }
}

// ---------- Cache & request sharing ----------

let memoryCache: Track[] | null = null
let inFlight: Promise<Track[]> | null = null

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function readSessionCache(): Track[] | null {
  try {
    return parseCatalogCache(getSessionStorage()?.getItem(CATALOG_CACHE_KEY) ?? null, Date.now())
  } catch {
    return null
  }
}

function writeSessionCache(tracks: Track[]): void {
  try {
    getSessionStorage()?.setItem(CATALOG_CACHE_KEY, serializeCatalogCache(tracks, Date.now()))
  } catch {
    // Storage full or blocked: the in-memory cache still covers this page load.
  }
}

function clearCaches(): void {
  memoryCache = null
  try {
    getSessionStorage()?.removeItem(CATALOG_CACHE_KEY)
  } catch {
    // Nothing to clear.
  }
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
}

/**
 * Loads the Vault catalog, at most once per browser session:
 * 1. in-memory cache → 2. sessionStorage cache (30 min) → 3. one shared network batch.
 * Concurrent callers (like React StrictMode's double mount) share the same in-flight batch.
 */
export function fetchCatalog({ signal, forceRefresh = false }: FetchCatalogOptions = {}): Promise<Track[]> {
  if (forceRefresh) {
    clearCaches()
    inFlight = null
  } else {
    if (memoryCache) return abortable(Promise.resolve(memoryCache), signal)
    const cached = readSessionCache()
    if (cached) {
      memoryCache = cached
      return abortable(Promise.resolve(cached), signal)
    }
  }

  if (!inFlight) {
    const request: Promise<Track[]> = loadCatalogFromNetwork()
      .then(({ tracks, complete }) => {
        memoryCache = tracks
        // Partial results are used now but not cached, so the next session tries again.
        if (complete) writeSessionCache(tracks)
        return tracks
      })
      .finally(() => {
        if (inFlight === request) inFlight = null
      })
    inFlight = request
  }
  return abortable(inFlight, signal)
}
