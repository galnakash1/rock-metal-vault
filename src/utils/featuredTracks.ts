import type { Track } from '../types/track'
import { FEATURED_ALBUMS, FEATURED_TRACK_IDS, getLeadArtistKey } from './artistMetadata'
import { normalizeTitleKey } from './riffTabs'

// Featured releases (see FEATURED_ALBUMS / FEATURED_TRACK_IDS in artistMetadata.ts), shared by the
// catalog merge (catalogCache.ts) and the Vault Picks sort (trackUtils.ts). Kept in its own module,
// depending only on artistMetadata and riffTabs, so neither of those two files imports the other.

/** Same studio album, same lead artist — "Nevermind", "Nevermind (Remastered)", "Nevermind (Deluxe)". */
export const albumKey = (track: Pick<Track, 'artist' | 'album'>): string =>
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
export function featuredRank(track: Pick<Track, 'id' | 'artist' | 'album'>): number {
  if (FEATURED_IDS.has(track.id)) return 2
  const title = FEATURED_ALBUM_TITLES.get(albumKey(track))
  if (title === undefined) return 0
  return track.album.toLowerCase() === title ? 2 : 1
}

/** A track from a featured release (artistMetadata): pinned past the per-band cap. */
export function isFeaturedTrack(track: Pick<Track, 'id' | 'artist' | 'album'>): boolean {
  return featuredRank(track) > 0
}
