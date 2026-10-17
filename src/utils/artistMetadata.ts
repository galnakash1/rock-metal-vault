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
  Norway: '🇳🇴',
  Denmark: '🇩🇰',
  Iceland: '🇮🇸',
  Israel: '🇮🇱',
  Netherlands: '🇳🇱',
  Switzerland: '🇨🇭',
  Poland: '🇵🇱',
  Ukraine: '🇺🇦',
  Greece: '🇬🇷',
  Brazil: '🇧🇷',
  Japan: '🇯🇵',
  Unknown: '🌐',
}

/**
 * [artist as shown on iTunes, country the band formed in, main style, Apple artist id?]
 * The optional artist id (a) lets the catalog fetch the band directly with the Lookup API and
 * (b) stops namesakes (a hip-hop "Ghost", a dance "Avatar") from inheriting the band's metadata.
 */
export const ARTIST_ENTRIES: ReadonlyArray<
  readonly [name: string, country: OriginCountry, subgenre: Subgenre, itunesArtistId?: number]
> = [
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
  ['Iron Maiden', 'United Kingdom', 'Heavy Metal'],
  ['Judas Priest', 'United Kingdom', 'Heavy Metal'],
  ['Motörhead', 'United Kingdom', 'Heavy Metal'],
  ['Ozzy Osbourne', 'United Kingdom', 'Heavy Metal'],
  ['Anthrax', 'United States', 'Thrash Metal'],
  ['Megadeth', 'United States', 'Thrash Metal'],
  ['Metallica', 'United States', 'Thrash Metal'],
  ['Slayer', 'United States', 'Thrash Metal'],
  ['Lamb of God', 'United States', 'Groove Metal'],
  ['Pantera', 'United States', 'Groove Metal'],
  ['Dream Theater', 'United States', 'Progressive Metal'],
  ['Mastodon', 'United States', 'Progressive Metal'],
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
  ['HARDY', 'United States', 'Hard Rock'],
  ['Kid Rock', 'United States', 'Hard Rock'],
  ['KISS', 'United States', 'Hard Rock'],
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

  // ================= International spotlight (fetched by artist id) =================

  // ---- Israel ----
  ['Orphaned Land', 'Israel', 'Oriental / Folk Metal', 18243552],
  ['Walkways', 'Israel', 'Metalcore', 567438265],
  ['Scardust', 'Israel', 'Progressive Metal', 1276035966],
  ['Betzefer', 'Israel', 'Groove Metal', 110693895],
  ['Subterranean Masquerade', 'Israel', 'Progressive Metal'], // not in the US iTunes store
  ['Melechesh', 'Israel', 'Black Metal', 159206829],

  // ---- Sweden ----
  ['Opeth', 'Sweden', 'Progressive Metal', 3196120],
  ['In Flames', 'Sweden', 'Melodic Death Metal', 15866128],
  ['Amon Amarth', 'Sweden', 'Melodic Death Metal', 54261107],
  ['Meshuggah', 'Sweden', 'Djent / Extreme Metal', 17304969],
  ['Ghost', 'Sweden', 'Heavy Metal', 600730426],
  ['Arch Enemy', 'Sweden', 'Melodic Death Metal', 18098340],
  ['Sabaton', 'Sweden', 'Power Metal', 184065032],
  ['Katatonia', 'Sweden', 'Doom Metal', 73592787],
  ['At The Gates', 'Sweden', 'Melodic Death Metal', 57658038],
  ['Dark Tranquillity', 'Sweden', 'Melodic Death Metal', 18243687],
  ['Soilwork', 'Sweden', 'Melodic Death Metal', 6767103],
  ['Avatar', 'Sweden', 'Groove Metal', 187616241],
  ['Bathory', 'Sweden', 'Black Metal', 89837713],

  // ---- Finland ----
  ['Nightwish', 'Finland', 'Symphonic Metal', 2898807],
  ['Children of Bodom', 'Finland', 'Melodic Death Metal', 13550318],
  ['Insomnium', 'Finland', 'Melodic Death Metal', 78949757],
  ['Amorphis', 'Finland', 'Progressive Metal', 5545051],
  ['Apocalyptica', 'Finland', 'Symphonic Metal', 411644],
  ['Sonata Arctica', 'Finland', 'Power Metal', 29048370],
  ['Swallow the Sun', 'Finland', 'Doom Metal', 204626001],
  ['Korpiklaani', 'Finland', 'Folk Metal', 35939436],
  ['Wintersun', 'Finland', 'Melodic Death Metal', 20101717],

  // ---- Norway ----
  ['Dimmu Borgir', 'Norway', 'Symphonic Black Metal', 15621683],
  ['Emperor', 'Norway', 'Black Metal', 78923932],
  ['Leprous', 'Norway', 'Progressive Metal', 322022617],
  ['Satyricon', 'Norway', 'Black Metal', 6401430],
  ['Wardruna', 'Norway', 'Nordic Folk', 299406921],
  ['Enslaved', 'Norway', 'Progressive Black Metal', 251500660],
  ['Kvelertak', 'Norway', "Black 'n' Roll", 374023191],

  // ---- Denmark & Iceland ----
  ['Volbeat', 'Denmark', 'Heavy Metal', 157709052],
  ['Myrkur', 'Denmark', 'Black Metal', 293296859],
  ['Sólstafir', 'Iceland', 'Post-Metal', 255252706],
  ['KALEO', 'Iceland', 'Blues Rock', 960112019],

  // ---- More global powerhouses ----
  ['Gojira', 'France', 'Groove Metal', 65158676],
  ['Alcest', 'France', 'Post-Metal', 260872620],
  ['Rammstein', 'Germany', 'Industrial Metal', 408932],
  ['Kreator', 'Germany', 'Thrash Metal', 3258504],
  ['Blind Guardian', 'Germany', 'Power Metal', 14549348],
  ['Helloween', 'Germany', 'Power Metal', 2320560],
  ['Electric Callboy', 'Germany', 'Metalcore', 387883325],
  ['Scorpions', 'Germany', 'Hard Rock', 602212],
  ['Jinjer', 'Ukraine', 'Progressive Metal', 496694999],
  ['Behemoth', 'Poland', 'Blackened Death Metal', 42255142],
  ['Riverside', 'Poland', 'Progressive Rock', 60726978],
  ['Epica', 'Netherlands', 'Symphonic Metal', 185933496],
  ['Within Temptation', 'Netherlands', 'Symphonic Metal', 2898551],
  ['Eluveitie', 'Switzerland', 'Folk Metal', 269358403],
  ['Septicflesh', 'Greece', 'Symphonic Death Metal', 275730586],
  ['Rotting Christ', 'Greece', 'Black Metal', 28441629],
  ['Sepultura', 'Brazil', 'Groove Metal', 918092],
  ['Angra', 'Brazil', 'Power Metal', 192030844],
  ['BABYMETAL', 'Japan', 'Kawaii Metal', 477101776],
  ['Crystal Lake', 'Japan', 'Metalcore', 1186055175],
  ['Spiritbox', 'Canada', 'Metalcore', 1293047384],
  ['Devin Townsend', 'Canada', 'Progressive Metal', 30462631],
  ['Rush', 'Canada', 'Progressive Rock', 50526],
]

/**
 * Lowercases, strips accents ("Sólstafir" → "solstafir"; Apple credits songs without them),
 * drops a trailing "(US)"-style qualifier and normalizes quotes/whitespace.
 */
export function normalizeArtistKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface CuratedArtist extends ArtistMetadata {
  itunesArtistId: number | null
}

const ARTIST_METADATA: ReadonlyMap<string, CuratedArtist> = new Map(
  ARTIST_ENTRIES.map(([name, originCountry, subgenre, itunesArtistId]) => [
    normalizeArtistKey(name),
    { originCountry, subgenre, itunesArtistId: itunesArtistId ?? null },
  ]),
)

const ARTIST_BY_ITUNES_ID: ReadonlyMap<number, CuratedArtist> = new Map(
  [...ARTIST_METADATA.values()].flatMap((artist) =>
    artist.itunesArtistId === null ? [] : [[artist.itunesArtistId, artist] as const],
  ),
)

/** Apple artist ids of the curated bands the catalog fetches directly (Lookup API). */
export const SPOTLIGHT_ARTIST_IDS: readonly number[] = ARTIST_ENTRIES.flatMap(
  ([, , , itunesArtistId]) => (itunesArtistId === undefined ? [] : [itunesArtistId]),
)

// Splits "Bad Omens, Let's Eat Grandma & Chief" / "X feat. Y" into the lead artist.
const COLLABORATION_SEPARATOR = /\s*(?:,|&|\bfeat\.?|\bft\.?|\bwith\b|\bx\b)\s*/i

const toMetadata = ({ originCountry, subgenre }: CuratedArtist): ArtistMetadata => ({
  originCountry,
  subgenre,
})

// Genres a curated band's own releases plausibly carry (used only for the namesake check).
const ROCKISH_GENRE = /rock|metal|punk|grunge|core/i

/**
 * Curated origin/style for an artist, or null if unlisted. Matching order:
 * 1. Apple artist id (exact, survives renamed or collaboration credits like "BABYMETAL & …");
 * 2. normalized name — unless the ids differ and the genre isn't rock/metal, which marks a
 *    namesake (a hip-hop "Ghost", an electronic "Avatar"). Bands with a second Apple id and a
 *    rock/metal genre still match;
 * 3. the lead artist of a collaboration ("Bad Omens, Let's Eat Grandma & Chief").
 */
export function findArtistMetadata(
  artistName: string,
  itunesArtistId: number | null = null,
  itunesGenre = '',
): ArtistMetadata | null {
  const byId = itunesArtistId === null ? undefined : ARTIST_BY_ITUNES_ID.get(itunesArtistId)
  if (byId) return toMetadata(byId)

  const exact = ARTIST_METADATA.get(normalizeArtistKey(artistName))
  if (exact) {
    const isNamesake =
      itunesArtistId !== null &&
      exact.itunesArtistId !== null &&
      !ROCKISH_GENRE.test(itunesGenre)
    return isNamesake ? null : toMetadata(exact)
  }

  // Collaborations get their own artist id, so only the lead artist's name is compared.
  const leadArtist = artistName.split(COLLABORATION_SEPARATOR)[0] ?? ''
  const lead = ARTIST_METADATA.get(normalizeArtistKey(leadArtist))
  return lead ? toMetadata(lead) : null
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
export function getArtistMetadata(
  artistName: string,
  itunesGenre: string,
  itunesArtistId: number | null = null,
): ArtistMetadata {
  return (
    findArtistMetadata(artistName, itunesArtistId, itunesGenre) ?? {
      originCountry: 'Unknown',
      subgenre: GENRE_FALLBACK_SUBGENRES[itunesGenre] ?? 'Rock',
    }
  )
}
