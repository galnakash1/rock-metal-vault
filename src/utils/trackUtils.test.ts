import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import type { ITunesTrackRaw, Subgenre, Track, TrackFilters } from '../types/track'
import { ARTIST_ENTRIES, COUNTRY_FLAGS, SPOTLIGHT_ARTIST_IDS, getArtistMetadata, normalizeArtistKey } from './artistMetadata'
import {
  GUITAR_STRINGS,
  RIFF_PROFILES,
  SIGNATURE_RIFFS,
  SUBGENRE_RIFF_FAMILIES,
  getRiffPlayheadIndex,
  getTabColumns,
  getTrackRiffTab,
  normalizeTitleKey,
  renderTab,
} from './riffTabs'
import {
  DEFAULT_FILTERS,
  MOOD_CAPSULES,
  dedupeTracks,
  filterTracks,
  formatDuration,
  getReleaseYear,
  getTotalDuration,
  getUniqueCountries,
  getUniqueSubgenres,
  hasActiveFilters,
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
  const vault = (genre: string, artist: string, artistId: number | null = null): boolean =>
    isVaultTrack({ genre, artist, artistId })

  it('keeps allowlisted genres and curated bands, and drops pop-leaning "Alternative" acts', () => {
    expect(vault('Metal', 'Unlisted Band')).toBe(true)
    expect(vault('Alternative', 'LINKIN PARK')).toBe(true)
    expect(vault('Pop', 'Procol Harum')).toBe(true)
    expect(vault('Alternative', 'twenty one pilots')).toBe(false)
    expect(vault('Holiday', 'Bobby Helms')).toBe(false)
  })

  it('always keeps curated bands whatever Apple files the album under', () => {
    expect(vault('World', 'Orphaned Land', 18243552)).toBe(true)
    expect(vault('Worldwide', 'Wardruna', 299406921)).toBe(true)
    expect(vault('Singer/Songwriter', 'KALEO', 960112019)).toBe(true)
    expect(vault('Electronic', 'Electric Callboy', 387883325)).toBe(true)
  })

  it('drops off-genre namesakes of curated bands (different Apple artist id)', () => {
    expect(vault('Hip-Hop/Rap', 'Ghost', 1437662124)).toBe(false)
    expect(vault('Electronic', 'Avatar', 1606749621)).toBe(false)
    expect(vault('Metal', 'Ghost', 600730426)).toBe(true)
  })

  it('still matches a curated band under a second Apple id when the genre is rock/metal', () => {
    expect(getArtistMetadata('Within Temptation', 'Hard Rock', 1730759079).originCountry).toBe(
      'Netherlands',
    )
  })
})

describe('international band enrichment', () => {
  it('tags Israeli bands with Israel 🇮🇱 and their style', () => {
    expect(getArtistMetadata('Orphaned Land', 'World')).toEqual({
      originCountry: 'Israel',
      subgenre: 'Oriental / Folk Metal',
    })
    expect(getArtistMetadata('Walkways', 'Metal').subgenre).toBe('Metalcore')
    expect(getArtistMetadata('Scardust', 'Rock').subgenre).toBe('Progressive Metal')
    expect(getArtistMetadata('Melechesh', 'Metal').subgenre).toBe('Black Metal')
    expect(COUNTRY_FLAGS.Israel).toBe('🇮🇱')
  })

  it('tags Scandinavian and Nordic bands by country and style', () => {
    expect(getArtistMetadata('Opeth', 'Metal')).toEqual({ originCountry: 'Sweden', subgenre: 'Progressive Metal' })
    expect(getArtistMetadata('Meshuggah', 'Metal').subgenre).toBe('Djent / Extreme Metal')
    expect(getArtistMetadata('Nightwish', 'Hard Rock')).toEqual({ originCountry: 'Finland', subgenre: 'Symphonic Metal' })
    expect(getArtistMetadata('Korpiklaani', 'Metal').subgenre).toBe('Folk Metal')
    expect(getArtistMetadata('Dimmu Borgir', 'Metal')).toEqual({ originCountry: 'Norway', subgenre: 'Symphonic Black Metal' })
    expect(getArtistMetadata('Kvelertak', 'Hard Rock').subgenre).toBe("Black 'n' Roll")
    expect(getArtistMetadata('Myrkur', 'Metal').originCountry).toBe('Denmark')
    expect(getArtistMetadata('Sólstafir', 'Metal')).toEqual({ originCountry: 'Iceland', subgenre: 'Post-Metal' })
  })

  it('covers the wider global scene', () => {
    const origin = (artist: string) => getArtistMetadata(artist, 'Metal').originCountry
    expect(origin('Jinjer')).toBe('Ukraine')
    expect(origin('Behemoth')).toBe('Poland')
    expect(origin('Epica')).toBe('Netherlands')
    expect(origin('Eluveitie')).toBe('Switzerland')
    expect(origin('Septicflesh')).toBe('Greece')
    expect(origin('Sepultura')).toBe('Brazil')
    expect(getArtistMetadata('BABYMETAL', 'Metal')).toEqual({ originCountry: 'Japan', subgenre: 'Kawaii Metal' })
    expect(getArtistMetadata('GOJIRA', 'Metal')).toEqual({ originCountry: 'France', subgenre: 'Groove Metal' })
  })

  it('matches by Apple artist id first, then by accent-insensitive name', () => {
    // Apple credits Sólstafir's songs as "Solstafir", and BABYMETAL's as collaborations.
    expect(getArtistMetadata('Solstafir', 'Metal').originCountry).toBe('Iceland')
    expect(getArtistMetadata('BABYMETAL & Electric Callboy', 'Metal', 477101776)).toEqual({
      originCountry: 'Japan',
      subgenre: 'Kawaii Metal',
    })
    expect(normalizeArtistKey('Motörhead')).toBe('motorhead')
  })

  it('enriches a normalized track by artist id and rejects a namesake', () => {
    const raw = rawByName('Paranoid')
    const opeth = normalizeTrack({ ...raw, artistName: 'Opeth', artistId: 3196120 })
    expect(opeth).toMatchObject({ artistId: 3196120, originCountry: 'Sweden', originFlag: '🇸🇪' })
    // The hip-hop "Ghost" (different artist id, non-rock genre) must not become Sweden's Ghost.
    const namesake = normalizeTrack({
      ...raw,
      artistName: 'Ghost',
      artistId: 1437662124,
      primaryGenreName: 'Hip-Hop/Rap',
    })
    expect(namesake).toMatchObject({ originCountry: 'Unknown', originFlag: '🌐', subgenre: 'Rock' })
  })

  it('keeps the curated map consistent: unique names, a flag for every country, unique ids', () => {
    const keys = ARTIST_ENTRIES.map(([name]) => normalizeArtistKey(name))
    expect(new Set(keys).size).toBe(keys.length)
    for (const [, country] of ARTIST_ENTRIES) expect(COUNTRY_FLAGS[country]).toBeTruthy()
    expect(new Set(SPOTLIGHT_ARTIST_IDS).size).toBe(SPOTLIGHT_ARTIST_IDS.length)
    expect(SPOTLIGHT_ARTIST_IDS.length).toBeGreaterThanOrEqual(60)
    const countries = new Set(ARTIST_ENTRIES.map(([, country]) => country))
    expect(countries.size).toBeGreaterThanOrEqual(19)
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

describe('DEFAULT_FILTERS & hasActiveFilters', () => {
  it('starts with nothing filtered, and ignores sort and whitespace-only search', () => {
    expect(filterTracks(tracks, DEFAULT_FILTERS)).toHaveLength(tracks.length)
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, sort: 'title-desc' })).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: '   ' })).toBe(false)
  })

  it('reports any narrowing filter as active', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, search: 'riff' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, country: 'Sweden' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, subgenre: 'Grunge' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, artist: 'Metallica' })).toBe(true)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, mood: 'legends-70s-80s' })).toBe(true)
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

  const practiceInput = (id: number, subgenre: Subgenre) => ({
    id,
    subgenre,
    artist: 'Garage Band Nobody Knows',
    title: 'Untitled Riff',
  })

  it('resolves tuning, tempo and difficulty from the track style', () => {
    const metalcore = getTrackRiffTab(byTitle('Just Pretend'))
    expect(metalcore).toMatchObject({
      kind: 'practice',
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
    const even = getTrackRiffTab(practiceInput(2, 'Metalcore'))
    const odd = getTrackRiffTab(practiceInput(3, 'Metalcore'))
    expect(even.lines).not.toEqual(odd.lines)
  })

  it('produces a well-formed tab for every style and template', () => {
    const subgenres = Object.keys(SUBGENRE_RIFF_FAMILIES) as Subgenre[]
    for (const subgenre of subgenres) {
      for (const id of [0, 1, 2, 3]) expectWellFormed(getTrackRiffTab(practiceInput(id, subgenre)).lines)
    }
    for (const profile of Object.values(RIFF_PROFILES)) {
      for (const template of profile.templates) expectWellFormed(renderTab(template))
    }
    for (const riff of SIGNATURE_RIFFS) expectWellFormed(renderTab(riff.steps))
  })

  it('keeps columns aligned when frets have two digits', () => {
    expect(renderTab([{ E: 10 }, { E: 0, A: 2 }])).toMatchObject({
      E: '|-10-0-|',
      A: '|----2-|',
      e: '|------|',
    })
  })
})

describe('signature riff tabs', () => {
  it('uses the curated signature riff when the artist and song match', () => {
    const backInBlack = getTrackRiffTab(byTitle('Back In Black'))
    expect(backInBlack).toMatchObject({
      kind: 'signature',
      title: 'Back In Black — signature riff',
      tuning: 'E Standard (E A D G B E)',
      bpm: 94,
    })
    expect(backInBlack.lines.E).toBe('|-0-0-2---|')
  })

  it('matches remaster/live title variants and artist casing', () => {
    const ironMan = getTrackRiffTab({
      id: 99,
      subgenre: 'Heavy Metal',
      artist: 'BLACK SABBATH',
      title: 'Iron Man (2012 - Remaster)',
    })
    expect(ironMan.kind).toBe('signature')
    expect(ironMan.lines.E.startsWith('|-7-10-10-12-12-15-14-15-')).toBe(true)
    expect(normalizeTitleKey('Sweet Child O’ Mine [Live] - Remastered 2004')).toBe(
      "sweet child o' mine",
    )
  })

  it('keeps the honest practice riff for songs without a curated signature riff', () => {
    expect(getTrackRiffTab(byTitle('Paranoid')).kind).toBe('practice')
    expect(getTrackRiffTab({ ...byTitle('Back In Black'), artist: 'Some Cover Band' }).kind).toBe(
      'practice',
    )
  })
})

describe('getTabColumns', () => {
  it('returns one padded column per step that joins back into the rendered lines', () => {
    const steps = [{ E: 10 }, { E: 0, A: 2 }, { G: 7 }]
    const columns = getTabColumns(steps)
    expect(columns.map((column) => column.width)).toEqual([2, 1, 1])
    expect(columns[0]?.cells).toEqual({ e: '--', B: '--', G: '--', D: '--', A: '--', E: '10' })

    const lines = renderTab(steps)
    for (const string of GUITAR_STRINGS) {
      expect('|-' + columns.map((column) => `${column.cells[string]}-`).join('') + '|').toBe(
        lines[string],
      )
    }
  })
})

describe('getRiffPlayheadIndex', () => {
  it('advances stepsPerBeat columns per beat and loops over the riff', () => {
    // 120 BPM × 2 steps per beat = 4 columns per second
    expect(getRiffPlayheadIndex(0, 120, 8)).toBe(0)
    expect(getRiffPlayheadIndex(0.26, 120, 8)).toBe(1)
    expect(getRiffPlayheadIndex(1, 120, 8)).toBe(4)
    expect(getRiffPlayheadIndex(2, 120, 8)).toBe(0) // wrapped after 8 columns
    expect(getRiffPlayheadIndex(1, 60, 6, 3)).toBe(3)
  })

  it('returns null when there is nothing to highlight, and clamps negative time', () => {
    expect(getRiffPlayheadIndex(5, 120, 0)).toBeNull()
    expect(getRiffPlayheadIndex(5, 0, 8)).toBeNull()
    expect(getRiffPlayheadIndex(Number.NaN, 120, 8)).toBeNull()
    expect(getRiffPlayheadIndex(-3, 120, 8)).toBe(0)
  })
})
