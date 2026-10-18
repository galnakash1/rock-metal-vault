import { describe, expect, it } from 'vitest'
import { HEADLINER_ARTIST_IDS, SPOTLIGHT_ARTIST_IDS } from '../utils/artistMetadata'
import { LOOKUP_TIERS, buildLookupUrls, getCatalogRequestUrls } from './itunes'

describe('catalog request plan', () => {
  it('stays well below Apple’s ~20 requests/minute: 3 searches + headliner and spotlight lookups', () => {
    const urls = getCatalogRequestUrls()
    expect(urls.length).toBeLessThanOrEqual(12)
    expect(urls.filter((url) => url.includes('/lookup?'))).toHaveLength(8)
    expect(urls.filter((url) => url.includes('/search?'))).toHaveLength(3)
  })

  it('looks up every curated international band by artist id', () => {
    const requestedIds = buildLookupUrls(SPOTLIGHT_ARTIST_IDS).flatMap((url) =>
      (new URL(url).searchParams.get('id') ?? '').split(',').map(Number),
    )
    expect(requestedIds).toEqual([...SPOTLIGHT_ARTIST_IDS])
    expect(buildLookupUrls([1, 2])[0]).toContain('entity=song')
  })

  it('fetches flagship bands in depth (10 songs each) and the rest as a 5-song spotlight', () => {
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
