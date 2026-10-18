import type { Track } from '../types/track'
import { getLeadArtistKey } from './artistMetadata'
import { normalizeTitleKey } from './riffTabs'
import { reviveStoredTracks } from './setlistUtils'
import { dedupeTracks } from './trackUtils'

/**
 * localStorage key for the normalized catalog (shared by every tab, survives reloads).
 * Bump the version whenever the query strategy or Track shape changes, to drop old caches.
 */
export const CATALOG_CACHE_KEY = 'rmv:catalog:v4' // v4: studio-only, headliner tier
export const CATALOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

interface CatalogCacheEntry {
  savedAt: number // epoch ms
  tracks: Track[]
}

export function serializeCatalogCache(tracks: readonly Track[], now: number): string {
  const entry: CatalogCacheEntry = { savedAt: now, tracks: [...tracks] }
  return JSON.stringify(entry)
}

/**
 * Reads a cached catalog. Returns null when it's missing, corrupted, older than `ttlMs`, from the
 * future, or empty — callers then fetch fresh data. Tracks are re-validated and re-enriched.
 */
export function parseCatalogCache(
  raw: string | null,
  now: number,
  ttlMs: number = CATALOG_CACHE_TTL_MS,
): Track[] | null {
  if (raw === null) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || !('savedAt' in data) || !('tracks' in data)) {
    return null
  }
  const { savedAt, tracks } = data
  if (typeof savedAt !== 'number' || savedAt > now || now - savedAt > ttlMs) return null

  const revived = reviveStoredTracks(tracks)
  return revived.length > 0 ? revived : null
}

/** Same song, same lead artist — e.g. the album and the "Greatest Hits" release of one recording. */
const songKey = (track: Pick<Track, 'artist' | 'title'>): string =>
  `${getLeadArtistKey(track.artist)}|${normalizeTitleKey(track.title)}`

/**
 * Keeps the first copy of each song: Apple often lists one recording on several albums
 * ("Smells Like Teen Spirit" on Nevermind and on a compilation) with different track ids.
 */
export function dedupeSongs(tracks: readonly Track[]): Track[] {
  const seen = new Set<string>()
  return tracks.filter((track) => {
    const key = songKey(track)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Merges a newly arrived batch response into the catalog shown so far (progressive loading):
 * tracks already on screen keep their place, new ones are appended, and duplicates (same id or
 * same song) are dropped.
 */
export function mergeCatalogTracks(current: readonly Track[], incoming: readonly Track[]): Track[] {
  return dedupeSongs(dedupeTracks([...current, ...incoming]))
}
