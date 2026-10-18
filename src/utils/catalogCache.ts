import type { Track } from '../types/track'
import { getLeadArtistKey } from './artistMetadata'
import { normalizeTitleKey } from './riffTabs'
import { reviveStoredTracks } from './setlistUtils'
import { dedupeTracks } from './trackUtils'

/**
 * localStorage key for the normalized catalog (shared by every tab, survives reloads).
 * Bump the version whenever the query strategy or Track shape changes, to drop old caches.
 */
export const CATALOG_CACHE_KEY = 'rmv:catalog:v5' // v5: no compilations, canonical artwork, deep tier
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

const releaseTime = (track: Pick<Track, 'releaseDate'>): number => {
  const time = Date.parse(track.releaseDate)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

/**
 * Keeps one copy of each song: Apple often lists one recording on several albums with different
 * track ids — the studio album, a later best-of (Nirvana's self-titled 2002 compilation), a
 * deluxe reissue. The **original (earliest) release wins**, taking the place of the first copy
 * seen so tracks already on screen don't jump around.
 */
export function dedupeSongs(tracks: readonly Track[]): Track[] {
  const result: Track[] = []
  const indexByKey = new Map<string, number>()
  for (const track of tracks) {
    const key = songKey(track)
    const index = indexByKey.get(key)
    if (index === undefined) {
      indexByKey.set(key, result.length)
      result.push(track)
      continue
    }
    const kept = result[index]
    if (kept && releaseTime(track) < releaseTime(kept)) result[index] = track
  }
  return result
}

/** Same studio album, same lead artist — "Nevermind", "Nevermind (Remastered)", "Nevermind (Deluxe)". */
const albumKey = (track: Pick<Track, 'artist' | 'album'>): string =>
  `${getLeadArtistKey(track.artist)}|${normalizeTitleKey(track.album)}`

/**
 * Gives every track from the same studio album one canonical cover and album name: the earliest
 * release of that album (ties: the first seen). Without it, songs from "Nevermind" and
 * "Nevermind (Deluxe Edition)" would show different artwork.
 */
export function canonicalizeAlbumArtwork(tracks: readonly Track[]): Track[] {
  const canonical = new Map<string, Track>()
  for (const track of tracks) {
    const key = albumKey(track)
    const current = canonical.get(key)
    if (!current || releaseTime(track) < releaseTime(current)) canonical.set(key, track)
  }
  return tracks.map((track) => {
    const source = canonical.get(albumKey(track))
    if (!source || source === track) return track
    if (
      source.artworkUrl === track.artworkUrl &&
      source.artworkUrlLarge === track.artworkUrlLarge &&
      source.album === track.album
    ) {
      return track
    }
    return {
      ...track,
      album: source.album,
      artworkUrl: source.artworkUrl,
      artworkUrlLarge: source.artworkUrlLarge,
    }
  })
}

/** No band takes over the catalog: the deep tier lands 20–25 studio songs per flagship band. */
export const MAX_SONGS_PER_ARTIST = 25

/** Keeps the first `max` tracks of each lead artist (Apple lists the most popular songs first). */
export function capTracksPerArtist(tracks: readonly Track[], max: number = MAX_SONGS_PER_ARTIST): Track[] {
  const counts = new Map<string, number>()
  return tracks.filter((track) => {
    const key = getLeadArtistKey(track.artist)
    const count = counts.get(key) ?? 0
    counts.set(key, count + 1)
    return count < max
  })
}

/**
 * Merges a newly arrived batch response into the catalog shown so far (progressive loading):
 * tracks already on screen keep their place, new ones are appended, duplicates (same id or same
 * song) collapse to the original release, each artist is capped at 25 songs, and each album
 * gets one canonical cover.
 */
export function mergeCatalogTracks(current: readonly Track[], incoming: readonly Track[]): Track[] {
  return canonicalizeAlbumArtwork(capTracksPerArtist(dedupeSongs(dedupeTracks([...current, ...incoming]))))
}
