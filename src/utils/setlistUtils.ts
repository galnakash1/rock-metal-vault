import type { FestivalLineup, LineupAct, PosterThemeOption, Track } from '../types/track'
import { COUNTRY_FLAGS, getArtistMetadata } from './artistMetadata'
import { dedupeTracks, getTotalDuration } from './trackUtils'

// ---------- Setlist updates (immutable) ----------

/** Adds the track to the end of the setlist, or removes it if it's already saved. */
export function toggleTrackInList(list: readonly Track[], track: Track): Track[] {
  return list.some((saved) => saved.id === track.id)
    ? list.filter((saved) => saved.id !== track.id)
    : [...list, track]
}

/** Appends every track that isn't saved yet (e.g. "Add All 10 to Festival Setlist"), in order. */
export function addTracksToList(list: readonly Track[], tracks: readonly Track[]): Track[] {
  const ids = new Set(list.map((track) => track.id))
  const added = tracks.filter((track) => {
    if (ids.has(track.id)) return false
    ids.add(track.id)
    return true
  })
  return added.length === 0 ? [...list] : [...list, ...added]
}

/** Removes one track by id; the rest keep their running order. */
export function removeTrackFromList(list: readonly Track[], trackId: number): Track[] {
  return list.filter((track) => track.id !== trackId)
}

// ---------- localStorage persistence ----------

export const SETLIST_STORAGE_KEY = 'rmv:setlist'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || typeof value === 'number'

const isStringOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

/**
 * Rebuilds a Track from untrusted stored JSON. Core fields must have the right types;
 * origin, flag and style are re-derived from the current artist map, so saved tracks pick
 * up later improvements (e.g. a newly listed band) instead of keeping stale enrichment.
 */
export function reviveStoredTrack(value: unknown): Track | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.title !== 'string' ||
    typeof value.artist !== 'string' ||
    typeof value.album !== 'string' ||
    typeof value.genre !== 'string' ||
    typeof value.artworkUrl !== 'string' ||
    typeof value.artworkUrlLarge !== 'string' ||
    typeof value.previewUrl !== 'string' ||
    typeof value.durationMs !== 'number' ||
    typeof value.releaseDate !== 'string' ||
    !isNumberOrNull(value.releaseYear) ||
    typeof value.isExplicit !== 'boolean' ||
    !isNumberOrNull(value.albumTrackCount) ||
    !isStringOrNull(value.storeUrl) ||
    !(value.artistId === undefined || isNumberOrNull(value.artistId))
  ) {
    return null
  }

  // Tracks saved before artist ids were stored have none: fall back to name matching.
  const artistId = typeof value.artistId === 'number' ? value.artistId : null
  const { originCountry, subgenre } = getArtistMetadata(value.artist, value.genre, artistId)
  return {
    id: value.id,
    title: value.title,
    artist: value.artist,
    artistId,
    album: value.album,
    genre: value.genre,
    subgenre,
    originCountry,
    originFlag: COUNTRY_FLAGS[originCountry],
    artworkUrl: value.artworkUrl,
    artworkUrlLarge: value.artworkUrlLarge,
    previewUrl: value.previewUrl,
    durationMs: value.durationMs,
    releaseDate: value.releaseDate,
    releaseYear: value.releaseYear,
    isExplicit: value.isExplicit,
    albumTrackCount: value.albumTrackCount,
    storeUrl: value.storeUrl,
  }
}

/** Revives an untrusted array of stored tracks, dropping malformed entries and duplicate ids. */
export function reviveStoredTracks(data: unknown): Track[] {
  if (!Array.isArray(data)) return []
  const entries: unknown[] = data
  return dedupeTracks(
    entries.map(reviveStoredTrack).filter((track): track is Track => track !== null),
  )
}

/** Parses the stored setlist JSON. Missing, corrupted or non-array data becomes []. */
export function parseStoredSetlist(raw: string | null): Track[] {
  if (raw === null) return []
  try {
    return reviveStoredTracks(JSON.parse(raw))
  } catch {
    return []
  }
}

/** The browser's localStorage, or null where access is blocked (private mode, sandboxing). */
export function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Loads the saved setlist; any storage failure falls back to an empty setlist. */
export function loadSetlist(storage: Pick<Storage, 'getItem'> | null): Track[] {
  if (!storage) return []
  try {
    return parseStoredSetlist(storage.getItem(SETLIST_STORAGE_KEY))
  } catch {
    return []
  }
}

/** Saves the setlist; returns false (instead of throwing) when storage is full or blocked. */
export function saveSetlist(storage: Pick<Storage, 'setItem'> | null, tracks: readonly Track[]): boolean {
  if (!storage) return false
  try {
    storage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(tracks))
    return true
  } catch {
    return false
  }
}

// ---------- Lineup playback ----------

/** Queue label for the festival lineup ("Setlist 2 / 7" in the players). */
export const SETLIST_QUEUE_LABEL = 'Setlist'

// ---------- World tour (festival poster) ----------

export interface TourStop {
  month: number // 0–11
  day: number
  venue: string // "Donington Park"
  place: string // "UK"
}

/** The poster's world tour: iconic rock & metal festival grounds and arenas, in date order. */
export const WORLD_TOUR_STOPS: readonly TourStop[] = [
  { month: 5, day: 12, venue: 'Donington Park', place: 'UK' },
  { month: 5, day: 19, venue: 'Hellfest', place: 'Clisson' },
  { month: 6, day: 3, venue: 'Ullevi', place: 'Gothenburg' },
  { month: 6, day: 31, venue: 'Wacken', place: 'Germany' },
  { month: 7, day: 22, venue: 'Red Rocks', place: 'USA' },
  { month: 8, day: 10, venue: 'Expo Tel Aviv', place: 'Israel' },
  { month: 9, day: 2, venue: 'Budokan', place: 'Tokyo' },
]

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/** "JUN 12" — locale-independent, so the poster reads the same everywhere. */
export function formatTourDate(stop: Pick<TourStop, 'month' | 'day'>): string {
  return `${MONTHS[stop.month] ?? ''} ${String(stop.day).padStart(2, '0')}`.trim()
}

/** The upcoming tour year: this year until the last show has passed, then next year. */
export function getTourYear(now: Date): number {
  const year = now.getFullYear()
  const last = WORLD_TOUR_STOPS.at(-1)
  if (!last) return year
  const lastShow = new Date(year, last.month, last.day, 23, 59, 59)
  return now > lastShow ? year + 1 : year
}

// ---------- Festival poster ----------

export const POSTER_THEMES: readonly PosterThemeOption[] = [
  {
    id: 'hellfire-forge',
    label: 'Hellfire Forge',
    description: 'Molten embers, a charred iron frame and fiery heavy-metal lettering',
  },
  {
    id: 'catacomb-black',
    label: 'Catacomb Black',
    description: 'Stark gothic silver on pitch black with ornate divider rules',
  },
  {
    id: 'thrash-pit-86',
    label: "Thrash Pit '86",
    description: 'Hazard yellow, crimson and black — an 80s thrash and speed-metal flyer',
  },
  {
    id: 'foggy-woodland',
    label: 'Foggy Woodland',
    description: 'Deep Nordic forest mist, pine silhouettes and cold moonlight',
  },
  {
    id: 'blood-moon',
    label: 'Blood Moon',
    description: 'A deep crimson ritual eclipse with sharp metalcore styling',
  },
  {
    id: 'vintage-70s-arena',
    label: "Vintage '70s Arena",
    description: 'Distressed warm parchment, like a classic hard-rock arena tour poster',
  },
]

const MAX_HEADLINERS = 3

/** How many acts headline: about the top third, at least 1, at most 3. */
export function getHeadlinerCount(actCount: number): number {
  if (actCount <= 0) return 0
  return Math.min(MAX_HEADLINERS, Math.ceil(actCount / 3))
}

/**
 * Groups saved tracks by artist into poster acts, ranks them (most saved tracks, then longest
 * total runtime, then name) and splits them into Headliners and the Main Stage underbill.
 */
export function buildFestivalLineup(tracks: readonly Track[]): FestivalLineup {
  const byArtist = new Map<string, Track[]>()
  for (const track of tracks) {
    byArtist.set(track.artist, [...(byArtist.get(track.artist) ?? []), track])
  }

  const acts: LineupAct[] = [...byArtist.entries()].map(([artist, actTracks]) => {
    const [first] = actTracks
    return {
      artist,
      originCountry: first?.originCountry ?? 'Unknown',
      originFlag: first?.originFlag ?? COUNTRY_FLAGS.Unknown,
      subgenre: first?.subgenre ?? 'Rock',
      tracks: actTracks,
      runtimeMs: getTotalDuration(actTracks),
    }
  })

  acts.sort(
    (a, b) =>
      b.tracks.length - a.tracks.length ||
      b.runtimeMs - a.runtimeMs ||
      a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' }),
  )

  const headlinerCount = getHeadlinerCount(acts.length)
  return {
    headliners: acts.slice(0, headlinerCount),
    underbill: acts.slice(headlinerCount),
    trackCount: tracks.length,
    artistCount: acts.length,
    totalRuntimeMs: getTotalDuration([...tracks]),
  }
}
