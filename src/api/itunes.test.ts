import { describe, expect, it } from 'vitest'
import {
  DEEP_CATALOG_ARTISTS,
  DEEP_CATALOG_ARTIST_IDS,
  FEATURED_ALBUMS,
  FEATURED_TRACK_IDS,
  HEADLINER_ARTIST_IDS,
  SPOTLIGHT_ARTIST_IDS,
} from '../utils/artistMetadata'
import { LOOKUP_TIERS, buildFeaturedLookupUrl, buildLookupUrls, getCatalogRequestUrls } from './itunes'

describe('featured lookup', () => {
  it('fetches the featured albums and exact studio tracks in one request', () => {
    const url = buildFeaturedLookupUrl()
    expect(url).not.toBeNull()
    expect(getCatalogRequestUrls()).toContain(url)
    const params = new URL(url ?? '').searchParams
    expect(params.get('entity')).toBe('song')
    expect(params.get('limit')).toBe('200')
    const ids = (params.get('id') ?? '').split(',').map(Number)
    expect(ids).toContain(598282638) // Sempiternal (standard edition)
    expect(ids).toEqual([...FEATURED_ALBUMS.map((album) => album.collectionId), ...FEATURED_TRACK_IDS])
    expect(FEATURED_TRACK_IDS).toHaveLength(15) // 9 Limp Bizkit + 6 Saliva studio hits
  })

  it('is skipped when nothing is featured', () => {
    expect(buildFeaturedLookupUrl([], [])).toBeNull()
  })
})

describe('catalog request plan', () => {
  it('stays well below Apple’s ~20 requests/minute: 3 searches + deep, headliner, spotlight and featured lookups', () => {
    const urls = getCatalogRequestUrls()
    expect(urls).toHaveLength(13)
    expect(urls.filter((url) => url.includes('/lookup?'))).toHaveLength(10)
    expect(urls.filter((url) => url.includes('/search?'))).toHaveLength(3)
  })

  it('looks up every curated international band by artist id', () => {
    const requestedIds = buildLookupUrls(SPOTLIGHT_ARTIST_IDS).flatMap((url) =>
      (new URL(url).searchParams.get('id') ?? '').split(',').map(Number),
    )
    expect(requestedIds).toEqual([...SPOTLIGHT_ARTIST_IDS])
    expect(buildLookupUrls([1, 2])[0]).toContain('entity=song')
  })

  it('fetches the 22 flagship bands deepest (50 songs each → 20–25 studio songs, ≤8 ids per lookup)', () => {
    const deepLookups = getCatalogRequestUrls().filter(
      (url) =>
        url.includes('/lookup?') &&
        new URL(url).searchParams.get('limit') === String(LOOKUP_TIERS.deep.songsPerArtist),
    )
    expect(LOOKUP_TIERS.deep.songsPerArtist).toBeGreaterThanOrEqual(40)
    expect(DEEP_CATALOG_ARTISTS).toHaveLength(22)
    expect(DEEP_CATALOG_ARTIST_IDS).toContain(105544) // Limp Bizkit
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
