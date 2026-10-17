import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import type { ITunesTrackRaw, Subgenre, Track, TrackFilters } from '../types/track'
import { getArtistMetadata } from './artistMetadata'
import { GUITAR_STRINGS, RIFF_PROFILES, SUBGENRE_RIFF_FAMILIES, getTrackRiffTab, renderTab } from './riffTabs'
import {
  MOOD_CAPSULES,
  dedupeTracks,
  filterTracks,
  formatDuration,
  getReleaseYear,
  getTotalDuration,
  getUniqueCountries,
  getUniqueSubgenres,
  isVaultTrack,
  matchesMood,
  normalizeTrack,
  normalizeTracks,
  parseSearchResults,
  sortTracks,
  upgradeArtworkUrl,
} from './trackUtils'

// ---------- Fixtures ----------

// The fixture goes through the same runtime validation as live API responses (no type cast).
const rawTracks: ITunesTrackRaw[] = parseSearchResults(mockData)
const tracks: Track[] = normalizeTracks(rawTracks)

const byTitle = (title: string): Track => {
  const track = tracks.find((item) => item.title === title)
  if (!track) throw new Error(`Fixture track "${title}" is missing`)
  return track
}

const rawByName = (trackName: string): ITunesTrackRaw => {
  const raw = rawTracks.find((item) => item.trackName === trackName)
  if (!raw) throw new Error(`Fixture raw track "${trackName}" is missing`)
  return raw
}

const titles = (list: Track[]): string[] => list.map((track) => track.title)

const NO_FILTERS: Omit<TrackFilters, 'sort'> = {
  search: '',
  country: '',
  subgenre: '',
  artist: '',
  mood: null,
}

/** A fully-populated Track for edge cases; override only what the test cares about. */
const makeTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 1,
  title: 'Test Riff',
  artist: 'Test Band',
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

// ---------- Formatting ----------

describe('formatDuration', () => {
  it('formats milliseconds as zero-padded mm:ss, rounding down to whole seconds', () => {
    expect(formatDuration(245_000)).toBe('04:05')
    expect(formatDuration(515_387)).toBe('08:35') // Master of Puppets
    expect(formatDuration(59_999)).toBe('00:59')
    expect(formatDuration(0)).toBe('00:00')
  })

  it('switches to h:mm:ss for durations of an hour or more', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })

  it('returns "00:00" for missing, negative or non-finite input', () => {
    expect(formatDuration(undefined)).toBe('00:00')
    expect(formatDuration(-5_000)).toBe('00:00')
    expect(formatDuration(Number.NaN)).toBe('00:00')
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('00:00')
  })
})

describe('getTotalDuration (setlist runtime)', () => {
  it('sums every track and formats the festival total', () => {
    expect(getTotalDuration(tracks)).toBe(2_641_634)
    expect(formatDuration(getTotalDuration(tracks))).toBe('44:01')
  })

  it('returns 0 for an empty setlist', () => {
    expect(getTotalDuration([])).toBe(0)
  })
})

describe('upgradeArtworkUrl', () => {
  it('upgrades a real iTunes 100x100bb URL to 600x600bb', () => {
    const original = rawByName('Paranoid').artworkUrl100
    expect(original).toMatch(/\/100x100bb\.jpg$/)

    const upgraded = upgradeArtworkUrl(original)
    expect(upgraded).toMatch(/\/600x600bb\.jpg$/)
    expect(upgraded.replace('600x600bb', '100x100bb')).toBe(original)
  })

  it('supports custom sizes and leaves non-matching URLs unchanged', () => {
    expect(upgradeArtworkUrl('https://x.test/a/100x100bb.png', 1200)).toBe(
      'https://x.test/a/1200x1200bb.png',
    )
    expect(upgradeArtworkUrl('https://x.test/cover.jpg')).toBe('https://x.test/cover.jpg')
    expect(upgradeArtworkUrl('')).toBe('')
  })
})

describe('getReleaseYear', () => {
  it('reads the UTC year so time zones never shift it, and returns null for bad dates', () => {
    expect(getReleaseYear('1970-01-01T00:00:00Z')).toBe(1970)
    expect(getReleaseYear('1986-03-03T08:00:00Z')).toBe(1986)
    expect(getReleaseYear('not-a-date')).toBeNull()
  })
})

// ---------- Validation, normalization & deduplication ----------

describe('parseSearchResults', () => {
  it('throws when the body is not shaped like { results: [...] }', () => {
    expect(() => parseSearchResults(null)).toThrow()
    expect(() => parseSearchResults({})).toThrow()
    expect(() => parseSearchResults({ results: 'nope' })).toThrow()
  })

  it('keeps well-formed results and drops malformed ones', () => {
    const valid = rawByName('Paranoid')
    const results = parseSearchResults({
      resultCount: 3,
      results: [valid, { ...valid, trackId: '42' }, { ...valid, trackExplicitness: 'spicy' }],
    })
    expect(results).toEqual([valid])
  })
})

describe('normalizeTrack', () => {
  it('maps a raw iTunes result to the Track model', () => {
    const track = normalizeTrack(rawByName('Master of Puppets'))
    expect(track).toMatchObject({
      id: 1275600554,
      title: 'Master of Puppets',
      artist: 'Metallica',
      album: 'Master of Puppets (Remastered)',
      genre: 'Metal',
      durationMs: 515_387,
      releaseYear: 1986,
      isExplicit: false,
      albumTrackCount: 8,
    })
    expect(track?.artworkUrlLarge).toMatch(/600x600bb\.jpg$/)
  })

  it('returns null for non-tracks and tracks without a preview, and fills safe defaults', () => {
    const raw = rawByName('Doomsday')
    expect(normalizeTrack({ ...raw, previewUrl: undefined })).toBeNull()
    expect(normalizeTrack({ ...raw, wrapperType: 'collection' })).toBeNull()

    const sparse = normalizeTrack({ ...raw, collectionName: undefined, trackTimeMillis: undefined })
    expect(sparse?.album).toBe('Unknown album')
    expect(sparse?.durationMs).toBe(0)
  })
})

describe('normalizeTracks & dedupeTracks', () => {
  it('normalizes the 10-track fixture with strictly unique ids', () => {
    expect(tracks).toHaveLength(10)
    expect(new Set(tracks.map((track) => track.id)).size).toBe(10)
  })

  it('removes duplicate trackIds from merged queries and drops unplayable entries', () => {
    const merged = [...rawTracks, rawTracks[0], { ...rawTracks[1], previewUrl: undefined }]
    const result = normalizeTracks(merged)
    expect(result).toHaveLength(10)
    expect(new Set(result.map((track) => track.id)).size).toBe(result.length)
  })

  it('keeps the first occurrence of a duplicated id', () => {
    const original = byTitle('Paranoid')
    const result = dedupeTracks([original, { ...original, title: 'Paranoid (Live)' }])
    expect(titles(result)).toEqual(['Paranoid'])
  })
})

// ---------- Band origin & subgenre enrichment ----------

describe('band origin & subgenre enrichment', () => {
  it('adds origin country, flag and style during normalization', () => {
    expect(byTitle('Master of Puppets')).toMatchObject({
      originCountry: 'United States',
      originFlag: '🇺🇸',
      subgenre: 'Thrash Metal',
    })
    expect(byTitle('Doomsday')).toMatchObject({
      originCountry: 'United Kingdom',
      originFlag: '🇬🇧',
      subgenre: 'Metalcore',
    })
    expect(byTitle('Back In Black')).toMatchObject({
      originCountry: 'Australia',
      originFlag: '🇦🇺',
      subgenre: 'Hard Rock',
    })
  })

  it('matches artist names regardless of case, quotes, qualifiers and collaborations', () => {
    expect(getArtistMetadata('LINKIN PARK', 'Alternative').subgenre).toBe('Nu Metal')
    expect(getArtistMetadata('Guns N’ Roses', 'Rock').originCountry).toBe('United States')
    expect(getArtistMetadata('Attack Attack! (US)', 'Rock')).toEqual({
      originCountry: 'United States',
      subgenre: 'Metalcore',
    })
    expect(getArtistMetadata("Bad Omens, Let's Eat Grandma & Chief", 'Soundtrack').subgenre).toBe(
      'Metalcore',
    )
  })

  it('falls back deterministically for unlisted artists without guessing a country', () => {
    expect(getArtistMetadata('Garage Band Nobody Knows', 'Metal')).toEqual({
      originCountry: 'Unknown',
      subgenre: 'Heavy Metal',
    })
    expect(getArtistMetadata('Garage Band Nobody Knows', 'Pop').subgenre).toBe('Rock')

    const unknown = normalizeTrack({ ...rawByName('Paranoid'), artistName: 'Garage Band Nobody Knows' })
    expect(unknown?.originFlag).toBe('🌐')
  })
})

describe('isVaultTrack (genre allowlist)', () => {
  it('keeps allowlisted genres and curated bands, and drops pop-leaning "Alternative" acts', () => {
    expect(isVaultTrack({ genre: 'Metal', artist: 'Unlisted Band' })).toBe(true)
    expect(isVaultTrack({ genre: 'Alternative', artist: 'LINKIN PARK' })).toBe(true)
    expect(isVaultTrack({ genre: 'Pop', artist: 'Procol Harum' })).toBe(true)
    expect(isVaultTrack({ genre: 'Alternative', artist: 'twenty one pilots' })).toBe(false)
    expect(isVaultTrack({ genre: 'Holiday', artist: 'Bobby Helms' })).toBe(false)
  })
})

// ---------- Filtering ----------

describe('filterTracks', () => {
  it('returns every track when no filter is set', () => {
    expect(filterTracks(tracks, NO_FILTERS)).toHaveLength(tracks.length)
  })

  it('searches title, artist, album, subgenre and origin country (trimmed, case-insensitive)', () => {
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, search: '  IRON maiden ' }))).toEqual([
      'The Trooper (2015 Remaster)',
    ])
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, search: 'puppets' }))).toEqual([
      'Master of Puppets',
    ])
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, search: 'thrash' }))).toEqual([
      'Master of Puppets',
    ])
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, search: 'australia' }))).toEqual([
      'Back In Black',
    ])
    expect(filterTracks(tracks, { ...NO_FILTERS, search: 'polka' })).toEqual([])
  })

  it('filters by origin country, style/subgenre and artist', () => {
    expect(filterTracks(tracks, { ...NO_FILTERS, country: 'United Kingdom' })).toHaveLength(5)
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, country: 'Australia' }))).toEqual([
      'Back In Black',
    ])
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, subgenre: 'Metalcore' }))).toEqual([
      'Just Pretend',
      'Doomsday',
      'Throne',
      'In Waves',
    ])
    expect(titles(filterTracks(tracks, { ...NO_FILTERS, artist: 'Black Sabbath' }))).toEqual([
      'Paranoid',
    ])
  })

  it('combines every filter with AND', () => {
    const ukMetalcore = { ...NO_FILTERS, country: 'United Kingdom', subgenre: 'Metalcore' } as const
    expect(titles(filterTracks(tracks, ukMetalcore))).toEqual(['Doomsday', 'Throne'])
    expect(titles(filterTracks(tracks, { ...ukMetalcore, mood: 'quick-riff-blitz' }))).toEqual([
      'Throne',
    ])
    expect(filterTracks(tracks, { ...ukMetalcore, search: 'metallica' })).toEqual([])
  })
})

describe('Sonic Mood Capsules', () => {
  const moodTitles = (mood: (typeof MOOD_CAPSULES)[number]['id']): string[] =>
    titles(filterTracks(tracks, { ...NO_FILTERS, mood }))

  it('defines the four capsules in display order', () => {
    expect(MOOD_CAPSULES.map((capsule) => capsule.label)).toEqual([
      'Atmospheric & Epic',
      'Modern Breakdown',
      '70s–80s Legends',
      'Quick Riff Blitz',
    ])
  })

  it('Atmospheric & Epic keeps tracks of 5:00 or longer', () => {
    expect(moodTitles('atmospheric-epic')).toEqual(['In Waves', 'Master of Puppets'])
    expect(matchesMood(makeTrack({ durationMs: 300_000 }), 'atmospheric-epic')).toBe(true)
    expect(matchesMood(makeTrack({ durationMs: 299_999 }), 'atmospheric-epic')).toBe(false)
  })

  it('Modern Breakdown keeps 2010+ metal and metalcore (by iTunes genre or enriched style)', () => {
    // Throne is "Hard Rock" on iTunes but enriched as Metalcore; Duality (2004) is too old.
    expect(moodTitles('modern-breakdown')).toEqual(['Just Pretend', 'Doomsday', 'Throne', 'In Waves'])
    expect(matchesMood(makeTrack({ releaseYear: 2010 }), 'modern-breakdown')).toBe(true)
    expect(matchesMood(makeTrack({ releaseYear: 2009 }), 'modern-breakdown')).toBe(false)
    const hardRock = { genre: 'Hard Rock', subgenre: 'Hard Rock' as Subgenre, releaseYear: 2015 }
    expect(matchesMood(makeTrack(hardRock), 'modern-breakdown')).toBe(false)
    expect(matchesMood(makeTrack({ releaseYear: null }), 'modern-breakdown')).toBe(false)
  })

  it('70s–80s Legends keeps releases from 1970 to 1989 inclusive', () => {
    expect(moodTitles('legends-70s-80s')).toEqual([
      'Master of Puppets',
      'The Trooper (2015 Remaster)',
      'Paranoid',
      'Back In Black',
    ])
    expect(matchesMood(makeTrack({ releaseYear: 1969 }), 'legends-70s-80s')).toBe(false)
    expect(matchesMood(makeTrack({ releaseYear: 1970 }), 'legends-70s-80s')).toBe(true)
    expect(matchesMood(makeTrack({ releaseYear: 1989 }), 'legends-70s-80s')).toBe(true)
    expect(matchesMood(makeTrack({ releaseYear: 1990 }), 'legends-70s-80s')).toBe(false)
  })

  it('Quick Riff Blitz keeps tracks shorter than 3:30', () => {
    expect(moodTitles('quick-riff-blitz')).toEqual(['Just Pretend', 'Throne', 'Paranoid'])
    expect(matchesMood(makeTrack({ durationMs: 209_999 }), 'quick-riff-blitz')).toBe(true)
    expect(matchesMood(makeTrack({ durationMs: 210_000 }), 'quick-riff-blitz')).toBe(false)
  })
})

describe('filter option helpers', () => {
  it('lists unique origin countries alphabetically with "Unknown" last', () => {
    expect(getUniqueCountries(tracks)).toEqual(['Australia', 'United Kingdom', 'United States'])
    const withUnknown = [makeTrack({ originCountry: 'Unknown' }), ...tracks]
    expect(getUniqueCountries(withUnknown).at(-1)).toBe('Unknown')
  })

  it('lists unique styles alphabetically', () => {
    expect(getUniqueSubgenres(tracks)).toEqual([
      'Hard Rock',
      'Heavy Metal',
      'Metalcore',
      'Nu Metal',
      'Progressive Rock',
      'Thrash Metal',
    ])
  })
})

// ---------- Sorting ----------

describe('sortTracks', () => {
  it('orders by duration and release date', () => {
    expect(titles(sortTracks(tracks, 'duration-longest')).slice(0, 2)).toEqual([
      'Master of Puppets',
      'In Waves',
    ])
    expect(sortTracks(tracks, 'duration-shortest')[0]?.title).toBe('Paranoid')
    expect(sortTracks(tracks, 'year-oldest')[0]?.artist).toBe('Procol Harum')
    expect(sortTracks(tracks, 'year-newest')[0]?.title).toBe('Just Pretend')
  })

  it('orders text case-insensitively and never mutates the input', () => {
    const before = titles(tracks)
    const sorted = sortTracks(tracks, 'title-asc')
    expect(sorted[0]?.title).toMatch(/^A Whiter Shade of Pale/)
    expect(sorted.at(-1)?.title).toBe('Throne')
    expect(sortTracks(tracks, 'title-desc')[0]?.title).toBe('Throne')
    expect(sortTracks(tracks, 'artist-asc')[0]?.artist).toBe('AC/DC')
    expect(titles(tracks)).toEqual(before)
    expect(sorted).not.toBe(tracks)
  })
})

// ---------- 6-string Guitar Riff Tab ----------

describe('getTrackRiffTab', () => {
  const expectWellFormed = (lines: Record<string, string>): void => {
    expect(Object.keys(lines)).toEqual([...GUITAR_STRINGS])
    const lengths = new Set(Object.values(lines).map((line) => line.length))
    expect(lengths.size).toBe(1)
    for (const line of Object.values(lines)) expect(line).toMatch(/^\|-[-\d]+\|$/)
  }

  it('resolves tuning, tempo and difficulty from the track style', () => {
    const metalcore = getTrackRiffTab(byTitle('Just Pretend'))
    expect(metalcore).toMatchObject({
      title: 'Metalcore practice riff',
      family: 'metalcore',
      tuning: 'Drop C (C G C F A D)',
      difficulty: 'Intermediate',
    })
    expect(metalcore.bpm).toBeGreaterThanOrEqual(140)
    expect(metalcore.bpm).toBeLessThanOrEqual(180)

    expect(getTrackRiffTab(byTitle('Master of Puppets'))).toMatchObject({
      tuning: 'E Standard (E A D G B E)',
      difficulty: 'Advanced',
    })
    expect(getTrackRiffTab(byTitle('Duality')).tuning).toBe('Drop B (B F# B E G# C#)')
  })

  it('returns six aligned string lines (e B G D A E) with playable notes', () => {
    const tab = getTrackRiffTab(byTitle('The Trooper (2015 Remaster)'))
    expectWellFormed(tab.lines)
    expect(tab.lines.E).toMatch(/\d/)
  })

  it('is deterministic per track and varies the riff between tracks', () => {
    const track = byTitle('Doomsday')
    expect(getTrackRiffTab(track)).toEqual(getTrackRiffTab(track))
    const even = getTrackRiffTab({ id: 2, subgenre: 'Metalcore' })
    const odd = getTrackRiffTab({ id: 3, subgenre: 'Metalcore' })
    expect(even.lines).not.toEqual(odd.lines)
  })

  it('produces a well-formed tab for every style and template', () => {
    const subgenres = Object.keys(SUBGENRE_RIFF_FAMILIES) as Subgenre[]
    for (const subgenre of subgenres) {
      for (const id of [0, 1, 2, 3]) expectWellFormed(getTrackRiffTab({ id, subgenre }).lines)
    }
    for (const profile of Object.values(RIFF_PROFILES)) {
      for (const template of profile.templates) expectWellFormed(renderTab(template))
    }
  })

  it('keeps columns aligned when frets have two digits', () => {
    expect(renderTab([{ E: 10 }, { E: 0, A: 2 }])).toMatchObject({
      E: '|-10-0-|',
      A: '|----2-|',
      e: '|------|',
    })
  })
})
