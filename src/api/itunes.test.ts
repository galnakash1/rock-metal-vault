import { describe, expect, it } from 'vitest'
import { SPOTLIGHT_ARTIST_IDS } from '../utils/artistMetadata'
import { buildLookupUrls, getCatalogRequestUrls } from './itunes'

describe('catalog request plan', () => {
  it('stays well below Apple’s ~20 requests/minute: 3 searches + a few small lookups', () => {
    const urls = getCatalogRequestUrls()
    expect(urls.length).toBeLessThanOrEqual(8)
    expect(urls.filter((url) => url.includes('/lookup?'))).toHaveLength(4)
    expect(urls.filter((url) => url.includes('/search?'))).toHaveLength(3)
  })

  it('looks up every curated international band by artist id', () => {
    const requestedIds = buildLookupUrls(SPOTLIGHT_ARTIST_IDS).flatMap((url) =>
      (new URL(url).searchParams.get('id') ?? '').split(',').map(Number),
    )
    expect(requestedIds).toEqual([...SPOTLIGHT_ARTIST_IDS])
    expect(buildLookupUrls([1, 2])[0]).toContain('entity=song')
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
