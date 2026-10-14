import type { ITunesTrackRaw, SortKey, Track, TrackFilters } from '../types/track'

// ---------- Formatting ----------

const pad2 = (value: number): string => String(value).padStart(2, '0')

/**
 * Formats milliseconds as zero-padded "mm:ss" (e.g. 245000 → "04:05").
 * Durations of one hour or more become "h:mm:ss" (used for setlist totals).
 * Missing, negative or non-finite input returns "00:00".
 */
export function formatDuration(ms?: number): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(minutes)}:${pad2(seconds)}`
}

/**
 * Rewrites an iTunes artwork URL to a larger size:
 * ".../100x100bb.jpg" → ".../600x600bb.jpg". Non-matching URLs are returned unchanged.
 */
export function upgradeArtworkUrl(url: string, size = 600): string {
  return url.replace(/\d+x\d+bb(?=\.\w+$)/, `${size}x${size}bb`)
}

/** Extracts the UTC year from an ISO date, or null if the date is invalid. */
export function getReleaseYear(isoDate: string): number | null {
  const year = new Date(isoDate).getUTCFullYear()
  return Number.isNaN(year) ? null : year
}

// ---------- Normalization ----------

/**
 * Maps a raw iTunes result to the app's Track model.
 * Returns null for non-track results and for tracks without a preview,
 * since every track in the Vault must be playable.
 */
export function normalizeTrack(raw: ITunesTrackRaw): Track | null {
  if (raw.wrapperType !== 'track' || !raw.previewUrl) return null

  return {
    id: raw.trackId,
    title: raw.trackName,
    artist: raw.artistName,
    album: raw.collectionName ?? 'Unknown album',
    genre: raw.primaryGenreName,
    artworkUrl: raw.artworkUrl100,
    artworkUrlLarge: upgradeArtworkUrl(raw.artworkUrl100),
    previewUrl: raw.previewUrl,
    durationMs: raw.trackTimeMillis ?? 0,
    releaseDate: raw.releaseDate,
    releaseYear: getReleaseYear(raw.releaseDate),
    isExplicit: raw.trackExplicitness === 'explicit',
    albumTrackCount: raw.trackCount ?? null,
    storeUrl: raw.trackViewUrl ?? null,
  }
}

/**
 * Removes tracks whose id (iTunes trackId) was already seen, keeping the first occurrence.
 * Merged search queries often return the same song, so this keeps React keys unique.
 */
export function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<number>()
  return tracks.filter((track) => {
    if (seen.has(track.id)) return false
    seen.add(track.id)
    return true
  })
}

/** Normalizes raw results, drops unusable ones, and de-duplicates by trackId. */
export function normalizeTracks(raws: ITunesTrackRaw[]): Track[] {
  const tracks = raws
    .map(normalizeTrack)
    .filter((track): track is Track => track !== null)
  return dedupeTracks(tracks)
}

// ---------- Filtering & sorting ----------

/**
 * Case-insensitive search across title, artist and album, combined (AND)
 * with exact genre and artist matches. Empty filter values match everything.
 */
export function filterTracks(
  tracks: Track[],
  filters: Pick<TrackFilters, 'search' | 'genre' | 'artist'>,
): Track[] {
  const query = filters.search.trim().toLowerCase()

  return tracks.filter((track) => {
    const matchesSearch =
      query === '' ||
      [track.title, track.artist, track.album].some((field) =>
        field.toLowerCase().includes(query),
      )
    const matchesGenre = filters.genre === '' || track.genre === filters.genre
    const matchesArtist = filters.artist === '' || track.artist === filters.artist
    return matchesSearch && matchesGenre && matchesArtist
  })
}

const compareText = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { sensitivity: 'base' })

const toTimestamp = (isoDate: string): number => {
  const time = Date.parse(isoDate)
  return Number.isNaN(time) ? 0 : time
}

const comparators: Record<SortKey, (a: Track, b: Track) => number> = {
  'title-asc': (a, b) => compareText(a.title, b.title),
  'title-desc': (a, b) => compareText(b.title, a.title),
  'artist-asc': (a, b) => compareText(a.artist, b.artist) || compareText(a.title, b.title),
  'year-newest': (a, b) => toTimestamp(b.releaseDate) - toTimestamp(a.releaseDate),
  'year-oldest': (a, b) => toTimestamp(a.releaseDate) - toTimestamp(b.releaseDate),
  'duration-shortest': (a, b) => a.durationMs - b.durationMs,
  'duration-longest': (a, b) => b.durationMs - a.durationMs,
}

/** Returns a new sorted array; the input array is never mutated. */
export function sortTracks(tracks: Track[], sort: SortKey): Track[] {
  return [...tracks].sort(comparators[sort])
}

// ---------- Aggregates ----------

/** Total duration of a list of tracks in milliseconds (0 for an empty list). */
export function getTotalDuration(tracks: Track[]): number {
  return tracks.reduce((total, track) => total + track.durationMs, 0)
}

const uniqueSorted = (values: string[]): string[] => [...new Set(values)].sort(compareText)

/** Sorted, de-duplicated genre names for the genre filter. */
export function getUniqueGenres(tracks: Track[]): string[] {
  return uniqueSorted(tracks.map((track) => track.genre))
}

/** Sorted, de-duplicated artist names for the artist filter. */
export function getUniqueArtists(tracks: Track[]): string[] {
  return uniqueSorted(tracks.map((track) => track.artist))
}
