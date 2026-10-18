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
