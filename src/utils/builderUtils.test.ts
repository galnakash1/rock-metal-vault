import { describe, expect, it } from 'vitest'
import type { Track } from '../types/track'
import {
  DIAGNOSTIC_QUESTIONS,
  MAX_TRACKS_PER_ARTIST,
  PLAYLIST_SIZE,
  buildPlaylist,
  getMetalPersona,
  isDiagnosticComplete,
  rankTracksForProfile,
  scoreTrackForProfile,
  swapPlaylistTrack,
  type DiagnosticAnswers,
} from './builderUtils'
import { getLeadArtistKey } from './artistMetadata'

let nextId = 1
const makeTrack = (overrides: Partial<Track> = {}): Track => ({
  id: nextId++,
  title: 'Test Riff',
  artist: 'Test Band',
  artistId: null,
  album: 'Test Album',
  genre: 'Metal',
  subgenre: 'Heavy Metal',
  originCountry: 'Unknown',
  originFlag: '🌐',
  artworkUrl: 'https://example.com/100x100bb.jpg',
  artworkUrlLarge: 'https://example.com/600x600bb.jpg',
  previewUrl: 'https://example.com/preview.m4a',
  durationMs: 240_000,
  releaseDate: '2000-01-01T00:00:00Z',
  releaseYear: 2000,
  isExplicit: false,
  albumTrackCount: 10,
  storeUrl: null,
  ...overrides,
})

const BLACK_METAL_FAN: DiagnosticAnswers = {
  tempo: 'fast',
  era: 'nineties',
  mood: 'dark',
  scene: 'europe',
  depth: 'deep',
}

const ARENA_ROCKER: DiagnosticAnswers = {
  tempo: 'groove',
  era: 'vintage',
  mood: 'party',
  scene: 'anglo',
  depth: 'iconic',
}

const ids = (list: readonly Track[]) => list.map((track) => track.id)

/** A catalog of 30 bands × 2 tracks, plus a few perfect matches for each profile. */
const catalog: Track[] = [
  ...Array.from({ length: 30 }, (_, band) =>
    [1, 2].map((song) =>
      makeTrack({ artist: `Filler Band ${band}`, title: `Filler ${band}-${song}`, subgenre: 'Alternative Rock' }),
    ),
  ).flat(),
  ...[1, 2, 3].map((song) =>
    makeTrack({
      artist: 'Emperor',
      title: `Frost ${song}`,
      subgenre: 'Symphonic Black Metal',
      originCountry: 'Norway',
      releaseYear: 1997,
      durationMs: 220_000,
    }),
  ),
  makeTrack({ artist: 'Immortal', title: 'Blashyrkh', subgenre: 'Black Metal', originCountry: 'Norway', releaseYear: 1995 }),
  makeTrack({ artist: 'AC/DC', title: 'Highway to Hell', subgenre: 'Hard Rock', originCountry: 'Australia', releaseYear: 1979 }),
  makeTrack({ artist: "Guns N' Roses", title: 'Paradise City', subgenre: 'Hard Rock', originCountry: 'United States', releaseYear: 1987 }),
]

describe('Sonic Diagnostic questions', () => {
  it('asks 5 questions, each with 3–4 unique options', () => {
    expect(DIAGNOSTIC_QUESTIONS.map((question) => question.title)).toEqual([
      'Tempo & Energy',
      'Era & Guitar Tone',
      'Mood & Atmosphere',
      'Regional Scene',
      'Iconic vs. Deep Cuts',
    ])
    for (const question of DIAGNOSTIC_QUESTIONS) {
      expect(question.options.length).toBeGreaterThanOrEqual(3)
      expect(question.options.length).toBeLessThanOrEqual(4)
      expect(new Set(question.options.map((option) => option.id)).size).toBe(question.options.length)
    }
  })

  it('is complete only when every question has a valid answer', () => {
    expect(isDiagnosticComplete({})).toBe(false)
    expect(isDiagnosticComplete({ ...BLACK_METAL_FAN, depth: undefined })).toBe(false)
    expect(isDiagnosticComplete({ ...BLACK_METAL_FAN, mood: 'sleepy' })).toBe(false)
    expect(isDiagnosticComplete(BLACK_METAL_FAN)).toBe(true)
  })
})

describe('scoreTrackForProfile', () => {
  it('rewards tempo, era, mood, scene and depth matches', () => {
    const emperor = catalog.find((track) => track.artist === 'Emperor')
    const filler = catalog[0]
    if (!emperor || !filler) throw new Error('fixture missing')
    expect(scoreTrackForProfile(emperor, BLACK_METAL_FAN)).toBeGreaterThan(
      scoreTrackForProfile(filler, BLACK_METAL_FAN),
    )
  })

  it('favors flagship bands for "iconic" and penalizes them for "deep cuts"', () => {
    const acdc = makeTrack({ artist: 'AC/DC', subgenre: 'Hard Rock', originCountry: 'Australia' })
    const iconic = scoreTrackForProfile(acdc, { ...ARENA_ROCKER, depth: 'iconic' })
    const mixed = scoreTrackForProfile(acdc, { ...ARENA_ROCKER, depth: 'mixed' })
    const deep = scoreTrackForProfile(acdc, { ...ARENA_ROCKER, depth: 'deep' })
    expect(iconic).toBeGreaterThan(mixed)
    expect(mixed).toBeGreaterThan(deep)
  })

  it('places each era on the right side of the decade boundaries', () => {
    const at = (releaseYear: number) => makeTrack({ releaseYear })
    const era = (value: string) => ({ ...ARENA_ROCKER, era: value })
    expect(scoreTrackForProfile(at(1989), era('vintage'))).toBeGreaterThan(scoreTrackForProfile(at(1990), era('vintage')))
    expect(scoreTrackForProfile(at(2009), era('nineties'))).toBeGreaterThan(scoreTrackForProfile(at(2010), era('nineties')))
    expect(scoreTrackForProfile(at(2010), era('modern'))).toBeGreaterThan(scoreTrackForProfile(at(2009), era('modern')))
  })
})

describe('rankTracksForProfile', () => {
  it('puts the best matches first and is deterministic', () => {
    const ranked = rankTracksForProfile(catalog, BLACK_METAL_FAN)
    expect(ranked.slice(0, 4).map((track) => track.artist).sort()).toEqual(['Emperor', 'Emperor', 'Emperor', 'Immortal'])
    expect(ids(rankTracksForProfile(catalog, BLACK_METAL_FAN))).toEqual(ids(ranked))
    expect(ranked).toHaveLength(catalog.length)
  })

  it('keeps catalog order for ties and never mutates the input', () => {
    const snapshot = ids(catalog)
    const ranked = rankTracksForProfile(catalog, ARENA_ROCKER)
    const fillers = ranked.filter((track) => track.artist.startsWith('Filler'))
    expect(ids(fillers)).toEqual(ids(catalog.filter((track) => track.artist.startsWith('Filler'))))
    expect(ids(catalog)).toEqual(snapshot)
  })
})

describe('buildPlaylist', () => {
  it('serves 10 tracks with at most 2 per band', () => {
    const playlist = buildPlaylist(rankTracksForProfile(catalog, BLACK_METAL_FAN))
    expect(PLAYLIST_SIZE).toBe(10)
    expect(playlist).toHaveLength(10)
    expect(new Set(ids(playlist)).size).toBe(10)
    const perArtist = new Map<string, number>()
    for (const track of playlist) {
      const key = getLeadArtistKey(track.artist)
      perArtist.set(key, (perArtist.get(key) ?? 0) + 1)
    }
    expect(Math.max(...perArtist.values())).toBeLessThanOrEqual(MAX_TRACKS_PER_ARTIST)
    expect(playlist.filter((track) => track.artist === 'Emperor')).toHaveLength(2)
  })

  it('returns what it can from a small catalog', () => {
    expect(buildPlaylist(catalog.slice(0, 3))).toHaveLength(3)
    expect(buildPlaylist([])).toEqual([])
  })
})

describe('swapPlaylistTrack', () => {
  const ranked = rankTracksForProfile(catalog, BLACK_METAL_FAN)
  const playlist = buildPlaylist(ranked)

  it('replaces one slot with the next-best track not already in the playlist', () => {
    const swapped = swapPlaylistTrack(ranked, playlist, 3)
    expect(swapped).toHaveLength(10)
    expect(swapped[3]?.id).not.toBe(playlist[3]?.id)
    expect(new Set(ids(swapped)).size).toBe(10)
    // Every other slot stays put.
    swapped.forEach((track, index) => {
      if (index !== 3) expect(track.id).toBe(playlist[index]?.id)
    })
  })

  it('keeps the 2-per-band cap when swapping', () => {
    const emperorSlot = playlist.findIndex((track) => track.artist === 'Emperor')
    const swapped = swapPlaylistTrack(ranked, playlist, emperorSlot)
    // The 3rd Emperor song is allowed, since this slot's Emperor song leaves.
    expect(swapped.filter((track) => track.artist === 'Emperor').length).toBeLessThanOrEqual(2)
    const fillerSlot = playlist.findIndex((track) => track.artist.startsWith('Filler'))
    const swappedFiller = swapPlaylistTrack(ranked, playlist, fillerSlot)
    expect(swappedFiller.filter((track) => track.artist === 'Emperor')).toHaveLength(2)
  })

  it('walks further down the ranking on repeated swaps and leaves bad indexes alone', () => {
    const once = swapPlaylistTrack(ranked, playlist, 9)
    const twice = swapPlaylistTrack(ranked, once, 9)
    expect(new Set([playlist[9]?.id, once[9]?.id, twice[9]?.id]).size).toBe(3)
    expect(swapPlaylistTrack(ranked, playlist, 42)).toEqual(playlist)
  })

  it('keeps the playlist when nothing else fits', () => {
    const tiny = catalog.slice(0, 2)
    expect(swapPlaylistTrack(tiny, tiny, 0)).toEqual(tiny)
  })
})

describe('getMetalPersona', () => {
  it('names a persona from the mood and tempo answers', () => {
    expect(getMetalPersona(BLACK_METAL_FAN).title).toBe('Black Metal Frost Wraith')
    expect(getMetalPersona(ARENA_ROCKER).title).toBe('Arena Rock Road Warrior')
    expect(getMetalPersona({ mood: 'aggressive', tempo: 'fast' }).title).toBe('Circle-Pit Commander')
  })

  it('has a unique title and a tagline for every mood × tempo pair', () => {
    const mood = DIAGNOSTIC_QUESTIONS.find((question) => question.id === 'mood')?.options ?? []
    const tempo = DIAGNOSTIC_QUESTIONS.find((question) => question.id === 'tempo')?.options ?? []
    const personas = mood.flatMap((m) => tempo.map((t) => getMetalPersona({ mood: m.id, tempo: t.id })))
    expect(personas).toHaveLength(12)
    expect(new Set(personas.map((persona) => persona.title)).size).toBe(12)
    for (const persona of personas) expect(persona.tagline.length).toBeGreaterThan(10)
  })

  it('falls back for unknown answers', () => {
    expect(getMetalPersona({ mood: '?', tempo: '?' }).title).toBe('Riff Wanderer')
  })
})
