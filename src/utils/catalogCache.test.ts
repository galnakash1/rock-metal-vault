import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import {
  CATALOG_CACHE_KEY,
  CATALOG_CACHE_TTL_MS,
  MAX_SONGS_PER_ARTIST,
  canonicalizeAlbumArtwork,
  capTracksPerArtist,
  dedupeSongs,
  mergeCatalogTracks,
  parseCatalogCache,
  serializeCatalogCache,
} from './catalogCache'
import { normalizeTracks, parseSearchResults } from './trackUtils'

const tracks = normalizeTracks(parseSearchResults(mockData))
const NOW = 1_800_000_000_000

const [fixtureTrack] = tracks
if (!fixtureTrack) throw new Error('fixture is empty')
const lithium = { ...fixtureTrack, title: 'Lithium', artist: 'Nirvana' }

describe('catalog localStorage cache', () => {
  it('uses a versioned key and a multi-hour TTL', () => {
    expect(CATALOG_CACHE_KEY).toBe('rmv:catalog:v5')
    expect(CATALOG_CACHE_TTL_MS).toBe(6 * 60 * 60 * 1000)
  })

  it('round-trips a fresh catalog', () => {
    expect(parseCatalogCache(serializeCatalogCache(tracks, NOW), NOW + 1_000)).toEqual(tracks)
  })

  it('expires after the TTL and rejects timestamps from the future', () => {
    const raw = serializeCatalogCache(tracks, NOW)
    expect(parseCatalogCache(raw, NOW + CATALOG_CACHE_TTL_MS)).toEqual(tracks)
    expect(parseCatalogCache(raw, NOW + CATALOG_CACHE_TTL_MS + 1)).toBeNull()
    expect(parseCatalogCache(raw, NOW - 1)).toBeNull()
  })

  it('returns null for missing, corrupted, malformed or empty caches', () => {
    expect(parseCatalogCache(null, NOW)).toBeNull()
    expect(parseCatalogCache('{nope', NOW)).toBeNull()
    expect(parseCatalogCache('[]', NOW)).toBeNull()
    expect(parseCatalogCache(JSON.stringify({ savedAt: 'yesterday', tracks }), NOW)).toBeNull()
    expect(parseCatalogCache(JSON.stringify({ savedAt: NOW, tracks: [{ id: 1 }] }), NOW)).toBeNull()
    expect(parseCatalogCache(serializeCatalogCache([], NOW), NOW)).toBeNull()
  })
})

describe('mergeCatalogTracks (progressive loading)', () => {
  const [first, second, third] = tracks

  it('keeps tracks already on screen in place and appends new ones', () => {
    if (!first || !second || !third) throw new Error('fixture too small')
    expect(mergeCatalogTracks([first, second], [third]).map((track) => track.id)).toEqual([
      first.id,
      second.id,
      third.id,
    ])
  })

  it('drops duplicates arriving from overlapping requests, keeping the first copy', () => {
    if (!first || !second) throw new Error('fixture too small')
    const duplicate = { ...first, title: 'Duplicate from another request' }
    const merged = mergeCatalogTracks([first], [duplicate, second])
    expect(merged.map((track) => track.title)).toEqual([first.title, second.title])
  })

  it('handles empty inputs and never mutates its arguments', () => {
    const current = [...tracks]
    expect(mergeCatalogTracks([], tracks)).toEqual(tracks)
    expect(mergeCatalogTracks(current, [])).toEqual(tracks)
    expect(current).toEqual(tracks)
  })
})

describe('dedupeSongs', () => {
  it('keeps one copy of a song released on several albums (different track ids)', () => {
    const [first, second] = tracks
    if (!first || !second) throw new Error('fixture too small')
    const compilationCopy = { ...first, id: 999, album: 'Greatest Hits', title: `${first.title} (2012 Remaster)` }
    expect(dedupeSongs([first, second, compilationCopy]).map((track) => track.id)).toEqual([
      first.id,
      second.id,
    ])
  })

  it('treats a collaboration credit as the same lead artist, but keeps different songs', () => {
    const [first, second] = tracks
    if (!first || !second) throw new Error('fixture too small')
    const collab = { ...first, id: 1000, artist: `${first.artist} & Guest Star` }
    expect(dedupeSongs([first, collab])).toHaveLength(1)
    expect(dedupeSongs([first, { ...second, artist: first.artist }])).toHaveLength(2)
  })

  it('is applied when batches merge progressively', () => {
    const [first] = tracks
    if (!first) throw new Error('fixture too small')
    const sameSong = { ...first, id: 4242 }
    expect(mergeCatalogTracks([first], [sameSong])).toEqual([first])
  })

  it('keeps the original release when a later compilation copy arrives first (the "Lithium" fix)', () => {
    const studio = {
      ...lithium,
      id: 1,
      album: 'Nevermind',
      releaseDate: '1991-09-24T07:00:00Z',
      artworkUrl: 'https://example.com/nevermind/100x100bb.jpg',
    }
    const selfTitledBestOf = {
      ...lithium,
      id: 2,
      album: 'Nirvana',
      releaseDate: '2002-10-29T08:00:00Z',
      artworkUrl: 'https://example.com/nirvana-2002/100x100bb.jpg',
    }
    const other = { ...lithium, id: 3, title: 'Come as You Are' }
    const result = dedupeSongs([selfTitledBestOf, other, studio])
    // The studio copy takes the compilation's place, so the grid order stays put.
    expect(result.map((track) => track.id)).toEqual([1, 3])
    expect(result[0]?.album).toBe('Nevermind')
  })
})


describe('capTracksPerArtist', () => {
  const songs = (artist: string, count: number, firstId: number) =>
    Array.from({ length: count }, (_, index) => ({
      ...fixtureTrack,
      id: firstId + index,
      artist,
      title: `${artist} song ${firstId + index}`,
    }))

  it('keeps the first 25 songs of each lead artist, in order', () => {
    const metallica = songs('Metallica', 40, 1000)
    const korn = songs('Korn', 22, 2000)
    const capped = capTracksPerArtist([...metallica, ...korn])
    expect(MAX_SONGS_PER_ARTIST).toBe(25)
    expect(capped.filter((track) => track.artist === 'Metallica').map((track) => track.id)).toEqual(
      metallica.slice(0, 25).map((track) => track.id),
    )
    expect(capped.filter((track) => track.artist === 'Korn')).toHaveLength(22)
  })

  it('counts collaborations toward the lead artist, and is applied on every merge', () => {
    const lp = [...songs('LINKIN PARK', 24, 3000), ...songs('Linkin Park & Guest', 3, 4000)]
    expect(capTracksPerArtist(lp)).toHaveLength(25)
    expect(mergeCatalogTracks(songs('Slayer', 20, 5000), songs('Slayer', 20, 6000))).toHaveLength(25)
  })
})

describe('canonicalizeAlbumArtwork', () => {
  const studioTrack = {
    ...lithium,
    id: 10,
    album: 'Nevermind',
    releaseDate: '1991-09-24T07:00:00Z',
    artworkUrl: 'https://example.com/original/100x100bb.jpg',
    artworkUrlLarge: 'https://example.com/original/600x600bb.jpg',
  }
  const deluxeTrack = {
    ...lithium,
    id: 11,
    title: 'In Bloom',
    album: 'Nevermind (Deluxe Edition)',
    releaseDate: '2011-09-23T07:00:00Z',
    artworkUrl: 'https://example.com/deluxe/100x100bb.jpg',
    artworkUrlLarge: 'https://example.com/deluxe/600x600bb.jpg',
  }

  it('gives every song of one studio album the cover of its earliest release', () => {
    const [first, second] = canonicalizeAlbumArtwork([deluxeTrack, studioTrack])
    expect(first).toMatchObject({
      id: 11,
      title: 'In Bloom',
      album: 'Nevermind',
      artworkUrl: studioTrack.artworkUrl,
      artworkUrlLarge: studioTrack.artworkUrlLarge,
    })
    expect(second).toBe(studioTrack) // already canonical: same object, no copy
  })

  it('leaves other albums and other artists alone, without mutating the input', () => {
    const otherAlbum = { ...deluxeTrack, id: 12, album: 'In Utero', artworkUrl: 'https://example.com/utero.jpg' }
    const otherArtist = { ...deluxeTrack, id: 13, artist: 'Nevermind Tribute Band' }
    const input = [studioTrack, otherAlbum, otherArtist]
    const snapshot = structuredClone(input)
    const result = canonicalizeAlbumArtwork(input)
    expect(result[1]).toBe(otherAlbum)
    expect(result[2]).toBe(otherArtist)
    expect(input).toEqual(snapshot)
  })

  it('runs as part of every progressive merge', () => {
    const merged = mergeCatalogTracks([deluxeTrack], [studioTrack])
    expect(new Set(merged.map((track) => track.artworkUrl))).toEqual(new Set([studioTrack.artworkUrl]))
  })
})
