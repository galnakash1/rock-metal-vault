import { describe, expect, it } from 'vitest'
import { getSearchQuery, getStreamingLinks } from './streamingLinks'

const lithium = {
  artist: 'Nirvana',
  title: 'Lithium',
  storeUrl: 'https://music.apple.com/us/album/lithium/1440783617?i=1440783632',
}

describe('getStreamingLinks', () => {
  it('links Apple Music, Spotify and YouTube, in that order', () => {
    const links = getStreamingLinks(lithium)
    expect(links.map((link) => link.label)).toEqual(['Apple Music', 'Spotify', 'YouTube'])
    expect(links[0]?.url).toBe(lithium.storeUrl)
    expect(links[1]?.url).toBe('https://open.spotify.com/search/Nirvana%20Lithium')
    expect(links[2]?.url).toBe('https://www.youtube.com/results?search_query=Nirvana%20Lithium')
  })

  it('falls back to an Apple Music search without a store link', () => {
    expect(getStreamingLinks({ ...lithium, storeUrl: null })[0]?.url).toBe(
      'https://music.apple.com/us/search?term=Nirvana%20Lithium',
    )
  })

  it('encodes special characters safely', () => {
    const [, spotify] = getStreamingLinks({ artist: 'AC/DC', title: 'T.N.T. & Friends?', storeUrl: null })
    expect(spotify?.url).toBe('https://open.spotify.com/search/AC%2FDC%20T.N.T.%20%26%20Friends%3F')
  })
})

describe('getSearchQuery', () => {
  it('drops remaster and edition noise from the title', () => {
    expect(getSearchQuery({ artist: 'Iron Maiden', title: 'The Trooper (2015 Remaster)' })).toBe('Iron Maiden The Trooper')
    expect(getSearchQuery({ artist: 'Metallica', title: 'One [Remastered Deluxe Version]' })).toBe('Metallica One')
    expect(getSearchQuery({ artist: 'Korn', title: 'Freak on a Leash (feat. Amy Lee)' })).toBe(
      'Korn Freak on a Leash (feat. Amy Lee)',
    )
  })
})
