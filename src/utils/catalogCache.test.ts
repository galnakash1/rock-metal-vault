import { describe, expect, it } from 'vitest'
import mockData from '../data/mockTracks.json'
import { CATALOG_CACHE_TTL_MS, parseCatalogCache, serializeCatalogCache } from './catalogCache'
import { normalizeTracks, parseSearchResults } from './trackUtils'

const tracks = normalizeTracks(parseSearchResults(mockData))
const NOW = 1_800_000_000_000

describe('catalog session cache', () => {
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
