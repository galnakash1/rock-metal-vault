import { describe, expect, it } from 'vitest'
import type { Track } from '../types/track'
import { RELATED_TRACKS_LIMIT, getRelatedTracks, normalizeGenreKey } from './relatedTracks'

/** A fully-populated Track; override only what the test cares about. */
const makeTrack = (overrides: Partial<Track> & Pick<Track, 'id'>): Track => ({
  title: `Track ${overrides.id}`,
  artist: 'Some Band',
  artistId: null,
  album: 'Some Album',
  genre: 'Metal',
  subgenre: 'Metalcore',
  originCountry: 'Unknown',
  originFlag: '🌐',
  artworkUrl: 'https://example.com/100x100bb.jpg',
  artworkUrlLarge: 'https://example.com/600x600bb.jpg',
  previewUrl: 'https://example.com/preview.m4a',
  durationMs: 240_000,
  releaseDate: '2013-01-01T00:00:00Z',
  releaseYear: 2013,
  isExplicit: false,
  albumTrackCount: 10,
  storeUrl: null,
  ...overrides,
})

const ids = (tracks: readonly Track[]) => tracks.map((track) => track.id)

const current = makeTrack({ id: 1, artist: 'Bring Me The Horizon', subgenre: 'Metalcore', genre: 'Metal', releaseYear: 2013 })

describe('getRelatedTracks — "More Like This"', () => {
  it('recommends tracks with the exact same style, from other artists first', () => {
    const catalog = [
      current,
      makeTrack({ id: 2, artist: 'Architects', subgenre: 'Metalcore' }),
      makeTrack({ id: 3, artist: 'Parkway Drive', subgenre: 'Metalcore' }),
      makeTrack({ id: 4, artist: 'Bring Me The Horizon', subgenre: 'Metalcore' }), // same artist
      makeTrack({ id: 5, artist: 'Gojira', subgenre: 'Groove Metal', genre: 'Rock' }), // unrelated
    ]
    expect(ids(getRelatedTracks(current, catalog))).toEqual([2, 3, 4])
  })

  it('falls back to the same iTunes genre (different style) only after every exact-style match', () => {
    const catalog = [
      makeTrack({ id: 10, artist: 'Gojira', subgenre: 'Groove Metal', genre: 'Metal' }), // genre fallback
      makeTrack({ id: 11, artist: 'Architects', subgenre: 'Metalcore', genre: 'Rock' }), // exact style
      makeTrack({ id: 12, artist: 'AC/DC', subgenre: 'Hard Rock', genre: 'Rock' }), // unrelated
    ]
    expect(ids(getRelatedTracks(current, catalog))).toEqual([11, 10])
  })

  it('compares genres case- and whitespace-insensitively', () => {
    const catalog = [makeTrack({ id: 20, artist: 'Gojira', subgenre: 'Groove Metal', genre: '  METAL ' })]
    expect(ids(getRelatedTracks(current, catalog))).toEqual([20])
    expect(normalizeGenreKey('  Hard   Rock ')).toBe('hard rock')
    expect(normalizeGenreKey(undefined)).toBe('')
  })

  it('never matches tracks just because both style or genre values are missing', () => {
    const blank = makeTrack({ id: 30, subgenre: '' as Track['subgenre'], genre: '   ' })
    const catalog = [
      makeTrack({ id: 31, artist: 'Other', subgenre: '' as Track['subgenre'], genre: '' }),
      makeTrack({ id: 32, artist: 'Another', subgenre: 'Metalcore', genre: 'Metal' }),
    ]
    expect(getRelatedTracks(blank, catalog)).toEqual([])
    // A blank genre on the current track still allows exact-style matches.
    const styleOnly = makeTrack({ id: 33, subgenre: 'Metalcore', genre: '' })
    expect(ids(getRelatedTracks(styleOnly, [...catalog, makeTrack({ id: 34, artist: 'X', subgenre: 'Doom Metal', genre: '' })]))).toEqual([32])
  })

  it('never includes the current track or repeats an id', () => {
    const architects = makeTrack({ id: 40, artist: 'Architects' })
    const catalog = [current, architects, { ...current }, architects, makeTrack({ id: 41, artist: 'Spiritbox' })]
    const related = getRelatedTracks(current, catalog)
    expect(ids(related)).not.toContain(current.id)
    expect(new Set(ids(related)).size).toBe(related.length)
    expect(ids(related)).toEqual([40, 41])
  })

  it('ranks by release-year proximity, then title and id, independent of catalog order', () => {
    const catalog = [
      makeTrack({ id: 50, artist: 'A', title: 'Far', releaseYear: 1999 }),
      makeTrack({ id: 51, artist: 'B', title: 'Near', releaseYear: 2014 }),
      makeTrack({ id: 52, artist: 'C', title: 'Unknown year', releaseYear: null }),
      makeTrack({ id: 53, artist: 'D', title: 'Alpha', releaseYear: 2012 }), // same distance as 51 → title
      makeTrack({ id: 54, artist: 'E', title: 'Exact', releaseYear: 2013 }),
    ]
    const expected = [54, 53, 51, 50, 52]
    expect(ids(getRelatedTracks(current, catalog))).toEqual(expected)
    expect(ids(getRelatedTracks(current, [...catalog].reverse()))).toEqual(expected)
    // Stable across calls (no randomness).
    expect(ids(getRelatedTracks(current, catalog))).toEqual(ids(getRelatedTracks(current, catalog)))
  })

  it('shows one track per artist before a second track by the same artist', () => {
    const catalog = [
      makeTrack({ id: 60, artist: 'Architects', releaseYear: 2013 }),
      makeTrack({ id: 61, artist: 'Architects', releaseYear: 2013, title: 'Track 61b' }),
      makeTrack({ id: 62, artist: 'Architects & Guest', releaseYear: 2013 }), // same lead artist
      makeTrack({ id: 63, artist: 'Spiritbox', releaseYear: 2000 }),
    ]
    expect(ids(getRelatedTracks(current, catalog))).toEqual([60, 63, 61, 62])
  })

  it('caps the strip at 6 and fills it from the genre fallback only when needed', () => {
    const sameStyle = Array.from({ length: 8 }, (_, index) => makeTrack({ id: 100 + index, artist: `Core ${index}` }))
    const fallback = makeTrack({ id: 200, artist: 'Gojira', subgenre: 'Groove Metal' })
    expect(RELATED_TRACKS_LIMIT).toBe(6)
    const full = getRelatedTracks(current, [...sameStyle, fallback])
    expect(full).toHaveLength(6)
    expect(ids(full)).not.toContain(200)
  })

  it('returns fewer than 6 (or none) instead of padding with unrelated tracks', () => {
    const unrelated = [
      makeTrack({ id: 300, artist: 'AC/DC', subgenre: 'Hard Rock', genre: 'Rock' }),
      makeTrack({ id: 301, artist: 'Nirvana', subgenre: 'Grunge', genre: 'Alternative' }),
    ]
    expect(ids(getRelatedTracks(current, [...unrelated, makeTrack({ id: 302, artist: 'Architects' })]))).toEqual([302])
    expect(getRelatedTracks(current, unrelated)).toEqual([])
    expect(getRelatedTracks(current, [])).toEqual([])
    expect(getRelatedTracks(current, [current])).toEqual([])
    expect(getRelatedTracks(current, [makeTrack({ id: 303, artist: 'X' })], 0)).toEqual([])
  })

  it('updates when a later catalog batch adds matches', () => {
    const firstBatch = [makeTrack({ id: 400, artist: 'Gojira', subgenre: 'Groove Metal' })]
    const laterBatch = [...firstBatch, makeTrack({ id: 401, artist: 'Architects' })]
    expect(ids(getRelatedTracks(current, firstBatch))).toEqual([400])
    expect(ids(getRelatedTracks(current, laterBatch))).toEqual([401, 400])
  })
})
