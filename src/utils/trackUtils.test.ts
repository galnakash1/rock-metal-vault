import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import {
  FINAL_STAGE,
  LIVES_PER_RUN,
  MAX_TOURNAMENT_SCORE,
  ROUNDS_PER_STAGE,
  TOURNAMENT_STAGES,
  buildBlindTestRound,
  compareTracks,
  getArtworkBlur,
  getGuessPoints,
  getRankTitle,
  getStagePoints,
  getTournamentStage,
  isStageCandidate,
  loadArenaRecords,
  mergeArenaRecords,
  parseStoredCount,
  pickRandomTrack,
  saveArenaRecords,
  shuffle,
  summarizeTournament,
} from './arenaUtils'
import type { ITunesTrackRaw, RoundOutcome, RoundResult, Subgenre, Track, TrackFilters } from '../types/track'
import {
  ARTIST_ENTRIES,
  COUNTRY_FLAGS,
  DEEP_CATALOG_ARTISTS,
  DEEP_CATALOG_ARTIST_IDS,
  HEADLINER_ARTISTS,
  HEADLINER_ARTIST_IDS,
  SPOTLIGHT_ARTIST_IDS,
  findArtistMetadata,
  getCatalogTier,
  getArtistMetadata,
  normalizeArtistKey,
} from './artistMetadata'
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
  isCompilationAlbum,
  isStudioRecording,
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

// ---------- Studio-only catalog ----------

describe('isStudioRecording (no live tracks)', () => {
  it('rejects live versions in the track title or the album name', () => {
    const live: Array<[string, string?]> = [
      ['Master of Puppets (Live)'],
      ['Fear of the Dark (Live at Rock in Rio)'],
      ['Paranoid [Live]'],
      ['Enter Sandman - Live'],
      ['Enter Sandman – Live from Seattle'],
      ['Pisces (Live Session)'],
      ['Smoke On the Water', 'Made In Japan (The Remastered Edition) [Live]'],
      ['The Trooper', 'Live After Death (Live at Long Beach Arena)'],
      ['Du Hast', 'Live aus Berlin (Live)'],
      ['War Pigs', 'Live at Last'],
      ['One', 'Live in Moscow'],
      ['Ace of Spades', 'Live From the Hammersmith Odeon'],
    ]
    for (const [title, album] of live) expect(isStudioRecording(title, album)).toBe(false)
  })

  it('rejects commentary, karaoke, interview and unplugged releases', () => {
    expect(isStudioRecording('Track Commentary')).toBe(false)
    expect(isStudioRecording('Fade to Black (Commentary)')).toBe(false)
    expect(isStudioRecording('Iron Man (Karaoke Version)')).toBe(false)
    expect(isStudioRecording('Band Interview 2004')).toBe(false)
    expect(isStudioRecording('About a Girl', 'MTV Unplugged in New York')).toBe(false)
  })

  it('keeps studio tracks whose names merely contain the word "live"', () => {
    const studio = [
      'Live and Let Die',
      'To Live Is to Die',
      'Live Forever',
      'Live Wire',
      'Alive',
      "Livin' on a Prayer",
      'The Trooper (2015 Remaster)',
      'Master of Puppets (Remastered)',
    ]
    for (const title of studio) expect(isStudioRecording(title, 'Studio Album')).toBe(true)
  })

  it('drops live recordings during normalization', () => {
    const raw = rawByName('Paranoid')
    expect(normalizeTrack({ ...raw, trackName: 'Paranoid (Live)' })).toBeNull()
    expect(normalizeTrack({ ...raw, collectionName: 'Reunion (Live)' })).toBeNull()
    expect(normalizeTrack(raw)?.title).toBe('Paranoid')
    // The fixture is studio-only.
    expect(tracks.every((track) => isStudioRecording(track.title, track.album))).toBe(true)
  })
})

// ---------- No compilations ----------

describe('isCompilationAlbum (studio albums only)', () => {
  it('flags hits collections, anthologies and soundtracks', () => {
    const compilations = [
      'Greatest Hits',
      "Guns N' Roses: Greatest Hits",
      'The Best of Iron Maiden',
      'Best Of - Black Sabbath',
      'Anthology',
      'The Essential Judas Priest',
      'Icon',
      'Icon 2',
      '20th Century Masters - The Millennium Collection: The Best of Megadeth',
      'Retrospective',
      'The Singles 1992-2003',
      'B-Sides & Rarities',
      'Transformers: The Movie (Original Motion Picture Soundtrack)',
    ]
    for (const album of compilations) expect(isCompilationAlbum(album)).toBe(true)
  })

  it('keeps studio albums, including ones that merely contain similar words', () => {
    const studio = [
      'Nevermind',
      'Master of Puppets',
      'Iconoclast', // not "Icon"
      'Elements of Destruction',
      'Bestial Devastation', // not "best of"
      'The Number of the Beast',
      'Night Club Anthem',
      '',
    ]
    for (const album of studio) expect(isCompilationAlbum(album)).toBe(false)
    expect(isCompilationAlbum()).toBe(false)
  })

  it('drops compilation tracks during normalization', () => {
    const raw = rawByName('Paranoid')
    expect(normalizeTrack({ ...raw, collectionName: 'Greatest Hits 1970–1978' })).toBeNull()
    expect(normalizeTrack({ ...raw, collectionName: 'The Best of Black Sabbath' })).toBeNull()
    expect(normalizeTrack(raw)?.album).toBe(raw.collectionName)
    expect(tracks.every((track) => !isCompilationAlbum(track.album))).toBe(true)
  })
})

describe('catalog tiers', () => {
  it('fetches the 21 flagship bands deepest, by Apple artist id', () => {
    expect(DEEP_CATALOG_ARTISTS).toHaveLength(21)
    expect(DEEP_CATALOG_ARTIST_IDS).toHaveLength(DEEP_CATALOG_ARTISTS.length)
    for (const name of DEEP_CATALOG_ARTISTS) {
      expect(findArtistMetadata(name)).not.toBeNull()
      expect(getCatalogTier(name)).toBe('deep')
    }
    expect(DEEP_CATALOG_ARTIST_IDS).toContain(3996865) // Metallica
    expect(DEEP_CATALOG_ARTIST_IDS).toContain(112018) // Nirvana (Seattle, not a namesake)
    expect(DEEP_CATALOG_ARTIST_IDS).toContain(17304969) // Meshuggah
  })

  it('keeps the other headliners in the 10-song tier and everyone else in the spotlight', () => {
    const deep = new Set(DEEP_CATALOG_ARTISTS.map(normalizeArtistKey))
    const headlinersOnly = HEADLINER_ARTISTS.filter((name) => !deep.has(normalizeArtistKey(name)))
    expect(HEADLINER_ARTIST_IDS).toHaveLength(headlinersOnly.length)
    for (const name of headlinersOnly) expect(getCatalogTier(name)).toBe('headliner')
    expect(getCatalogTier('GOJIRA')).toBe('deep') // case-insensitive
    expect(getCatalogTier('Orphaned Land')).toBe('spotlight')
    expect(getCatalogTier('Unknown Garage Band')).toBe('spotlight')
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
    const allIds = [...DEEP_CATALOG_ARTIST_IDS, ...HEADLINER_ARTIST_IDS, ...SPOTLIGHT_ARTIST_IDS]
    expect(new Set(allIds).size).toBe(allIds.length) // unique, and no band in two tiers
    expect(allIds.length).toBeGreaterThanOrEqual(90)
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

// ---------- Riff Arena ----------

/** Deterministic pseudo-random source (LCG) so random rounds are reproducible in tests. */
const seeded = (seed: number) => {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return state / 4_294_967_296
  }
}
const ids = (list: readonly Track[]) => list.map((track) => track.id)

describe('shuffle & pickRandomTrack', () => {
  it('returns a permutation without mutating the input, reproducibly for a seed', () => {
    const before = ids(tracks)
    const shuffled = shuffle(tracks, seeded(7))
    expect([...ids(shuffled)].sort()).toEqual([...before].sort())
    expect(ids(tracks)).toEqual(before)
    expect(ids(shuffle(tracks, seeded(7)))).toEqual(ids(shuffled))
    expect(shuffle([], seeded(1))).toEqual([])
  })

  it('picks by the random value and handles an empty catalog', () => {
    expect(pickRandomTrack(tracks, () => 0)).toBe(tracks[0])
    expect(pickRandomTrack(tracks, () => 0.999)).toBe(tracks.at(-1))
    expect(pickRandomTrack([], () => 0.5)).toBeNull()
  })
})

describe('buildBlindTestRound (distractor generation)', () => {
  it('offers 4 options: the answer once plus 3 decoys by different artists', () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const round = buildBlindTestRound(tracks, { random: seeded(seed) })
      if (!round) throw new Error('expected a round')
      expect(round.options).toHaveLength(4)
      expect(round.options.filter((option) => option.id === round.answer.id)).toHaveLength(1)
      expect(new Set(round.options.map((option) => option.artist)).size).toBe(4)
    }
  })

  it('randomizes where the correct answer appears', () => {
    const positions = new Set<number>()
    for (let seed = 1; seed <= 40; seed += 1) {
      const round = buildBlindTestRound(tracks, { random: seeded(seed) })
      if (round) positions.add(round.options.findIndex((option) => option.id === round.answer.id))
    }
    expect(positions.size).toBeGreaterThan(2)
  })

  it('prefers realistic decoys from the same style', () => {
    const target = makeTrack({ id: 100, artist: 'Answer Band', title: 'Target', subgenre: 'Metalcore' })
    const sameStyle = [1, 2, 3].map((n) =>
      makeTrack({ id: 200 + n, artist: `Core Band ${n}`, title: `Core ${n}`, subgenre: 'Metalcore' }),
    )
    const otherStyle = [1, 2, 3, 4].map((n) =>
      makeTrack({ id: 300 + n, artist: `Rock Band ${n}`, title: `Rock ${n}`, subgenre: 'Classic Rock' }),
    )
    const catalog = [target, ...otherStyle, ...sameStyle]
    const excludeIds = new Set(ids(catalog).filter((id) => id !== target.id)) // force the answer
    const round = buildBlindTestRound(catalog, { random: seeded(3), excludeIds })
    expect(round?.answer.id).toBe(target.id)
    const decoys = round?.options.filter((option) => option.id !== target.id) ?? []
    expect(decoys.every((decoy) => decoy.subgenre === 'Metalcore')).toBe(true)
  })

  it('never uses a decoy by the same lead artist or with the same song title', () => {
    const target = makeTrack({ id: 1, artist: 'BABYMETAL', title: 'Gimme Chocolate!!' })
    const catalog = [
      target,
      makeTrack({ id: 2, artist: 'BABYMETAL & Electric Callboy', title: 'RATATATA' }), // same lead
      makeTrack({ id: 3, artist: 'Cover Band', title: 'Gimme Chocolate!! (Live)' }), // same title
      makeTrack({ id: 4, artist: 'Band A', title: 'A' }),
      makeTrack({ id: 5, artist: 'Band B', title: 'B' }),
      makeTrack({ id: 6, artist: 'Band C', title: 'C' }),
    ]
    const excludeIds = new Set([2, 3, 4, 5, 6])
    const round = buildBlindTestRound(catalog, { random: seeded(9), excludeIds })
    expect(ids(round?.options ?? []).sort()).toEqual([1, 4, 5, 6])
  })

  it('skips recently played answers, falling back when everything was played', () => {
    const recent = new Set(ids(tracks).slice(0, 9))
    for (let seed = 1; seed <= 10; seed += 1) {
      expect(buildBlindTestRound(tracks, { random: seeded(seed), excludeIds: recent })?.answer.id).toBe(
        tracks[9]?.id,
      )
    }
    expect(buildBlindTestRound(tracks, { random: seeded(1), excludeIds: new Set(ids(tracks)) })).not.toBeNull()
  })

  it('returns null when fewer than 4 different artists exist', () => {
    const tooFew = [
      makeTrack({ id: 1, artist: 'A', title: 'One' }),
      makeTrack({ id: 2, artist: 'A', title: 'Two' }),
      makeTrack({ id: 3, artist: 'B', title: 'Three' }),
      makeTrack({ id: 4, artist: 'C', title: 'Four' }),
    ]
    expect(buildBlindTestRound(tooFew, { random: seeded(1) })).toBeNull()
    expect(buildBlindTestRound([], { random: seeded(1) })).toBeNull()
  })
})

describe('getArtworkBlur (progressive reveal)', () => {
  it('unblurs linearly from 24px to 0px over the 30s preview, clamped', () => {
    expect(getArtworkBlur(0)).toBe(24)
    expect(getArtworkBlur(15)).toBe(12)
    expect(getArtworkBlur(7.5)).toBe(18)
    expect(getArtworkBlur(30)).toBe(0)
    expect(getArtworkBlur(45)).toBe(0)
    expect(getArtworkBlur(-2)).toBe(24)
    expect(getArtworkBlur(Number.NaN)).toBe(24)
  })
})

describe('getGuessPoints (speed scoring)', () => {
  it('rewards faster correct guesses: 1000 instantly down to 100 at the end, 0 when wrong', () => {
    expect(getGuessPoints(true, 0)).toBe(1000)
    expect(getGuessPoints(true, 15)).toBe(550)
    expect(getGuessPoints(true, 30)).toBe(100)
    expect(getGuessPoints(true, 99)).toBe(100)
    expect(getGuessPoints(false, 0)).toBe(0)
    expect(getGuessPoints(true, 5)).toBeGreaterThan(getGuessPoints(true, 6))
  })

  it('scales by the stage multiplier: ×1, ×1.5, ×2, ×2.5', () => {
    expect(getStagePoints(true, 0, 1)).toBe(1000)
    expect(getStagePoints(true, 0, 2)).toBe(1500)
    expect(getStagePoints(true, 15, 3)).toBe(1100)
    expect(getStagePoints(true, 0, 4)).toBe(2500)
    expect(getStagePoints(false, 0, 4)).toBe(0)
    expect(getStagePoints(true, 0, 99)).toBe(2500) // clamped to the final stage
  })
})

// ---------- Tournament ----------

/** Round results from outcomes; correct rounds score `points` each. */
const roundResults = (outcomes: RoundOutcome[], points = 800, stage = 1): RoundResult[] =>
  outcomes.map((outcome, index) => ({
    track: tracks[index % tracks.length] ?? makeTrack(),
    outcome,
    points: outcome === 'correct' ? points : 0,
    stage,
  }))

const FIVE_CORRECT: RoundOutcome[] = ['correct', 'correct', 'correct', 'correct', 'correct']

describe('tournament stages', () => {
  it('climbs from Easy to Elite with bigger multipliers, heavier blur and closer decoys', () => {
    expect(TOURNAMENT_STAGES.map((stage) => stage.difficulty)).toEqual(['Easy', 'Medium', 'Hard', 'Elite'])
    expect(TOURNAMENT_STAGES.map((stage) => stage.multiplier)).toEqual([1, 1.5, 2, 2.5])
    expect(TOURNAMENT_STAGES.map((stage) => stage.decoyMode)).toEqual([
      'random',
      'similar',
      'same-style',
      'same-style',
    ])
    const blurs = TOURNAMENT_STAGES.map((stage) => stage.startBlurPx)
    expect([...blurs].sort((a, b) => a - b)).toEqual(blurs)
    expect(new Set(blurs).size).toBe(blurs.length)
    expect(FINAL_STAGE).toBe(4)
    expect(ROUNDS_PER_STAGE).toBe(5)
    expect(LIVES_PER_RUN).toBe(3)
  })

  it('clamps stage numbers to the tournament', () => {
    expect(getTournamentStage(0).number).toBe(1)
    expect(getTournamentStage(2).name).toBe('Modern Heavyweights & Pit Icons')
    expect(getTournamentStage(42).number).toBe(FINAL_STAGE)
  })

  it('caps a perfect run at 5 rounds × 1,000 × every multiplier (35,000)', () => {
    expect(MAX_TOURNAMENT_SCORE).toBe(35_000)
  })

  it('fills each stage with its own pool of bands', () => {
    const metallica = makeTrack({ artist: 'Metallica', originCountry: 'United States', subgenre: 'Thrash Metal' })
    const bmth = makeTrack({ artist: 'Bring Me The Horizon', originCountry: 'United Kingdom', subgenre: 'Metalcore' })
    const meshuggah = makeTrack({ artist: 'Meshuggah', originCountry: 'Sweden', subgenre: 'Djent / Extreme Metal' })
    const israeli = makeTrack({ artist: 'Orphaned Land', originCountry: 'Israel', subgenre: 'Oriental / Folk Metal' })
    const nordicBlack = makeTrack({ artist: 'Dimmu Borgir', originCountry: 'Norway', subgenre: 'Symphonic Black Metal' })
    const nordicRock = makeTrack({ artist: 'Europe', originCountry: 'Sweden', subgenre: 'Hard Rock' })
    const uncurated = makeTrack({ artist: 'Unknown Garage Band', originCountry: 'Unknown' })

    expect(isStageCandidate(1, metallica)).toBe(true)
    expect(isStageCandidate(1, bmth)).toBe(false)
    expect(isStageCandidate(2, bmth)).toBe(true)
    expect(isStageCandidate(2, metallica)).toBe(false)
    expect(isStageCandidate(3, meshuggah)).toBe(true)
    expect(isStageCandidate(3, israeli)).toBe(true)
    expect(isStageCandidate(3, nordicBlack)).toBe(true)
    expect(isStageCandidate(3, nordicRock)).toBe(false) // Nordic, but not extreme
    expect(isStageCandidate(4, israeli)).toBe(true) // curated deep cut
    expect(isStageCandidate(4, metallica)).toBe(false) // flagship band, not a deep cut
    expect(isStageCandidate(4, uncurated)).toBe(false)
  })

  it('draws stage answers from the stage pool when one is given', () => {
    const pool = [
      makeTrack({ id: 1, artist: 'Metallica', title: 'One' }),
      makeTrack({ id: 2, artist: 'Band B', title: 'B' }),
      makeTrack({ id: 3, artist: 'Band C', title: 'C' }),
      makeTrack({ id: 4, artist: 'Band D', title: 'D' }),
      makeTrack({ id: 5, artist: 'Band E', title: 'E' }),
    ]
    for (let seed = 1; seed <= 15; seed += 1) {
      const round = buildBlindTestRound(pool, {
        random: seeded(seed),
        isAnswerCandidate: (track) => isStageCandidate(1, track),
      })
      expect(round?.answer.artist).toBe('Metallica')
    }
  })

  it('uses same-style decoys on the hard stages', () => {
    const target = makeTrack({ id: 100, artist: 'Meshuggah', title: 'Bleed', subgenre: 'Djent / Extreme Metal', originCountry: 'Sweden' })
    const sameStyle = [1, 2, 3].map((n) =>
      makeTrack({ id: 200 + n, artist: `Djent Band ${n}`, title: `Djent ${n}`, subgenre: 'Djent / Extreme Metal' }),
    )
    const otherStyle = [1, 2, 3, 4, 5].map((n) =>
      makeTrack({ id: 300 + n, artist: `Rock Band ${n}`, title: `Rock ${n}`, subgenre: 'Classic Rock' }),
    )
    for (let seed = 1; seed <= 10; seed += 1) {
      const round = buildBlindTestRound([...otherStyle, target, ...sameStyle], {
        random: seeded(seed),
        isAnswerCandidate: (track) => isStageCandidate(3, track),
        decoyMode: getTournamentStage(3).decoyMode,
      })
      expect(round?.answer.id).toBe(target.id)
      const decoys = round?.options.filter((option) => option.id !== target.id) ?? []
      expect(decoys.every((decoy) => decoy.subgenre === 'Djent / Extreme Metal')).toBe(true)
    }
  })
})

describe('summarizeTournament', () => {
  it('starts a fresh run on stage 1 with 3 lives and nothing scored', () => {
    expect(summarizeTournament([])).toEqual({
      score: 0,
      played: 0,
      correct: 0,
      livesLeft: 3,
      currentStreak: 0,
      bestStreak: 0,
      stage: 1,
      roundInStage: 0,
      stagesCleared: 0,
      justClearedStage: null,
      restoredLife: false,
      status: 'playing',
    })
  })

  it('clears a stage after 5 rounds, restores one life and moves to the next stage', () => {
    const run = summarizeTournament(roundResults(['correct', 'wrong', 'correct', 'wrong', 'correct']))
    expect(run).toMatchObject({
      score: 2400,
      played: 5,
      correct: 3,
      livesLeft: 2, // 3 − 2 misses + 1 restored
      stage: 2,
      roundInStage: 0,
      stagesCleared: 1,
      justClearedStage: 1,
      restoredLife: true,
      status: 'playing',
    })
  })

  it('never restores past 3 lives, and the transition flag clears on the next round', () => {
    const cleared = summarizeTournament(roundResults(FIVE_CORRECT))
    expect(cleared).toMatchObject({ livesLeft: 3, restoredLife: false, justClearedStage: 1 })
    const next = summarizeTournament([...roundResults(FIVE_CORRECT), ...roundResults(['wrong'], 0, 2)])
    expect(next).toMatchObject({ livesLeft: 2, stage: 2, roundInStage: 1, justClearedStage: null, restoredLife: false })
  })

  it('ends in game over when the last life is lost — even on a stage\'s 5th round', () => {
    const early = summarizeTournament(roundResults(['wrong', 'timeout', 'wrong']))
    expect(early).toMatchObject({ played: 3, livesLeft: 0, stage: 1, status: 'game-over', stagesCleared: 0 })
    const onFifth = summarizeTournament(roundResults(['correct', 'correct', 'wrong', 'wrong', 'wrong']))
    expect(onFifth).toMatchObject({ status: 'game-over', stagesCleared: 0, justClearedStage: null })
  })

  it('carries lives across stages', () => {
    const results = [
      ...roundResults(['wrong', 'wrong', 'correct', 'correct', 'correct'], 800, 1), // 1 life + 1 → 2
      ...roundResults(['wrong', 'correct', 'correct', 'wrong'], 800, 2), // 2 − 2 → 0
    ]
    expect(summarizeTournament(results)).toMatchObject({ stage: 2, livesLeft: 0, status: 'game-over' })
  })

  it('conquers the tournament after the final stage, with streaks across the whole run', () => {
    const results = TOURNAMENT_STAGES.flatMap((stage) => roundResults(FIVE_CORRECT, 1000, stage.number))
    const run = summarizeTournament(results)
    expect(run).toMatchObject({
      played: 20,
      correct: 20,
      stagesCleared: 4,
      stage: 4,
      status: 'conquered',
      bestStreak: 20,
      justClearedStage: null,
    })
    // Results after the end can't undo it.
    expect(summarizeTournament([...results, ...roundResults(['wrong'])]).status).toBe('conquered')
  })
})

describe('getRankTitle', () => {
  it('maps the tournament score to a rank at the documented thresholds', () => {
    expect(getRankTitle(0)).toBe('Garage Roadie')
    expect(getRankTitle(4999)).toBe('Garage Roadie')
    expect(getRankTitle(5000)).toBe('Mosh Pit Regular')
    expect(getRankTitle(11_999)).toBe('Mosh Pit Regular')
    expect(getRankTitle(12_000)).toBe('Main Stage Shredder')
    expect(getRankTitle(21_999)).toBe('Main Stage Shredder')
    expect(getRankTitle(22_000)).toBe('Immortal Riff God')
    expect(getRankTitle(MAX_TOURNAMENT_SCORE)).toBe('Immortal Riff God')
  })
})

describe('all-time arena records', () => {
  it('parses only non-negative integers', () => {
    expect(parseStoredCount('7')).toBe(7)
    expect(parseStoredCount(' 4200 ')).toBe(4200)
    for (const raw of [null, '', '-3', '2.5', 'abc', '1e3']) expect(parseStoredCount(raw)).toBe(0)
  })

  it('only ever raises the high score and best streak', () => {
    const records = { highScore: 3000, bestStreak: 4 }
    const run = summarizeTournament(roundResults(FIVE_CORRECT, 900))
    expect(mergeArenaRecords(records, run)).toEqual({ highScore: 4500, bestStreak: 5 })
    const weakRun = summarizeTournament(roundResults(['wrong', 'wrong', 'wrong']))
    expect(mergeArenaRecords(records, weakRun)).toEqual(records)
  })

  it('round-trips through storage and survives blocked storage', () => {
    const data = new Map<string, string>()
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    }
    expect(saveArenaRecords(storage, { highScore: 4100, bestStreak: 5 })).toBe(true)
    expect(loadArenaRecords(storage)).toEqual({ highScore: 4100, bestStreak: 5 })

    const blocked = {
      getItem: (): string | null => {
        throw new Error('blocked')
      },
      setItem: (): void => {
        throw new Error('blocked')
      },
    }
    expect(loadArenaRecords(blocked)).toEqual({ highScore: 0, bestStreak: 0 })
    expect(saveArenaRecords(blocked, { highScore: 1, bestStreak: 1 })).toBe(false)
    expect(loadArenaRecords(null)).toEqual({ highScore: 0, bestStreak: 0 })
  })
})

describe('compareTracks (Head-to-Head metrics)', () => {
  const row = (label: string, a: Track, b: Track) => compareTracks(a, b).find((r) => r.label === label)

  it('highlights the longer track and the earlier (vintage) release', () => {
    const puppets = byTitle('Master of Puppets') // 8:35, 1986
    const paranoid = byTitle('Paranoid') // 2:48, 1970
    expect(row('Duration', puppets, paranoid)).toMatchObject({
      valueA: '08:35',
      valueB: '02:48',
      winner: 'a',
      winnerNote: 'Longer',
    })
    expect(row('Released', puppets, paranoid)).toMatchObject({
      valueA: '1986',
      valueB: '1970',
      winner: 'b',
      winnerNote: 'Vintage',
    })
  })

  it('shows style, origin, tuning and tempo from the riff tab without picking a winner', () => {
    const rows = compareTracks(byTitle('Just Pretend'), byTitle('Back In Black'))
    expect(rows.map((r) => r.label)).toEqual([
      'Duration',
      'Released',
      'Style',
      'Origin',
      'Guitar tuning',
      'Riff tempo',
    ])
    expect(rows.find((r) => r.label === 'Guitar tuning')).toMatchObject({
      valueA: 'Drop C (C G C F A D)',
      valueB: 'E Standard (E A D G B E)',
      winner: 'none',
    })
    expect(rows.find((r) => r.label === 'Riff tempo')?.valueB).toBe('≈ 94 BPM')
    expect(rows.find((r) => r.label === 'Origin')?.valueB).toBe('🇦🇺 Australia')
  })

  it('reports ties for identical values and no contest for unknown years', () => {
    const track = byTitle('Doomsday')
    expect(compareTracks(track, track).filter((r) => r.winner !== 'none').map((r) => r.winner)).toEqual([
      'tie',
      'tie',
    ])
    expect(row('Released', track, makeTrack({ releaseYear: null }))?.winner).toBe('none')
  })
})
