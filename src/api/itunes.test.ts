import { describe, expect, it } from 'vitest'
import { SPOTLIGHT_ARTIST_IDS } from '../utils/artistMetadata'
import { buildLookupUrls, getCatalogRequestUrls } from './itunes'

describe('catalog request plan', () => {
  it('stays far below Apple’s ~20 requests/minute: 3 searches + lookup batches', () => {
    const urls = getCatalogRequestUrls()
    expect(urls.length).toBeLessThanOrEqual(5)
    expect(urls.filter((url) => url.includes('/search?'))).toHaveLength(3)
  })

  it('looks up every curated international band by artist id', () => {
    const requestedIds = buildLookupUrls(SPOTLIGHT_ARTIST_IDS).flatMap((url) =>
      (new URL(url).searchParams.get('id') ?? '').split(',').map(Number),
    )
    expect(requestedIds).toEqual([...SPOTLIGHT_ARTIST_IDS])
    expect(buildLookupUrls([1, 2])[0]).toContain('entity=song')
  })

  it('splits very long id lists into several lookups', () => {
    const ids = Array.from({ length: 150 }, (_, index) => index + 1)
    expect(buildLookupUrls(ids)).toHaveLength(2)
    expect(buildLookupUrls([])).toEqual([])
  })
})
