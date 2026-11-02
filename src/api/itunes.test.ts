import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import mockData from '../test/fixtures/mockTracks.json'
import { CATALOG_CACHE_KEY } from '../utils/catalogCache'
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

// ---------- fetchCatalog: partial failures and caching (mocked API, no network) ----------

describe('fetchCatalog caching with partial failures', () => {
  const urls = getCatalogRequestUrls()
  const failingUrl = urls.find((url) => url.includes('/lookup?')) ?? ''
  const emptyResponse = { resultCount: 0, results: [] }

  // In-memory localStorage stand-in (tests run in Node, where `window` doesn't exist).
  let storage: Map<string, string>
  let fetchMock: ReturnType<typeof vi.fn>

  /** Every search returns the 10 fixture tracks; lookups return nothing; `failing` URLs fail. */
  const mockApi = (failing: (url: string) => boolean) =>
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        failing(url)
          ? new Response('', { status: 500 })
          : Response.json(url.includes('/search?') ? mockData : emptyResponse),
      ),
    )

  /** A fresh copy of the module, so its memory cache and in-flight batch start empty. */
  const loadItunes = async () => {
    vi.resetModules()
    return import('./itunes')
  }

  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
        removeItem: (key: string) => void storage.delete(key),
      },
    })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('caches a fully successful batch in memory and localStorage, using exactly the request plan', async () => {
    mockApi(() => false)
    const { fetchCatalog, getCachedCatalog } = await loadItunes()

    const tracks = await fetchCatalog()
    expect(tracks.length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledTimes(urls.length) // no extra calls on a normal load
    expect(storage.has(CATALOG_CACHE_KEY)).toBe(true)
    expect(getCachedCatalog()).toEqual(tracks)

    // The next load is served from the cache: no new requests.
    expect(await fetchCatalog()).toEqual(tracks)
    expect(fetchMock).toHaveBeenCalledTimes(urls.length)
  })

  it('returns (and streams) the tracks of a partially failed batch without caching them', async () => {
    mockApi((url) => url === failingUrl)
    const { fetchCatalog, getCachedCatalog } = await loadItunes()
    const onProgress = vi.fn()

    const tracks = await fetchCatalog({ onProgress })
    expect(tracks.length).toBeGreaterThan(0)
    expect(onProgress).toHaveBeenCalled() // progressive rendering still happens
    expect(onProgress).toHaveBeenLastCalledWith(tracks)
    expect(storage.has(CATALOG_CACHE_KEY)).toBe(false)
    expect(getCachedCatalog()).toBeNull()
  })

  it('lets the next request after a partial batch fetch the catalog again', async () => {
    mockApi((url) => url === failingUrl)
    const { fetchCatalog, getCachedCatalog } = await loadItunes()
    await fetchCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(urls.length)

    // The failing request has recovered: the next (non-Retry) request starts a new batch.
    mockApi(() => false)
    const tracks = await fetchCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(urls.length * 2)
    expect(storage.has(CATALOG_CACHE_KEY)).toBe(true)
    expect(getCachedCatalog()).toEqual(tracks)
  })

  it('rejects when every request fails, and caches nothing', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { fetchCatalog, getCachedCatalog } = await loadItunes()

    await expect(fetchCatalog()).rejects.toThrow("Couldn't reach the iTunes API")
    expect(storage.has(CATALOG_CACHE_KEY)).toBe(false)
    expect(getCachedCatalog()).toBeNull()
  })

  it('reports HTTP errors when every request fails with one', async () => {
    mockApi(() => true)
    const { fetchCatalog } = await loadItunes()
    await expect(fetchCatalog()).rejects.toThrow('HTTP 500')
  })
})
