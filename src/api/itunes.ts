import type { ITunesTrackRaw, Track } from '../types/track'
import { isRockOrMetalGenre, normalizeTracks, parseSearchResults } from '../utils/trackUtils'

const SEARCH_URL = 'https://itunes.apple.com/search'
const SEARCH_TERMS = ['rock', 'metal', 'metalcore'] as const
const RESULTS_PER_TERM = 50

function buildSearchUrl(term: string): string {
  const params = new URLSearchParams({
    term,
    media: 'music',
    entity: 'song',
    limit: String(RESULTS_PER_TERM),
  })
  return `${SEARCH_URL}?${params}`
}

async function searchSongs(term: string, signal?: AbortSignal): Promise<ITunesTrackRaw[]> {
  let response: Response
  try {
    response = await fetch(buildSearchUrl(term), { signal })
  } catch (error) {
    // Let aborts propagate untouched so callers can recognise and ignore them.
    if (signal?.aborted) throw error
    throw new Error("Couldn't reach the iTunes API. Check your connection and try again.", {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new Error(`The iTunes API responded with an error (HTTP ${response.status}).`)
  }

  const data: unknown = await response.json()
  return parseSearchResults(data)
}

/**
 * Loads the Vault catalog: searches rock, metal and metalcore in parallel, then
 * normalizes, de-duplicates by trackId and keeps only rock/metal-family genres.
 */
export async function fetchCatalog(signal?: AbortSignal): Promise<Track[]> {
  const resultsByTerm = await Promise.all(SEARCH_TERMS.map((term) => searchSongs(term, signal)))
  return normalizeTracks(resultsByTerm.flat()).filter((track) => isRockOrMetalGenre(track.genre))
}
