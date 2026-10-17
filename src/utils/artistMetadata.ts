import type { ArtistMetadata, OriginCountry, Subgenre } from '../types/track'

export const COUNTRY_FLAGS: Record<OriginCountry, string> = {
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  Sweden: '🇸🇪',
  Germany: '🇩🇪',
  Australia: '🇦🇺',
  France: '🇫🇷',
  Canada: '🇨🇦',
  Finland: '🇫🇮',
  Denmark: '🇩🇰',
  Unknown: '🌐',
}

// [artist as shown on iTunes, country the band formed in, main style]
const ARTIST_ENTRIES: ReadonlyArray<readonly [string, OriginCountry, Subgenre]> = [
  // ---- Metalcore & post-hardcore ----
  ['A Day to Remember', 'United States', 'Metalcore'],
  ['All That Remains', 'United States', 'Metalcore'],
  ['Architects', 'United Kingdom', 'Metalcore'],
  ['As I Lay Dying', 'United States', 'Metalcore'],
  ['Asking Alexandria', 'United Kingdom', 'Metalcore'],
  ['Atreyu', 'United States', 'Metalcore'],
  ['Attack Attack!', 'United States', 'Metalcore'],
  ['August Burns Red', 'United States', 'Metalcore'],
  ['Bad Omens', 'United States', 'Metalcore'],
  ['Beartooth', 'United States', 'Metalcore'],
  ['blessthefall', 'United States', 'Metalcore'],
  ['Bring Me The Horizon', 'United Kingdom', 'Metalcore'],
  ['Bullet For My Valentine', 'United Kingdom', 'Metalcore'],
  ['I Prevail', 'United States', 'Metalcore'],
  ['Ice Nine Kills', 'United States', 'Metalcore'],
  ['Killswitch Engage', 'United States', 'Metalcore'],
  ['LANDMVRKS', 'France', 'Metalcore'],
  ['Make Them Suffer', 'Australia', 'Metalcore'],
  ['Memphis May Fire', 'United States', 'Metalcore'],
  ['Motionless In White', 'United States', 'Metalcore'],
  ['Northlane', 'Australia', 'Metalcore'],
  ['Of Mice & Men', 'United States', 'Metalcore'],
  ['Parkway Drive', 'Australia', 'Metalcore'],
  ['Polaris', 'Australia', 'Metalcore'],
  ['Spiritbox', 'Canada', 'Metalcore'],
  ['The Devil Wears Prada', 'United States', 'Metalcore'],
  ['The Amity Affliction', 'Australia', 'Metalcore'],
  ['Trivium', 'United States', 'Metalcore'],
  ['Underoath', 'United States', 'Metalcore'],
  ['Wage War', 'United States', 'Metalcore'],
  ['We Came As Romans', 'United States', 'Metalcore'],
  ['While She Sleeps', 'United Kingdom', 'Metalcore'],
  ['Enter Shikari', 'United Kingdom', 'Post-Hardcore'],
  ['Falling In Reverse', 'United States', 'Post-Hardcore'],

  // ---- Heavy, thrash, groove & extreme metal ----
  ['Avenged Sevenfold', 'United States', 'Heavy Metal'],
  ['Black Sabbath', 'United Kingdom', 'Heavy Metal'],
  ['Five Finger Death Punch', 'United States', 'Heavy Metal'],
  ['Ghost', 'Sweden', 'Heavy Metal'],
  ['Iron Maiden', 'United Kingdom', 'Heavy Metal'],
  ['Judas Priest', 'United Kingdom', 'Heavy Metal'],
  ['Motörhead', 'United Kingdom', 'Heavy Metal'],
  ['Ozzy Osbourne', 'United Kingdom', 'Heavy Metal'],
  ['Volbeat', 'Denmark', 'Heavy Metal'],
  ['Anthrax', 'United States', 'Thrash Metal'],
  ['Megadeth', 'United States', 'Thrash Metal'],
  ['Metallica', 'United States', 'Thrash Metal'],
  ['Slayer', 'United States', 'Thrash Metal'],
  ['Lamb of God', 'United States', 'Groove Metal'],
  ['Pantera', 'United States', 'Groove Metal'],
  ['Amon Amarth', 'Sweden', 'Melodic Death Metal'],
  ['Children of Bodom', 'Finland', 'Melodic Death Metal'],
  ['In Flames', 'Sweden', 'Melodic Death Metal'],
  ['Sabaton', 'Sweden', 'Power Metal'],
  ['Nightwish', 'Finland', 'Symphonic Metal'],
  ['Dream Theater', 'United States', 'Progressive Metal'],
  ['Gojira', 'France', 'Progressive Metal'],
  ['Mastodon', 'United States', 'Progressive Metal'],
  ['Meshuggah', 'Sweden', 'Progressive Metal'],
  ['Opeth', 'Sweden', 'Progressive Metal'],
  ['Tool', 'United States', 'Progressive Metal'],
  ['Veil of Maya', 'United States', 'Progressive Metal'],

  // ---- Alternative, nu & industrial metal ----
  ['Breaking Benjamin', 'United States', 'Alternative Metal'],
  ['Deftones', 'United States', 'Alternative Metal'],
  ['Disturbed', 'United States', 'Alternative Metal'],
  ['Evanescence', 'United States', 'Alternative Metal'],
  ['In This Moment', 'United States', 'Alternative Metal'],
  ['Sleep Token', 'United Kingdom', 'Alternative Metal'],
  ['System Of A Down', 'United States', 'Alternative Metal'],
  ['Korn', 'United States', 'Nu Metal'],
  ['Linkin Park', 'United States', 'Nu Metal'],
  ['Papa Roach', 'United States', 'Nu Metal'],
  ['Slipknot', 'United States', 'Nu Metal'],
  ['Rage Against the Machine', 'United States', 'Rap Metal'],
  ['Rammstein', 'Germany', 'Industrial Metal'],
  ['Rob Zombie', 'United States', 'Industrial Metal'],

  // ---- Hard rock ----
  ['AC/DC', 'Australia', 'Hard Rock'],
  ['Accept', 'Germany', 'Hard Rock'],
  ['Aerosmith', 'United States', 'Hard Rock'],
  ['Alter Bridge', 'United States', 'Hard Rock'],
  ['Audioslave', 'United States', 'Hard Rock'],
  ['Bon Jovi', 'United States', 'Hard Rock'],
  ['Deep Purple', 'United Kingdom', 'Hard Rock'],
  ['Def Leppard', 'United Kingdom', 'Hard Rock'],
  ["Guns N' Roses", 'United States', 'Hard Rock'],
  ['Halestorm', 'United States', 'Hard Rock'],
  ['Kid Rock', 'United States', 'Hard Rock'],
  ['KISS', 'United States', 'Hard Rock'],
  ['Scorpions', 'Germany', 'Hard Rock'],
  ['Shinedown', 'United States', 'Hard Rock'],
  ['Van Halen', 'United States', 'Hard Rock'],
  ['Whitesnake', 'United Kingdom', 'Hard Rock'],
  ['Queens of the Stone Age', 'United States', 'Stoner Rock'],
  ['Wolfmother', 'Australia', 'Stoner Rock'],

  // ---- Classic & progressive rock ----
  ['Eagles', 'United States', 'Classic Rock'],
  ['Led Zeppelin', 'United Kingdom', 'Classic Rock'],
  ['Queen', 'United Kingdom', 'Classic Rock'],
  ['The Rolling Stones', 'United Kingdom', 'Classic Rock'],
  ['Pink Floyd', 'United Kingdom', 'Progressive Rock'],
  ['Procol Harum', 'United Kingdom', 'Progressive Rock'],
  ['Rush', 'Canada', 'Progressive Rock'],

  // ---- Grunge, alternative & punk ----
  ['Alice In Chains', 'United States', 'Grunge'],
  ['Nirvana', 'United States', 'Grunge'],
  ['Pearl Jam', 'United States', 'Grunge'],
  ['Soundgarden', 'United States', 'Grunge'],
  ['Stone Temple Pilots', 'United States', 'Grunge'],
  ['3 Doors Down', 'United States', 'Post-Grunge'],
  ['Nickelback', 'Canada', 'Post-Grunge'],
  ['Three Days Grace', 'Canada', 'Post-Grunge'],
  ['Foo Fighters', 'United States', 'Alternative Rock'],
  ['Muse', 'United Kingdom', 'Alternative Rock'],
  ['The Smashing Pumpkins', 'United States', 'Alternative Rock'],
  ['Red Hot Chili Peppers', 'United States', 'Funk Rock'],
  ['HIM', 'Finland', 'Gothic Rock'],
  ['Billy Talent', 'Canada', 'Punk Rock'],
  ['Green Day', 'United States', 'Punk Rock'],
  ['My Chemical Romance', 'United States', 'Emo'],
]

/** Lowercases, drops a trailing "(US)"-style qualifier and normalizes quotes/whitespace. */
export function normalizeArtistKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const ARTIST_METADATA: ReadonlyMap<string, ArtistMetadata> = new Map(
  ARTIST_ENTRIES.map(([name, originCountry, subgenre]) => [
    normalizeArtistKey(name),
    { originCountry, subgenre },
  ]),
)

// Splits "Bad Omens, Let's Eat Grandma & Chief" / "X feat. Y" into the lead artist.
const COLLABORATION_SEPARATOR = /\s*(?:,|&|\bfeat\.?|\bft\.?|\bwith\b|\bx\b)\s*/i

/** Curated origin/style for an artist (or the lead artist of a collaboration), or null if unlisted. */
export function findArtistMetadata(artistName: string): ArtistMetadata | null {
  const exact = ARTIST_METADATA.get(normalizeArtistKey(artistName))
  if (exact) return exact

  const leadArtist = artistName.split(COLLABORATION_SEPARATOR)[0] ?? ''
  return ARTIST_METADATA.get(normalizeArtistKey(leadArtist)) ?? null
}

// Style guessed from the iTunes genre when the artist isn't in the curated map.
const GENRE_FALLBACK_SUBGENRES: Readonly<Partial<Record<string, Subgenre>>> = {
  Metal: 'Heavy Metal',
  'Heavy Metal': 'Heavy Metal',
  'Hair Metal': 'Heavy Metal',
  'Death Metal/Black Metal': 'Melodic Death Metal',
  'Hard Rock': 'Hard Rock',
  'Arena Rock': 'Hard Rock',
  'Glam Rock': 'Hard Rock',
  'Blues-Rock': 'Classic Rock',
  'Southern Rock': 'Classic Rock',
  Psychedelic: 'Classic Rock',
  'Prog-Rock/Art Rock': 'Progressive Rock',
  Grunge: 'Grunge',
  Punk: 'Punk Rock',
  Hardcore: 'Post-Hardcore',
  Alternative: 'Alternative Rock',
}

/**
 * Deterministic enrichment for any artist: curated data when listed, otherwise
 * "Unknown" origin (we never guess a country) and a style derived from the iTunes genre.
 */
export function getArtistMetadata(artistName: string, itunesGenre: string): ArtistMetadata {
  return (
    findArtistMetadata(artistName) ?? {
      originCountry: 'Unknown',
      subgenre: GENRE_FALLBACK_SUBGENRES[itunesGenre] ?? 'Rock',
    }
  )
}
