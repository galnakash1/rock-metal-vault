import type { Track } from '../types/track'
import { FEATURED_ALBUMS, FEATURED_TRACK_IDS, getLeadArtistKey, getSongCap } from './artistMetadata'
import { normalizeTitleKey } from './riffTabs'
import { reviveStoredTracks } from './setlistUtils'
import { dedupeTracks } from './trackUtils'

/**
 * localStorage key for the normalized catalog (shared by every tab, survives reloads).
 * Bump the version whenever the query strategy or Track shape changes, to drop old caches.
 */
export const CATALOG_CACHE_KEY = 'rmv:catalog:v6' // v6: Limp Bizkit, Saliva, featured releases (Sempiternal)
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

/** Same studio album, same lead artist — "Nevermind", "Nevermind (Remastered)", "Nevermind (Deluxe)". */
const albumKey = (track: Pick<Track, 'artist' | 'album'>): string =>
  `${getLeadArtistKey(track.artist)}|${normalizeTitleKey(track.album)}`

const FEATURED_IDS: ReadonlySet<number> = new Set(FEATURED_TRACK_IDS)
// album key → the featured edition's exact title ("sempiternal", not "sempiternal (deluxe)")
const FEATURED_ALBUM_TITLES: ReadonlyMap<string, string> = new Map(
  FEATURED_ALBUMS.map((featured) => [albumKey(featured), featured.album.toLowerCase()]),
)

/**
 * 2 = a featured release itself (a listed track id, or the featured album's standard edition);
 * 1 = another edition of a featured album; 0 = not featured.
 */
function featuredRank(track: Pick<Track, 'id' | 'artist' | 'album'>): number {
  if (FEATURED_IDS.has(track.id)) return 2
  const title = FEATURED_ALBUM_TITLES.get(albumKey(track))
  if (title === undefined) return 0
  return track.album.toLowerCase() === title ? 2 : 1
}

/** A track from a featured release (artistMetadata): pinned past the per-band cap. */
export function isFeaturedTrack(track: Pick<Track, 'id' | 'artist' | 'album'>): boolean {
  return featuredRank(track) > 0
}

const releaseTime = (track: Pick<Track, 'releaseDate'>): number => {
  const time = Date.parse(track.releaseDate)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

/** Which copy represents a song or album: a featured release first, then the earliest release. */
const isPreferred = (candidate: Track, current: Track): boolean => {
  const rankDelta = featuredRank(candidate) - featuredRank(current)
  return rankDelta !== 0 ? rankDelta > 0 : releaseTime(candidate) < releaseTime(current)
}

/**
 * Keeps one copy of each song: Apple often lists one recording on several albums with different
 * track ids — the studio album, a later best-of (Nirvana's self-titled 2002 compilation), a
 * deluxe reissue. A featured studio original wins, otherwise the **original (earliest) release**,
 * taking the place of the first copy seen so tracks already on screen don't jump around.
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
    if (kept && isPreferred(track, kept)) result[index] = track
  }
  return result
}

/**
 * Gives every track from the same studio album one canonical cover and album name: the featured
 * edition (e.g. the standard "Sempiternal"), otherwise the earliest release (ties: the first seen). Without it, songs from "Nevermind" and
 * "Nevermind (Deluxe Edition)" would show different artwork.
 */
export function canonicalizeAlbumArtwork(tracks: readonly Track[]): Track[] {
  const canonical = new Map<string, Track>()
  for (const track of tracks) {
    const key = albumKey(track)
    const current = canonical.get(key)
    if (!current || isPreferred(track, current)) canonical.set(key, track)
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

/** The cap for one band: 25, or its override (Bring Me The Horizon: 35). */
const defaultCapFor = (artist: string): number => getSongCap(artist, MAX_SONGS_PER_ARTIST)

/**
 * Keeps at most `capFor(artist)` tracks per lead artist. Featured tracks are always kept and count
 * toward the cap; the remaining slots go to the band's other tracks in order (Apple lists the most
 * popular songs first).
 */
export function capTracksPerArtist(
  tracks: readonly Track[],
  capFor: (artist: string) => number = defaultCapFor,
): Track[] {
  const pinned = new Map<string, number>()
  for (const track of tracks) {
    if (!isFeaturedTrack(track)) continue
    const key = getLeadArtistKey(track.artist)
    pinned.set(key, (pinned.get(key) ?? 0) + 1)
  }
  const others = new Map<string, number>()
  return tracks.filter((track) => {
    if (isFeaturedTrack(track)) return true
    const key = getLeadArtistKey(track.artist)
    const count = others.get(key) ?? 0
    others.set(key, count + 1)
    return count < capFor(track.artist) - (pinned.get(key) ?? 0)
  })
}

/**
 * Merges a newly arrived batch response into the catalog shown so far (progressive loading):
 * tracks already on screen keep their place, new ones are appended, duplicates (same id or same
 * song) collapse to the original release, each artist is capped (25 songs, or an override, with
 * featured releases pinned), and each album gets one canonical cover.
 */
export function mergeCatalogTracks(current: readonly Track[], incoming: readonly Track[]): Track[] {
  return canonicalizeAlbumArtwork(capTracksPerArtist(dedupeSongs(dedupeTracks([...current, ...incoming]))))
}
