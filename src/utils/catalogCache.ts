import type { Track } from '../types/track'
import { reviveStoredTracks } from './setlistUtils'

/** Bump the version whenever the query strategy or Track shape changes, to drop old caches. */
export const CATALOG_CACHE_KEY = 'rmv:catalog:v2'
export const CATALOG_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

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
