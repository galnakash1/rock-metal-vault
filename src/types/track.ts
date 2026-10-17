// ---------- Raw iTunes Search API shapes ----------
// https://itunes.apple.com/search?term=metalcore&media=music&entity=song&limit=60

export type ITunesExplicitness = 'explicit' | 'notExplicit' | 'cleaned'

export interface ITunesTrackRaw {
  wrapperType: string // "track" for songs
  kind?: string // "song"
  trackId: number
  artistId?: number // Apple's artist id — tells namesakes apart (e.g. two bands called "Ghost")
  trackName: string
  artistName: string
  collectionName?: string
  artworkUrl100: string
  previewUrl?: string
  trackTimeMillis?: number
  primaryGenreName: string
  releaseDate: string // ISO 8601
  trackExplicitness: ITunesExplicitness
  trackCount?: number // number of tracks on the album
  trackNumber?: number
  trackViewUrl?: string
}

export interface ITunesSearchResponse {
  resultCount: number
  results: ITunesTrackRaw[]
}

// ---------- Band origin & style enrichment ----------
// iTunes only knows the storefront country, so origin and style come from our own artist map.

export type OriginCountry =
  | 'United States'
  | 'United Kingdom'
  | 'Sweden'
  | 'Germany'
  | 'Australia'
  | 'France'
  | 'Canada'
  | 'Finland'
  | 'Norway'
  | 'Denmark'
  | 'Iceland'
  | 'Israel'
  | 'Netherlands'
  | 'Switzerland'
  | 'Poland'
  | 'Ukraine'
  | 'Greece'
  | 'Brazil'
  | 'Japan'
  | 'Unknown' // artist isn't in the curated map

export type Subgenre =
  | 'Metalcore'
  | 'Post-Hardcore'
  | 'Heavy Metal'
  | 'Thrash Metal'
  | 'Groove Metal'
  | 'Alternative Metal'
  | 'Nu Metal'
  | 'Rap Metal'
  | 'Industrial Metal'
  | 'Progressive Metal'
  | 'Melodic Death Metal'
  | 'Power Metal'
  | 'Symphonic Metal'
  | 'Symphonic Death Metal'
  | 'Black Metal'
  | 'Symphonic Black Metal'
  | 'Progressive Black Metal'
  | 'Blackened Death Metal'
  | "Black 'n' Roll"
  | 'Doom Metal'
  | 'Post-Metal'
  | 'Djent / Extreme Metal'
  | 'Folk Metal'
  | 'Oriental / Folk Metal'
  | 'Nordic Folk'
  | 'Kawaii Metal'
  | 'Hard Rock'
  | 'Blues Rock'
  | 'Classic Rock'
  | 'Progressive Rock'
  | 'Alternative Rock'
  | 'Stoner Rock'
  | 'Funk Rock'
  | 'Gothic Rock'
  | 'Grunge'
  | 'Post-Grunge'
  | 'Punk Rock'
  | 'Emo'
  | 'Rock' // generic fallback

export interface ArtistMetadata {
  originCountry: OriginCountry
  subgenre: Subgenre
}

// ---------- App model ----------

export interface Track {
  id: number // iTunes trackId — unique across the catalog
  title: string
  artist: string
  artistId: number | null // Apple's artist id (null for tracks saved before it was tracked)
  album: string
  genre: string // iTunes primaryGenreName, e.g. "Metal"
  subgenre: Subgenre // enriched style, e.g. "Thrash Metal"
  originCountry: OriginCountry // where the band was formed, not the storefront
  originFlag: string // emoji flag for originCountry
  artworkUrl: string // original 100x100
  artworkUrlLarge: string // upgraded 600x600
  previewUrl: string
  durationMs: number
  releaseDate: string // ISO 8601
  releaseYear: number | null // null when the date can't be parsed
  isExplicit: boolean
  albumTrackCount: number | null // null when the API omits it
  storeUrl: string | null
}

// ---------- Sonic Mood Capsules ----------

export type MoodId =
  | 'atmospheric-epic' // duration >= 5:00
  | 'modern-breakdown' // released 2010+ AND metal/metalcore
  | 'legends-70s-80s' // released 1970–1989
  | 'quick-riff-blitz' // duration < 3:30

export interface MoodCapsule {
  id: MoodId
  label: string // e.g. "Atmospheric & Epic"
  description: string // tooltip / screen-reader hint
}

// ---------- Filtering & sorting ----------

export type SortKey =
  | 'title-asc'
  | 'title-desc'
  | 'artist-asc'
  | 'year-newest'
  | 'year-oldest'
  | 'duration-shortest'
  | 'duration-longest'

export interface TrackFilters {
  search: string // free text over title/artist/album/subgenre/country; '' = no search
  country: OriginCountry | '' // '' = all countries
  subgenre: Subgenre | '' // '' = all styles
  artist: string // '' = all artists
  mood: MoodId | null // null = no mood capsule
  sort: SortKey
}

// ---------- Async state ----------

export type FetchStatus = 'loading' | 'error' | 'success'

// ---------- Festival Lineup & Poster ----------

export type PosterTheme = 'foggy-woodland' | 'blood-moon' | 'vintage-tour'

export interface PosterThemeOption {
  id: PosterTheme
  label: string // e.g. "Blood Moon"
  description: string
}

/** One band on the poster: every saved track by that artist. */
export interface LineupAct {
  artist: string
  originCountry: OriginCountry
  originFlag: string
  subgenre: Subgenre
  tracks: Track[]
  runtimeMs: number
}

export interface FestivalLineup {
  headliners: LineupAct[] // top tier, large type
  underbill: LineupAct[] // Main Stage / supporting tier
  trackCount: number
  artistCount: number
  totalRuntimeMs: number
}
