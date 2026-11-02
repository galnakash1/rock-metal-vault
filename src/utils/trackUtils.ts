import type {
  FetchStatus,
  ITunesExplicitness,
  ITunesTrackRaw,
  MoodCapsule,
  MoodId,
  OriginCountry,
  SortKey,
  Subgenre,
  Track,
  TrackFilters,
} from '../types/track'
import {
  COUNTRY_FLAGS,
  DEEP_CATALOG_ARTISTS,
  HEADLINER_ARTISTS,
  findArtistMetadata,
  getArtistMetadata,
  getLeadArtistKey,
  normalizeArtistKey,
} from './artistMetadata'
import { isFeaturedTrack } from './featuredTracks'

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

// ---------- API response validation ----------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isOptional = (value: unknown, type: 'string' | 'number'): boolean =>
  value === undefined || typeof value === type

const EXPLICITNESS_VALUES: ReadonlySet<unknown> = new Set<ITunesExplicitness>([
  'explicit',
  'notExplicit',
  'cleaned',
])

/** Runtime check that an unknown API result has the fields (and types) ITunesTrackRaw promises. */
export function isITunesTrackRaw(value: unknown): value is ITunesTrackRaw {
  return (
    isRecord(value) &&
    typeof value.wrapperType === 'string' &&
    typeof value.trackId === 'number' &&
    typeof value.trackName === 'string' &&
    typeof value.artistName === 'string' &&
    typeof value.artworkUrl100 === 'string' &&
    typeof value.primaryGenreName === 'string' &&
    typeof value.releaseDate === 'string' &&
    EXPLICITNESS_VALUES.has(value.trackExplicitness) &&
    isOptional(value.artistId, 'number') &&
    isOptional(value.collectionName, 'string') &&
    isOptional(value.previewUrl, 'string') &&
    isOptional(value.trackTimeMillis, 'number') &&
    isOptional(value.trackCount, 'number')
  )
}

/**
 * Validates a parsed iTunes Search response body and returns its well-formed results.
 * Throws if the body isn't shaped like `{ results: [...] }`; malformed entries are skipped.
 */
export function parseSearchResults(data: unknown): ITunesTrackRaw[] {
  if (!isRecord(data) || !Array.isArray(data.results)) {
    throw new Error('The iTunes API returned an unexpected response.')
  }
  const results: unknown[] = data.results
  return results.filter(isITunesTrackRaw)
}

// ---------- Studio-only filter ----------

/** Live versions: "(Live…", "[Live…", "Song - Live", and live albums like "Live at Wembley". */
const LIVE_PATTERNS: readonly RegExp[] = [
  /[([]\s*live\b/i,
  /\s[-–—]\s*live\b/i,
  // "Live at/from/in/on" + a capitalised venue — but not song titles like "Live and Let Die".
  /\b[Ll]ive (?:[Aa]t|[Ff]rom|[Ii]n|[Oo]n) (?:[Tt]he )?[A-Z0-9]/,
]

/** Other non-studio releases: commentary, karaoke, interviews, unplugged sessions. */
const NON_STUDIO_PATTERNS: readonly RegExp[] = [
  /\bcommentary\b/i,
  /\bkaraoke\b/i,
  /\binterview\b/i,
  /\bunplugged\b/i,
]

/**
 * Greatest-hits, best-of and soundtrack releases. Apple often lists a band's hits on these, with a
 * different cover than the original studio album, so they're kept out of the catalog.
 */
const COMPILATION_PATTERN =
  /\b(?:greatest hit[sz]|best of|anthology|essential|icon|20th century masters|retrospective|the singles|b-sides|soundtrack|motion picture)\b/i

/** True when an album name marks a compilation (e.g. "Greatest Hits, Vol. 1", "The Essential Korn"). */
export function isCompilationAlbum(collectionName = ''): boolean {
  return COMPILATION_PATTERN.test(collectionName)
}

/**
 * True only for studio recordings: the track title and its album must not mark a live, commentary,
 * karaoke, interview or unplugged version.
 */
export function isStudioRecording(trackName: string, collectionName = ''): boolean {
  return ![trackName, collectionName].some((text) =>
    [...LIVE_PATTERNS, ...NON_STUDIO_PATTERNS].some((pattern) => pattern.test(text)),
  )
}

// ---------- Normalization ----------

/**
 * Maps a raw iTunes result to the app's Track model and enriches it with the band's
 * origin country/flag and style. Returns null for non-track results, for tracks without a
 * preview (every track in the Vault must be playable), for live or other non-studio versions,
 * and for compilation albums.
 */
export function normalizeTrack(raw: ITunesTrackRaw): Track | null {
  if (raw.wrapperType !== 'track' || !raw.previewUrl) return null
  if (!isStudioRecording(raw.trackName, raw.collectionName)) return null
  if (isCompilationAlbum(raw.collectionName)) return null

  const artistId = raw.artistId ?? null
  const { originCountry, subgenre } = getArtistMetadata(
    raw.artistName,
    raw.primaryGenreName,
    artistId,
  )

  return {
    id: raw.trackId,
    title: raw.trackName,
    artist: raw.artistName,
    artistId,
    album: raw.collectionName ?? 'Unknown album',
    genre: raw.primaryGenreName,
    subgenre,
    originCountry,
    originFlag: COUNTRY_FLAGS[originCountry],
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

// ---------- Catalog membership ----------

/**
 * iTunes primary genres that always belong in the Vault. Generic searches like "rock" also
 * match "Jingle Bell Rock" or country hits, so the live catalog keeps only these.
 * "Alternative" is deliberately absent: it mixes rock bands with pop acts (see isVaultTrack).
 */
export const ROCK_METAL_GENRES: ReadonlySet<string> = new Set([
  'Rock',
  'Hard Rock',
  'Metal',
  'Heavy Metal',
  'Hair Metal',
  'Death Metal/Black Metal',
  'Punk',
  'Hardcore',
  'Grunge',
  'Prog-Rock/Art Rock',
  'Arena Rock',
  'Glam Rock',
  'Blues-Rock',
  'Southern Rock',
  'Psychedelic',
  'Goth Rock',
])

/** True when a genre is on the rock/metal allowlist (exact, case-sensitive iTunes names). */
export function isRockOrMetalGenre(genre: string): boolean {
  return ROCK_METAL_GENRES.has(genre)
}

/**
 * Decides whether a live track belongs in the Vault: its genre is on the allowlist, or its
 * artist is a curated rock/metal band — whatever Apple files the album under. So Linkin Park's
 * "Alternative", Wardruna's "Worldwide" or Orphaned Land's "World" tracks stay, while
 * pop-leaning acts and namesakes of curated bands (matched by artist id) are left out.
 */
export function isVaultTrack(track: Pick<Track, 'genre' | 'artist' | 'artistId'>): boolean {
  return (
    isRockOrMetalGenre(track.genre) ||
    findArtistMetadata(track.artist, track.artistId, track.genre) !== null
  )
}

// ---------- Sonic Mood Capsules ----------

const EPIC_MIN_MS = 5 * 60 * 1000 // 5:00
const QUICK_MAX_MS = 3.5 * 60 * 1000 // 3:30
const MODERN_FROM_YEAR = 2010

export const MOOD_CAPSULES: readonly MoodCapsule[] = [
  { id: 'atmospheric-epic', label: 'Atmospheric & Epic', description: 'Tracks of 5 minutes or longer' },
  { id: 'modern-breakdown', label: 'Modern Breakdown', description: 'Metal and metalcore from 2010 onward' },
  { id: 'legends-70s-80s', label: '70s–80s Legends', description: 'Classics released 1970–1989' },
  { id: 'quick-riff-blitz', label: 'Quick Riff Blitz', description: 'Tracks under 3 minutes 30 seconds' },
]

/** True when a track fits a Sonic Mood Capsule. Tracks with an unknown year never match year-based moods. */
export function matchesMood(
  track: Pick<Track, 'durationMs' | 'releaseYear' | 'genre' | 'subgenre'>,
  mood: MoodId,
): boolean {
  const year = track.releaseYear
  switch (mood) {
    case 'atmospheric-epic':
      return track.durationMs >= EPIC_MIN_MS
    case 'modern-breakdown':
      return (
        year !== null &&
        year >= MODERN_FROM_YEAR &&
        (/metal/i.test(track.genre) || /metal|core/i.test(track.subgenre))
      )
    case 'legends-70s-80s':
      return year !== null && year >= 1970 && year <= 1989
    case 'quick-riff-blitz':
      return track.durationMs < QUICK_MAX_MS
  }
}

// ---------- Filtering & sorting ----------

/** The catalog's starting (and "Reset filters") state: everything shown, sorted by artist. */
export const DEFAULT_FILTERS: TrackFilters = {
  search: '',
  country: '',
  subgenre: '',
  artist: '',
  mood: null,
  sort: 'artist-asc',
}

/** True when any filter narrows the list (sort order alone doesn't count). */
export function hasActiveFilters(filters: TrackFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.country !== '' ||
    filters.subgenre !== '' ||
    filters.artist !== '' ||
    filters.mood !== null
  )
}

/**
 * Applies every catalog filter (combined with AND); empty values match everything:
 * - search: case-insensitive, trimmed, over title, artist, album, subgenre and origin country
 * - country / subgenre / artist: exact match
 * - mood: Sonic Mood Capsule rule (see matchesMood)
 */
export function filterTracks(tracks: Track[], filters: Omit<TrackFilters, 'sort'>): Track[] {
  const query = filters.search.trim().toLowerCase()

  return tracks.filter((track) => {
    const matchesSearch =
      query === '' ||
      [track.title, track.artist, track.album, track.subgenre, track.originCountry].some(
        (field) => field.toLowerCase().includes(query),
      )
    const matchesCountry = filters.country === '' || track.originCountry === filters.country
    const matchesSubgenre = filters.subgenre === '' || track.subgenre === filters.subgenre
    const matchesArtist = filters.artist === '' || track.artist === filters.artist
    const matchesMoodCapsule = filters.mood === null || matchesMood(track, filters.mood)
    return matchesSearch && matchesCountry && matchesSubgenre && matchesArtist && matchesMoodCapsule
  })
}

// One shared collator: `localeCompare(b, locale, options)` builds a new one on every call, which
// made sorting ~1,000 tracks the slowest part of returning to the catalog. Same ordering.
const textCollator = new Intl.Collator(undefined, { sensitivity: 'base' })
const compareText = (a: string, b: string): number => textCollator.compare(a, b)

const toTimestamp = (isoDate: string): number => {
  const time = Date.parse(isoDate)
  return Number.isNaN(time) ? 0 : time
}

const comparators: Record<Exclude<SortKey, 'vault-picks'>, (a: Track, b: Track) => number> = {
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
  if (sort === 'vault-picks') return rankVaultPicks(tracks)
  return [...tracks].sort(comparators[sort])
}

// ---------- Vault Picks (curated favorites — not a popularity chart) ----------

// Flagship bands: the headliner tier plus the deep tier (which adds Meshuggah).
const FLAGSHIP_ARTIST_KEYS: ReadonlySet<string> = new Set(
  [...HEADLINER_ARTISTS, ...DEEP_CATALOG_ARTISTS].map(normalizeArtistKey),
)

/** 0 = featured release · 1 = flagship band · 2 = everything else. */
export function getVaultPicksTier(track: Pick<Track, 'id' | 'artist' | 'album'>): 0 | 1 | 2 {
  if (isFeaturedTrack(track)) return 0
  return FLAGSHIP_ARTIST_KEYS.has(getLeadArtistKey(track.artist)) ? 1 : 2
}

const releaseTime = (track: Track): number => {
  const time = Date.parse(track.releaseDate)
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time // unknown dates last
}

/** Within one band: earliest release first, then title, then id. */
const compareWithinArtist = (a: Track, b: Track): number =>
  releaseTime(a) - releaseTime(b) || compareText(a.title, b.title) || a.id - b.id

/** Bands A–Z by lead-artist key (exact key as the final tie-breaker). */
const compareArtistKeys = (a: string, b: string): number =>
  compareText(a, b) || (a < b ? -1 : a > b ? 1 : 0)

/**
 * Vault Picks: an editorial ordering from curated metadata — never streams, sales or charts.
 * Tier 1 = featured releases (isFeaturedTrack), tier 2 = flagship bands (HEADLINER_ARTISTS +
 * DEEP_CATALOG_ARTISTS), tier 3 = everything else. Inside a tier the bands take turns (round
 * robin): round 1 shows each band's first track (bands A–Z), round 2 each band's second, and so
 * on — so the first results aren't one band in a row. Every input track appears exactly once, the
 * order depends only on track data (not on input or batch order), and the input isn't mutated.
 */
export function rankVaultPicks(tracks: readonly Track[]): Track[] {
  const tiers: Array<Map<string, Track[]>> = [new Map(), new Map(), new Map()]
  for (const track of tracks) {
    const byArtist = tiers[getVaultPicksTier(track)]
    if (!byArtist) continue
    const key = getLeadArtistKey(track.artist)
    const list = byArtist.get(key)
    if (list) list.push(track)
    else byArtist.set(key, [track])
  }

  const ranked: Track[] = []
  for (const byArtist of tiers) {
    const artists = [...byArtist.keys()].sort(compareArtistKeys)
    const queues = artists.map((key) => [...(byArtist.get(key) ?? [])].sort(compareWithinArtist))
    const rounds = Math.max(0, ...queues.map((queue) => queue.length))
    for (let round = 0; round < rounds; round += 1) {
      for (const queue of queues) {
        const track = queue[round]
        if (track) ranked.push(track)
      }
    }
  }
  return ranked
}

// ---------- Aggregates ----------

/** Total duration of a list of tracks in milliseconds (0 for an empty list). */
export function getTotalDuration(tracks: Track[]): number {
  return tracks.reduce((total, track) => total + track.durationMs, 0)
}

const uniqueSorted = <T extends string>(values: T[]): T[] => [...new Set(values)].sort(compareText)

/** Sorted, de-duplicated origin countries for the country filter ("Unknown" always last). */
export function getUniqueCountries(tracks: Track[]): OriginCountry[] {
  const countries = uniqueSorted(tracks.map((track) => track.originCountry))
  return [
    ...countries.filter((country) => country !== 'Unknown'),
    ...countries.filter((country) => country === 'Unknown'),
  ]
}

/** Sorted, de-duplicated styles for the Style/Subgenre filter. */
export function getUniqueSubgenres(tracks: Track[]): Subgenre[] {
  return uniqueSorted(tracks.map((track) => track.subgenre))
}

/** Sorted, de-duplicated artist names for the artist filter. */
export function getUniqueArtists(tracks: Track[]): string[] {
  return uniqueSorted(tracks.map((track) => track.artist))
}

// ---------- Track detail lookup ----------

/** What `/tracks/:id` shows: the track, or one of the loading / error / not-found states. */
export type TrackDetailState =
  | { kind: 'found'; track: Track }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'not-found' }

export interface TrackDetailSources {
  tracks: readonly Track[] // the catalog loaded so far
  setlist: readonly Track[] // saved tracks (full objects from localStorage)
  status: FetchStatus
  isCatalogComplete: boolean // false while later batch responses are still merging in
}

/**
 * Resolves the `:id` route param to what the detail page should show:
 * - a found track (catalog first, then the saved setlist, so saved tracks open while loading or offline);
 * - `loading` while the catalog loads — and, for a valid id, while later batches are still arriving,
 *   since the track may be in one of them;
 * - `error` when the catalog failed to load;
 * - `not-found` once loading has settled (or for an invalid id that isn't loading).
 * Only plain digit strings are valid iTunes track ids ("12abc", "-1", "" are not).
 */
export function resolveTrackDetail(
  id: string | undefined,
  { tracks, setlist, status, isCatalogComplete }: TrackDetailSources,
): TrackDetailState {
  const trackId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null
  const track =
    trackId === null
      ? undefined
      : (tracks.find((item) => item.id === trackId) ?? setlist.find((item) => item.id === trackId))

  if (track) return { kind: 'found', track }
  if (status === 'loading') return { kind: 'loading' }
  if (status === 'error') return { kind: 'error' }
  if (trackId !== null && !isCatalogComplete) return { kind: 'loading' }
  return { kind: 'not-found' }
}
