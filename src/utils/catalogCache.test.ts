import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import {
  CATALOG_CACHE_KEY,
  CATALOG_CACHE_TTL_MS,
  mergeCatalogTracks,
  parseCatalogCache,
  serializeCatalogCache,
} from './catalogCache'
import { normalizeTracks, parseSearchResults } from './trackUtils'

const tracks = normalizeTracks(parseSearchResults(mockData))
const NOW = 1_800_000_000_000

describe('catalog localStorage cache', () => {
  it('uses a versioned key and a multi-hour TTL', () => {
    expect(CATALOG_CACHE_KEY).toBe('rmv:catalog:v3')
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
