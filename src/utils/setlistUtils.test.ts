import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import type { Track } from '../types/track'
import {
  POSTER_THEMES,
  SETLIST_QUEUE_LABEL,
  SETLIST_STORAGE_KEY,
  buildFestivalLineup,
  getHeadlinerCount,
  loadSetlist,
  parseStoredSetlist,
  removeTrackFromList,
  reviveStoredTrack,
  saveSetlist,
  toggleTrackInList,
} from './setlistUtils'
import { normalizeTracks, parseSearchResults } from './trackUtils'

const tracks: Track[] = normalizeTracks(parseSearchResults(mockData))

const byTitle = (title: string): Track => {
  const track = tracks.find((item) => item.title === title)
  if (!track) throw new Error(`Fixture track "${title}" is missing`)
  return track
}

const titles = (list: readonly Track[]): string[] => list.map((track) => track.title)

/** In-memory Storage stand-in; `failWith` makes every call throw (blocked/full storage). */
const makeStorage = (initial: Record<string, string> = {}, failWith?: Error) => {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string): string | null => {
      if (failWith) throw failWith
      return data.get(key) ?? null
    },
    setItem: (key: string, value: string): void => {
      if (failWith) throw failWith
      data.set(key, value)
    },
  }
}

// ---------- Setlist updates ----------

describe('toggleTrackInList & removeTrackFromList', () => {
  it('appends a new track to the end of the running order', () => {
    const start = [byTitle('Paranoid')]
    expect(titles(toggleTrackInList(start, byTitle('Doomsday')))).toEqual(['Paranoid', 'Doomsday'])
  })

  it('removes a track that is already saved, and never mutates the input', () => {
    const start = [byTitle('Paranoid'), byTitle('Doomsday')]
    const result = toggleTrackInList(start, byTitle('Paranoid'))
    expect(titles(result)).toEqual(['Doomsday'])
    expect(titles(start)).toEqual(['Paranoid', 'Doomsday'])
  })

  it('toggling twice restores the original setlist', () => {
    const start = [byTitle('Throne')]
    const track = byTitle('In Waves')
    expect(toggleTrackInList(toggleTrackInList(start, track), track)).toEqual(start)
  })

  it('removes by id and keeps the remaining order', () => {
    const start = [byTitle('Paranoid'), byTitle('Doomsday'), byTitle('Throne')]
    expect(titles(removeTrackFromList(start, byTitle('Doomsday').id))).toEqual(['Paranoid', 'Throne'])
    expect(removeTrackFromList(start, 123)).toEqual(start)
  })
})

// ---------- localStorage parsing ----------

describe('parseStoredSetlist', () => {
  it('round-trips a saved setlist', () => {
    const saved = [byTitle('Back In Black'), byTitle('Master of Puppets')]
    expect(parseStoredSetlist(JSON.stringify(saved))).toEqual(saved)
  })

  it('returns [] for missing, corrupted or non-array data', () => {
    expect(parseStoredSetlist(null)).toEqual([])
    expect(parseStoredSetlist('')).toEqual([])
    expect(parseStoredSetlist('{not json')).toEqual([])
    expect(parseStoredSetlist('{"id": 1}')).toEqual([])
    expect(parseStoredSetlist('"Paranoid"')).toEqual([])
  })

  it('drops malformed entries and duplicate ids but keeps valid tracks', () => {
    const valid = byTitle('Paranoid')
    const stored = [valid, { ...valid, durationMs: '2:48' }, null, 42, { title: 'Half a track' }, valid]
    expect(parseStoredSetlist(JSON.stringify(stored))).toEqual([valid])
  })

  it('re-derives origin, flag and style from the current artist map', () => {
    const stale = { ...byTitle('Master of Puppets'), originCountry: 'Unknown', originFlag: '🌐', subgenre: 'Rock' }
    expect(reviveStoredTrack(stale)).toMatchObject({
      originCountry: 'United States',
      originFlag: '🇺🇸',
      subgenre: 'Thrash Metal',
    })
  })
})

describe('loadSetlist & saveSetlist', () => {
  it('saves under the setlist key and loads the same tracks back', () => {
    const storage = makeStorage()
    const saved = [byTitle('Throne'), byTitle('Duality')]
    expect(saveSetlist(storage, saved)).toBe(true)
    expect(storage.data.has(SETLIST_STORAGE_KEY)).toBe(true)
    expect(loadSetlist(storage)).toEqual(saved)
  })

  it('falls back gracefully when storage is unavailable, blocked or full', () => {
    const blocked = makeStorage({}, new Error('SecurityError'))
    expect(loadSetlist(null)).toEqual([])
    expect(loadSetlist(blocked)).toEqual([])
    expect(saveSetlist(null, tracks)).toBe(false)
    expect(saveSetlist(blocked, tracks)).toBe(false)
  })

  it('ignores corrupted data already in storage', () => {
    expect(loadSetlist(makeStorage({ [SETLIST_STORAGE_KEY]: '[{"broken":' }))).toEqual([])
  })
})

// ---------- Festival poster tiers ----------

describe('getHeadlinerCount', () => {
  it('headlines about the top third of acts: at least 1, at most 3', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 9, 12, 30].map(getHeadlinerCount)).toEqual([
      0, 1, 1, 1, 2, 2, 3, 3, 3, 3,
    ])
  })
})

describe('buildFestivalLineup', () => {
  it('returns an empty lineup for an empty setlist', () => {
    expect(buildFestivalLineup([])).toEqual({
      headliners: [],
      underbill: [],
      trackCount: 0,
      artistCount: 0,
      totalRuntimeMs: 0,
    })
  })

  it('groups saved tracks by artist and carries origin and style onto each act', () => {
    const lineup = buildFestivalLineup(tracks)
    expect(lineup.trackCount).toBe(10)
    expect(lineup.artistCount).toBe(10)
    expect(lineup.totalRuntimeMs).toBe(2_641_634)

    const acdc = [...lineup.headliners, ...lineup.underbill].find((act) => act.artist === 'AC/DC')
    expect(acdc).toMatchObject({ originCountry: 'Australia', originFlag: '🇦🇺', subgenre: 'Hard Rock' })
  })

  it('ranks acts by saved tracks, then runtime, then name, and splits the tiers', () => {
    const metallicaLive = { ...byTitle('Master of Puppets'), id: 1, title: 'Master of Puppets (Live)' }
    const setlist = [
      byTitle('Paranoid'), // Black Sabbath — 1 track, 2:48
      byTitle('Master of Puppets'), // Metallica — 2 tracks
      metallicaLive,
      byTitle('In Waves'), // Trivium — 1 track, 5:02
      byTitle('Doomsday'), // Architects — 1 track, 4:08
    ]
    const lineup = buildFestivalLineup(setlist)

    // 4 acts → 2 headliners: Metallica (2 tracks) beats every 1-track act; Trivium has the longest runtime.
    expect(lineup.headliners.map((act) => act.artist)).toEqual(['Metallica', 'Trivium'])
    expect(lineup.underbill.map((act) => act.artist)).toEqual(['Architects', 'Black Sabbath'])
    expect(lineup.headliners[0]?.tracks).toHaveLength(2)
    expect(lineup.headliners[0]?.runtimeMs).toBe(2 * 515_387)
    expect(lineup.trackCount).toBe(5)
    expect(lineup.artistCount).toBe(4)
  })

  it('breaks full ties alphabetically so the poster is stable', () => {
    const a = { ...byTitle('Paranoid'), id: 11, artist: 'Zeta Band', durationMs: 200_000 }
    const b = { ...byTitle('Paranoid'), id: 12, artist: 'alpha band', durationMs: 200_000 }
    expect(buildFestivalLineup([a, b]).headliners.map((act) => act.artist)).toEqual(['alpha band'])
  })

  it('puts a single act on top with an empty underbill', () => {
    const lineup = buildFestivalLineup([byTitle('Throne')])
    expect(lineup.headliners.map((act) => act.artist)).toEqual(['Bring Me The Horizon'])
    expect(lineup.underbill).toEqual([])
  })
})

describe('POSTER_THEMES', () => {
  it('offers the six poster themes in switcher order', () => {
    expect(POSTER_THEMES.map((theme) => theme.label)).toEqual([
      'Hellfire Forge',
      'Catacomb Black',
      "Thrash Pit '86",
      'Foggy Woodland',
      'Blood Moon',
      "Vintage '70s Arena",
    ])
  })

  it('gives every theme a unique id and a description', () => {
    expect(new Set(POSTER_THEMES.map((theme) => theme.id)).size).toBe(POSTER_THEMES.length)
    for (const theme of POSTER_THEMES) expect(theme.description.length).toBeGreaterThan(10)
  })
})

describe('lineup queue label', () => {
  it('labels the festival lineup queue "Setlist"', () => {
    expect(SETLIST_QUEUE_LABEL).toBe('Setlist')
  })
})
