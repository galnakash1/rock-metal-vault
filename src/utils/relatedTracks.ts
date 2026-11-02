import type { Track } from '../types/track'
import { getLeadArtistKey } from './artistMetadata'

/** How many tracks the "More Like This" strip shows. */
export const RELATED_TRACKS_LIMIT = 6

/** Trimmed, lower-cased, single-spaced; '' for missing values (which never match anything). */
export function normalizeGenreKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

const sameKey = (a: string, b: string): boolean => a !== '' && a === b

/**
 * Closest release year first, unknown years last, then title and id — so the order depends only
 * on the tracks themselves, never on the order catalog batches arrived in.
 */
function compareByCloseness(current: Track, a: Track, b: Track): number {
  const distance = (track: Track): number =>
    current.releaseYear === null || track.releaseYear === null
      ? Number.POSITIVE_INFINITY
      : Math.abs(track.releaseYear - current.releaseYear)
  const byYear = distance(a) - distance(b)
  if (byYear !== 0 && !Number.isNaN(byYear)) return byYear
  return a.title.localeCompare(b.title) || a.id - b.id
}

/**
 * Orders one tier for artist variety: the best-ranked track of each other artist first, then
 * those artists' remaining tracks, then the current artist's own tracks.
 */
function diversify(current: Track, tier: Track[]): Track[] {
  const currentArtist = getLeadArtistKey(current.artist)
  const ranked = [...tier].sort((a, b) => compareByCloseness(current, a, b))
  const seenArtists = new Set<string>()
  const firstPerArtist: Track[] = []
  const otherArtistsRest: Track[] = []
  const sameArtist: Track[] = []
  for (const track of ranked) {
    const artist = getLeadArtistKey(track.artist)
    if (artist === currentArtist) sameArtist.push(track)
    else if (seenArtists.has(artist)) otherArtistsRest.push(track)
    else {
      seenArtists.add(artist)
      firstPerArtist.push(track)
    }
  }
  return [...firstPerArtist, ...otherArtistsRest, ...sameArtist]
}

/**
 * "More Like This": up to `limit` catalog tracks related to `current`, deterministically.
 * 1. Same style (`subgenre`), favouring other artists and the closest release years.
 * 2. Only if that leaves room: same iTunes genre (`genre`) but a different style.
 * Never pads with unrelated tracks, never includes the current track, never repeats an id,
 * and treats missing/empty style or genre values as "no match". Pure: no network, no randomness.
 */
export function getRelatedTracks(
  current: Track,
  catalog: readonly Track[],
  limit: number = RELATED_TRACKS_LIMIT,
): Track[] {
  if (limit <= 0) return []
  const subgenre = normalizeGenreKey(current.subgenre)
  const genre = normalizeGenreKey(current.genre)

  const seenIds = new Set<number>([current.id])
  const sameStyle: Track[] = []
  const sameGenre: Track[] = []
  for (const track of catalog) {
    if (seenIds.has(track.id)) continue
    if (sameKey(normalizeGenreKey(track.subgenre), subgenre)) {
      seenIds.add(track.id)
      sameStyle.push(track)
    } else if (sameKey(normalizeGenreKey(track.genre), genre)) {
      seenIds.add(track.id)
      sameGenre.push(track)
    }
  }

  return [...diversify(current, sameStyle), ...diversify(current, sameGenre)].slice(0, limit)
}
