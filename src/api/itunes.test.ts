import { describe, expect, it } from 'vitest'
import {
  DEEP_CATALOG_ARTISTS,
  DEEP_CATALOG_ARTIST_IDS,
  HEADLINER_ARTIST_IDS,
  SPOTLIGHT_ARTIST_IDS,
} from '../utils/artistMetadata'
import { LOOKUP_TIERS, buildLookupUrls, getCatalogRequestUrls } from './itunes'

describe('catalog request plan', () => {
  it('stays well below Apple’s ~20 requests/minute: 3 searches + deep, headliner and spotlight lookups', () => {
    const urls = getCatalogRequestUrls()
    expect(urls.length).toBeLessThanOrEqual(12)
    expect(urls.filter((url) => url.includes('/lookup?'))).toHaveLength(9)
    expect(urls.filter((url) => url.includes('/search?'))).toHaveLength(3)
  })

  it('looks up every curated international band by artist id', () => {
    const requestedIds = buildLookupUrls(SPOTLIGHT_ARTIST_IDS).flatMap((url) =>
      (new URL(url).searchParams.get('id') ?? '').split(',').map(Number),
    )
    expect(requestedIds).toEqual([...SPOTLIGHT_ARTIST_IDS])
    expect(buildLookupUrls([1, 2])[0]).toContain('entity=song')
  })

  it('fetches the 21 flagship bands deepest (50 songs each → 20–25 studio songs, ≤7 ids per lookup)', () => {
    const deepLookups = getCatalogRequestUrls().filter(
      (url) =>
        url.includes('/lookup?') &&
        new URL(url).searchParams.get('limit') === String(LOOKUP_TIERS.deep.songsPerArtist),
    )
    expect(LOOKUP_TIERS.deep.songsPerArtist).toBeGreaterThanOrEqual(40)
    expect(DEEP_CATALOG_ARTISTS).toHaveLength(21)
    expect(DEEP_CATALOG_ARTIST_IDS).toHaveLength(DEEP_CATALOG_ARTISTS.length)
    expect(deepLookups).toHaveLength(3)
    const ids = deepLookups.flatMap((url) => (new URL(url).searchParams.get('id') ?? '').split(',').map(Number))
    expect(ids).toEqual([...DEEP_CATALOG_ARTIST_IDS])
    for (const url of deepLookups) expect(url).toContain('entity=song')
  })

  it('fetches headliners in depth (10 songs each) and the rest as a 5-song spotlight', () => {
    const lookups = getCatalogRequestUrls().filter((url) => url.includes('/lookup?'))
    const idsAt = (limit: string) =>
      lookups
        .filter((url) => new URL(url).searchParams.get('limit') === limit)
        .flatMap((url) => (new URL(url).searchParams.get('id') ?? '').split(',').map(Number))
    expect(idsAt(String(LOOKUP_TIERS.headliner.songsPerArtist))).toEqual([...HEADLINER_ARTIST_IDS])
    expect(idsAt(String(LOOKUP_TIERS.spotlight.songsPerArtist))).toEqual([...SPOTLIGHT_ARTIST_IDS])
    expect(LOOKUP_TIERS.headliner.songsPerArtist).toBeGreaterThanOrEqual(6)
  })

  it('splits id lists into lookups of at most 16 ids', () => {
    const ids = Array.from({ length: 40 }, (_, index) => index + 1)
    const urls = buildLookupUrls(ids)
    expect(urls).toHaveLength(3)
    for (const url of urls) {
      expect((new URL(url).searchParams.get('id') ?? '').split(',').length).toBeLessThanOrEqual(16)
    }
    expect(buildLookupUrls([])).toEqual([])
  })
})
