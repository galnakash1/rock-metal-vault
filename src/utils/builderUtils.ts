import type { OriginCountry, Subgenre, Track } from '../types/track'
import { getCatalogTier, getLeadArtistKey } from './artistMetadata'

// ---------- Sonic Diagnostic: 5 questions ----------

export type QuestionId = 'tempo' | 'era' | 'mood' | 'scene' | 'depth'

export interface DiagnosticOption {
  id: string
  label: string
  hint: string
}

export interface DiagnosticQuestion {
  id: QuestionId
  title: string // short heading, e.g. "Tempo & Energy"
  prompt: string
  options: DiagnosticOption[]
}

export type DiagnosticAnswers = Record<QuestionId, string>

export const DIAGNOSTIC_QUESTIONS: readonly DiagnosticQuestion[] = [
  {
    id: 'tempo',
    title: 'Tempo & Energy',
    prompt: 'How should the riffs hit you?',
    options: [
      { id: 'slow', label: 'Slow & crushing', hint: 'Doom, post-metal, long builds' },
      { id: 'groove', label: 'Mid-tempo groove', hint: 'Head-nodding grooves and big hooks' },
      { id: 'fast', label: 'Fast & relentless', hint: 'Thrash, metalcore, blast beats' },
    ],
  },
  {
    id: 'era',
    title: 'Era & Guitar Tone',
    prompt: 'Which guitar sound gets you going?',
    options: [
      { id: 'vintage', label: '70s–80s tube amps', hint: 'Classic crunch and twin-guitar leads' },
      { id: 'nineties', label: '90s–00s distortion', hint: 'Grunge, nu metal, the Ozzfest years' },
      { id: 'modern', label: 'Modern drop-tuned chug', hint: '2010s+ breakdowns and djent' },
    ],
  },
  {
    id: 'mood',
    title: 'Mood & Atmosphere',
    prompt: 'Pick the atmosphere for tonight.',
    options: [
      { id: 'dark', label: 'Dark & ritual', hint: 'Black, doom and gothic shadows' },
      { id: 'aggressive', label: 'Aggressive & cathartic', hint: 'Mosh-pit fury' },
      { id: 'epic', label: 'Epic & melodic', hint: 'Symphonic, power and progressive sagas' },
      { id: 'party', label: "Rock 'n' roll party", hint: 'Hard rock anthems and good times' },
    ],
  },
  {
    id: 'scene',
    title: 'Regional Scene',
    prompt: 'Where should the bands come from?',
    options: [
      { id: 'anglo', label: 'American & British giants', hint: 'The US and UK heavyweights' },
      { id: 'europe', label: 'Nordic & European', hint: 'Scandinavia, Germany, France and beyond' },
      { id: 'global', label: 'Global & unexpected', hint: 'Israel, Japan, Brazil, Australia, Canada' },
      { id: 'anywhere', label: 'Anywhere loud', hint: "Geography doesn't matter" },
    ],
  },
  {
    id: 'depth',
    title: 'Iconic vs. Deep Cuts',
    prompt: 'Hits or hidden gems?',
    options: [
      { id: 'iconic', label: 'Iconic anthems', hint: 'The flagship bands' },
      { id: 'mixed', label: 'Mix it up', hint: 'Some of both' },
      { id: 'deep', label: 'Deep cuts only', hint: 'The underground and the global scene' },
    ],
  },
]

/** True once every question has an answer. */
export function isDiagnosticComplete(answers: Partial<DiagnosticAnswers>): answers is DiagnosticAnswers {
  return DIAGNOSTIC_QUESTIONS.every((question) =>
    question.options.some((option) => option.id === answers[question.id]),
  )
}

// ---------- Scoring ----------

const styles = (...names: Subgenre[]): ReadonlySet<Subgenre> => new Set(names)

const TEMPO_STYLES: Record<string, ReadonlySet<Subgenre>> = {
  slow: styles('Doom Metal', 'Post-Metal', 'Progressive Metal', 'Progressive Rock', 'Grunge', 'Gothic Rock', 'Stoner Rock', 'Nordic Folk'),
  groove: styles('Groove Metal', 'Nu Metal', 'Alternative Metal', 'Hard Rock', 'Industrial Metal', 'Rap Metal', 'Post-Grunge', 'Funk Rock', 'Alternative Rock', 'Heavy Metal'),
  fast: styles('Thrash Metal', 'Metalcore', 'Black Metal', 'Power Metal', 'Punk Rock', 'Melodic Death Metal', 'Blackened Death Metal', 'Djent / Extreme Metal', "Black 'n' Roll", 'Kawaii Metal', 'Post-Hardcore', 'Symphonic Black Metal'),
}

const MOOD_STYLES: Record<string, ReadonlySet<Subgenre>> = {
  dark: styles('Black Metal', 'Symphonic Black Metal', 'Progressive Black Metal', 'Doom Metal', 'Gothic Rock', 'Post-Metal', 'Blackened Death Metal', 'Symphonic Death Metal', 'Industrial Metal', 'Nordic Folk', 'Grunge'),
  aggressive: styles('Metalcore', 'Nu Metal', 'Groove Metal', 'Thrash Metal', 'Djent / Extreme Metal', 'Rap Metal', 'Post-Hardcore', 'Melodic Death Metal', 'Alternative Metal'),
  epic: styles('Power Metal', 'Symphonic Metal', 'Melodic Death Metal', 'Progressive Metal', 'Progressive Rock', 'Folk Metal', 'Oriental / Folk Metal', 'Heavy Metal'),
  party: styles('Hard Rock', 'Classic Rock', 'Punk Rock', "Black 'n' Roll", 'Blues Rock', 'Stoner Rock', 'Funk Rock', 'Kawaii Metal', 'Rock', 'Emo', 'Post-Grunge', 'Alternative Rock'),
}

const SCENE_COUNTRIES: Record<string, ReadonlySet<OriginCountry>> = {
  anglo: new Set<OriginCountry>(['United States', 'United Kingdom']),
  europe: new Set<OriginCountry>(['Sweden', 'Finland', 'Norway', 'Denmark', 'Iceland', 'Germany', 'France', 'Netherlands', 'Switzerland', 'Poland', 'Ukraine', 'Greece']),
  global: new Set<OriginCountry>(['Israel', 'Japan', 'Brazil', 'Australia', 'Canada']),
}

const WEIGHTS = { tempo: 3, era: 3, mood: 4, scene: 3, depth: 3 } as const

function eraMatches(answer: string, year: number | null): boolean {
  if (year === null) return false
  if (answer === 'vintage') return year <= 1989
  if (answer === 'nineties') return year >= 1990 && year <= 2009
  return year >= 2010
}

/** How well one track fits a diagnostic profile (higher = better). Pure and deterministic. */
export function scoreTrackForProfile(track: Track, answers: DiagnosticAnswers): number {
  let score = 0
  if (TEMPO_STYLES[answers.tempo]?.has(track.subgenre)) score += WEIGHTS.tempo
  if (answers.tempo === 'slow' && track.durationMs >= 300_000) score += 1
  if (answers.tempo === 'fast' && track.durationMs > 0 && track.durationMs < 240_000) score += 1
  if (eraMatches(answers.era, track.releaseYear)) score += WEIGHTS.era
  if (MOOD_STYLES[answers.mood]?.has(track.subgenre)) score += WEIGHTS.mood
  if (SCENE_COUNTRIES[answers.scene]?.has(track.originCountry)) score += WEIGHTS.scene

  const tier = getCatalogTier(track.artist)
  const flagship = tier === 'deep' || tier === 'headliner'
  if (answers.depth === 'iconic' && flagship) score += WEIGHTS.depth
  if (answers.depth === 'mixed' && flagship) score += 1
  if (answers.depth === 'deep') score += flagship ? -1 : track.originCountry !== 'Unknown' ? WEIGHTS.depth : 1
  return score
}

/** All tracks ordered by fit (best first); ties keep catalog order, so results are stable. */
export function rankTracksForProfile(tracks: readonly Track[], answers: DiagnosticAnswers): Track[] {
  return tracks
    .map((track, index) => ({ track, index, score: scoreTrackForProfile(track, answers) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ track }) => track)
}

export const PLAYLIST_SIZE = 10
export const MAX_TRACKS_PER_ARTIST = 2

/** The top tracks from a ranking, with at most 2 per (lead) artist for variety. */
export function buildPlaylist(
  ranked: readonly Track[],
  size: number = PLAYLIST_SIZE,
  maxPerArtist: number = MAX_TRACKS_PER_ARTIST,
): Track[] {
  const perArtist = new Map<string, number>()
  const playlist: Track[] = []
  for (const track of ranked) {
    if (playlist.length === size) break
    const key = getLeadArtistKey(track.artist)
    const count = perArtist.get(key) ?? 0
    if (count >= maxPerArtist) continue
    perArtist.set(key, count + 1)
    playlist.push(track)
  }
  return playlist
}

/**
 * Swaps one playlist slot for the next-best ranked track that isn't already in the playlist
 * (keeping the per-artist cap). Repeated swaps of a slot walk further down the ranking and wrap
 * around. Returns the playlist unchanged when nothing else fits.
 */
export function swapPlaylistTrack(
  ranked: readonly Track[],
  playlist: readonly Track[],
  index: number,
  maxPerArtist: number = MAX_TRACKS_PER_ARTIST,
): Track[] {
  const removed = playlist[index]
  if (!removed) return [...playlist]
  const others = playlist.filter((_, position) => position !== index)
  const inPlaylist = new Set(playlist.map((track) => track.id))
  const perArtist = new Map<string, number>()
  for (const track of others) {
    const key = getLeadArtistKey(track.artist)
    perArtist.set(key, (perArtist.get(key) ?? 0) + 1)
  }
  const fits = (track: Track) =>
    !inPlaylist.has(track.id) && (perArtist.get(getLeadArtistKey(track.artist)) ?? 0) < maxPerArtist

  const removedRank = ranked.findIndex((track) => track.id === removed.id)
  const after = ranked.slice(removedRank + 1).find(fits)
  const replacement = after ?? ranked.slice(0, Math.max(removedRank, 0)).find(fits)
  if (!replacement) return [...playlist]
  return playlist.map((track, position) => (position === index ? replacement : track))
}

// ---------- Metal persona ----------

export interface MetalPersona {
  title: string
  tagline: string
}

const PERSONAS: Record<string, Record<string, MetalPersona>> = {
  dark: {
    slow: { title: 'Doom Cathedral Priest', tagline: 'Every riff is a slow procession into the abyss.' },
    groove: { title: 'Gothic Night Stalker', tagline: 'You prowl the shadows to a heavy, hypnotic pulse.' },
    fast: { title: 'Black Metal Frost Wraith', tagline: 'Tremolo blizzards and blast beats are your weather.' },
  },
  aggressive: {
    slow: { title: 'Sludge Pit Brute', tagline: 'Down-tuned, heavy and absolutely unmovable.' },
    groove: { title: 'Groove Wrecking Ball', tagline: 'You turn every breakdown into a demolition.' },
    fast: { title: 'Circle-Pit Commander', tagline: 'The pit opens wherever you point.' },
  },
  epic: {
    slow: { title: 'Prog Odyssey Navigator', tagline: 'Ten-minute journeys are just getting started.' },
    groove: { title: 'Symphonic Storm Bringer', tagline: 'Choirs, orchestras and riffs the size of mountains.' },
    fast: { title: 'Power Metal Valkyrie', tagline: 'Galloping into battle with the chorus held high.' },
  },
  party: {
    slow: { title: 'Blues-Rock Barfly', tagline: 'Slow-burning riffs and one more round.' },
    groove: { title: 'Arena Rock Road Warrior', tagline: 'Fists in the air, every chorus a stadium.' },
    fast: { title: 'Thrash Party Maniac', tagline: 'Fast riffs, loud amps, no curfew.' },
  },
}

/** The persona title for a profile, from its mood and tempo answers. */
export function getMetalPersona(answers: Pick<DiagnosticAnswers, 'mood' | 'tempo'>): MetalPersona {
  return (
    PERSONAS[answers.mood]?.[answers.tempo] ?? {
      title: 'Riff Wanderer',
      tagline: 'Your taste refuses every label.',
    }
  )
}
