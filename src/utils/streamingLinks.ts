import type { Track } from '../types/track'

export type StreamingService = 'apple-music' | 'spotify' | 'youtube'

export interface StreamingLink {
  service: StreamingService
  label: string // "Apple Music"
  url: string
}

/** Drops edition noise like "(2015 Remaster)" or "[Deluxe Version]" so searches find the song. */
export function getSearchQuery(track: Pick<Track, 'artist' | 'title'>): string {
  const title = track.title
    .replace(/\s*[([][^)\]]*(?:remaster|version|edition|mix|mono|stereo)[^)\]]*[)\]]/gi, '')
    .trim()
  return `${track.artist} ${title}`.replace(/\s+/g, ' ').trim()
}

/**
 * Full-song links for a track (the iTunes API only provides 30-second previews):
 * Apple Music opens the exact track when Apple supplied its store URL, otherwise a search;
 * Spotify and YouTube open a search for "artist title".
 */
export function getStreamingLinks(track: Pick<Track, 'artist' | 'title' | 'storeUrl'>): StreamingLink[] {
  const query = encodeURIComponent(getSearchQuery(track))
  return [
    {
      service: 'apple-music',
      label: 'Apple Music',
      url: track.storeUrl ?? `https://music.apple.com/us/search?term=${query}`,
    },
    { service: 'spotify', label: 'Spotify', url: `https://open.spotify.com/search/${query}` },
    {
      service: 'youtube',
      label: 'YouTube',
      url: `https://www.youtube.com/results?search_query=${query}`,
    },
  ]
}
