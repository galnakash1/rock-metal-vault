// ---------- Raw iTunes Search API shapes ----------
// https://itunes.apple.com/search?term=metalcore&media=music&entity=song&limit=60

export type ITunesExplicitness = 'explicit' | 'notExplicit' | 'cleaned'

export interface ITunesTrackRaw {
  wrapperType: string // "track" for songs
  kind?: string // "song"
  trackId: number
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

// ---------- App model ----------

export interface Track {
  id: number // iTunes trackId — unique across the catalog
  title: string
  artist: string
  album: string
  genre: string
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
  search: string // free text; '' = no search
  genre: string // '' = all genres
  artist: string // '' = all artists
  sort: SortKey
}

// ---------- Async state ----------

export type FetchStatus = 'loading' | 'error' | 'success'
