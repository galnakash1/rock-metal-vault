import type {
  ArenaRecords,
  BlindTestRound,
  ComparisonRow,
  ComparisonWinner,
  OriginCountry,
  RankTitle,
  RoundResult,
  Subgenre,
  TournamentSummary,
  Track,
} from '../types/track'
import { getCatalogTier, getLeadArtistKey, normalizeArtistKey } from './artistMetadata'
import { SUBGENRE_RIFF_FAMILIES, getTrackRiffTab, normalizeTitleKey } from './riffTabs'
import { formatDuration } from './trackUtils'

/** A random number in [0, 1) — injectable so tests are deterministic. */
export type RandomSource = () => number

// ---------- Randomness ----------

/** Fisher–Yates shuffle on a copy; the input is never mutated. */
export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]
    const other = result[swapIndex]
    if (current !== undefined && other !== undefined) {
      result[index] = other
      result[swapIndex] = current
    }
  }
  return result
}

/** A random track, or null for an empty list. */
export function pickRandomTrack(
  tracks: readonly Track[],
  random: RandomSource = Math.random,
): Track | null {
  if (tracks.length === 0) return null
  return tracks[Math.floor(random() * tracks.length)] ?? null
}

// ---------- Blind-Test rounds ----------

export const BLIND_TEST_OPTION_COUNT = 4

/**
 * How decoys are picked: 'random' (easy — any band), 'similar' (same style or country first),
 * 'same-style' (hard — same style, then the same riff family, then country).
 */
export type DecoyMode = 'random' | 'similar' | 'same-style'

export interface BlindTestRoundOptions {
  random?: RandomSource
  /** Recently played answers to avoid repeating (ignored if it would leave nothing to play). */
  excludeIds?: ReadonlySet<number>
  /** Which tracks may be the answer (a tournament stage's pool); decoys can come from anywhere. */
  isAnswerCandidate?: (track: Track) => boolean
  decoyMode?: DecoyMode
}

/** How plausible a decoy is next to the answer under each decoy mode (higher = closer). */
function decoySimilarity(answer: Track, candidate: Track, mode: DecoyMode): number {
  if (mode === 'random') return 0
  const sameStyle = candidate.subgenre === answer.subgenre ? 1 : 0
  const sameCountry = candidate.originCountry === answer.originCountry ? 1 : 0
  if (mode === 'similar') return sameStyle * 2 + sameCountry
  const sameFamily =
    SUBGENRE_RIFF_FAMILIES[candidate.subgenre] === SUBGENRE_RIFF_FAMILIES[answer.subgenre] ? 1 : 0
  return sameStyle * 4 + sameFamily * 2 + sameCountry
}

/**
 * Builds a round: a random playable answer (from the stage pool when given) plus 3 decoys — by
 * different lead artists (so exactly one option is right), with different titles, picked by the
 * decoy mode — all 4 shuffled. Returns null when fewer than 4 distinct artists exist.
 */
export function buildBlindTestRound(
  tracks: readonly Track[],
  { random = Math.random, excludeIds, isAnswerCandidate, decoyMode = 'similar' }: BlindTestRoundOptions = {},
): BlindTestRound | null {
  const playable = tracks.filter((track) => track.previewUrl !== '')
  const pool = isAnswerCandidate ? playable.filter(isAnswerCandidate) : playable
  const answerPool = pool.length > 0 ? pool : playable // fall back if the stage pool is empty
  const fresh = excludeIds ? answerPool.filter((track) => !excludeIds.has(track.id)) : answerPool
  const answer = pickRandomTrack(fresh.length > 0 ? fresh : answerPool, random)
  if (!answer) return null

  const usedArtists = new Set([getLeadArtistKey(answer.artist)])
  const usedTitles = new Set([normalizeTitleKey(answer.title)])

  // Shuffle first, then a stable sort by similarity: closer decoys first, random among equals.
  const candidates = shuffle(playable, random).sort(
    (a, b) => decoySimilarity(answer, b, decoyMode) - decoySimilarity(answer, a, decoyMode),
  )

  const decoys: Track[] = []
  for (const candidate of candidates) {
    if (decoys.length === BLIND_TEST_OPTION_COUNT - 1) break
    const artistKey = getLeadArtistKey(candidate.artist)
    const titleKey = normalizeTitleKey(candidate.title)
    if (usedArtists.has(artistKey) || usedTitles.has(titleKey)) continue
    usedArtists.add(artistKey)
    usedTitles.add(titleKey)
    decoys.push(candidate)
  }
  if (decoys.length < BLIND_TEST_OPTION_COUNT - 1) return null

  return { answer, options: shuffle([answer, ...decoys], random) }
}

// ---------- Reveal & scoring ----------

export const PREVIEW_SECONDS = 30
export const MAX_ARTWORK_BLUR_PX = 24

/** Artwork blur after `elapsedSec` of the preview: 24px at the start, 0px at the end (linear). */
export function getArtworkBlur(
  elapsedSec: number,
  totalSec: number = PREVIEW_SECONDS,
  maxBlurPx: number = MAX_ARTWORK_BLUR_PX,
): number {
  if (!Number.isFinite(elapsedSec) || totalSec <= 0) return maxBlurPx
  const remaining = 1 - Math.min(Math.max(elapsedSec / totalSec, 0), 1)
  return Math.round(remaining * maxBlurPx * 10) / 10
}

const BASE_POINTS = 100
const SPEED_BONUS_POINTS = 900

/**
 * Points for a guess: 0 when wrong; when right, 100 base + up to 900 for speed
 * (an instant guess scores 1000, a guess at the very end of the preview 100).
 */
export function getGuessPoints(
  isCorrect: boolean,
  elapsedSec: number,
  totalSec: number = PREVIEW_SECONDS,
): number {
  if (!isCorrect) return 0
  const safeElapsed = Number.isFinite(elapsedSec) ? elapsedSec : totalSec
  const remaining = 1 - Math.min(Math.max(safeElapsed / totalSec, 0), 1)
  return BASE_POINTS + Math.round(SPEED_BONUS_POINTS * remaining)
}

// ---------- Tournament: stages of 5 rounds, 3 lives ----------

export const ROUNDS_PER_STAGE = 5
export const LIVES_PER_RUN = 3

export interface TournamentStage {
  number: number
  name: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Elite'
  description: string
  multiplier: number // applied to every point earned in the stage
  startBlurPx: number // artwork blur at the start of each preview
  decoyMode: DecoyMode
}

const EASY_ARTISTS = [
  'Metallica', 'Nirvana', 'AC/DC', 'Iron Maiden', 'Slipknot', 'Black Sabbath', 'Linkin Park',
  "Guns N' Roses",
]
const MEDIUM_ARTISTS = [
  'Bring Me The Horizon', 'Bad Omens', 'Architects', 'Korn', 'System Of A Down', 'Gojira',
  'Rammstein', 'Pantera', 'Avenged Sevenfold',
]
const NORDIC: ReadonlySet<OriginCountry> = new Set(['Sweden', 'Finland', 'Norway', 'Denmark', 'Iceland'])
const EXTREME_STYLES: ReadonlySet<Subgenre> = new Set<Subgenre>([
  'Melodic Death Metal', 'Black Metal', 'Symphonic Black Metal', 'Progressive Black Metal',
  'Blackened Death Metal', 'Symphonic Death Metal', 'Symphonic Metal', 'Doom Metal', 'Post-Metal',
  'Djent / Extreme Metal', 'Folk Metal', 'Power Metal', 'Progressive Metal',
])

const keysOf = (names: readonly string[]): ReadonlySet<string> => new Set(names.map(normalizeArtistKey))
const EASY_KEYS = keysOf(EASY_ARTISTS)
const MEDIUM_KEYS = keysOf(MEDIUM_ARTISTS)
const MESHUGGAH_KEY = normalizeArtistKey('Meshuggah')

export const TOURNAMENT_STAGES: readonly TournamentStage[] = [
  {
    number: 1,
    name: 'Mainstream Headliners',
    difficulty: 'Easy',
    description: 'Metallica, Nirvana, AC/DC, Iron Maiden, Slipknot and friends',
    multiplier: 1,
    startBlurPx: 14,
    decoyMode: 'random',
  },
  {
    number: 2,
    name: 'Modern Heavyweights & Pit Icons',
    difficulty: 'Medium',
    description: 'Bring Me The Horizon, Bad Omens, Gojira, Rammstein, Pantera and more',
    multiplier: 1.5,
    startBlurPx: 22,
    decoyMode: 'similar',
  },
  {
    number: 3,
    name: 'Extreme, Progressive & Nordic',
    difficulty: 'Hard',
    description: 'Meshuggah, Scandinavian melodic death, black and symphonic metal, Israeli metal',
    multiplier: 2,
    startBlurPx: 28,
    decoyMode: 'same-style',
  },
  {
    number: 4,
    name: 'Global Underground & Deep Cuts',
    difficulty: 'Elite',
    description: 'Deep cuts from the curated scene around the world, with same-style decoys',
    multiplier: 2.5,
    startBlurPx: 32,
    decoyMode: 'same-style',
  },
]

export const FINAL_STAGE = TOURNAMENT_STAGES.length

/** Max points: every round answered instantly in every stage (5 × 1000 × Σ multipliers). */
export const MAX_TOURNAMENT_SCORE = TOURNAMENT_STAGES.reduce(
  (total, stage) => total + ROUNDS_PER_STAGE * (BASE_POINTS + SPEED_BONUS_POINTS) * stage.multiplier,
  0,
)

/** The stage definition for a 1-based stage number (clamped to the tournament). */
export function getTournamentStage(stageNumber: number): TournamentStage {
  const index = Math.min(Math.max(Math.round(stageNumber), 1), FINAL_STAGE) - 1
  const stage = TOURNAMENT_STAGES[index]
  if (!stage) throw new Error('Tournament has no stages')
  return stage
}

/** Whether a track belongs in a stage's answer pool. */
export function isStageCandidate(stageNumber: number, track: Track): boolean {
  const artistKey = getLeadArtistKey(track.artist)
  switch (getTournamentStage(stageNumber).number) {
    case 1:
      return EASY_KEYS.has(artistKey)
    case 2:
      return MEDIUM_KEYS.has(artistKey)
    case 3:
      return (
        artistKey === MESHUGGAH_KEY ||
        track.originCountry === 'Israel' ||
        (NORDIC.has(track.originCountry) && EXTREME_STYLES.has(track.subgenre))
      )
    default:
      // Deep cuts: curated bands outside the flagship tiers.
      return track.originCountry !== 'Unknown' && getCatalogTier(track.artist) === 'spotlight'
  }
}

/** Points for a guess in a stage: speed points × the stage multiplier (0 when wrong). */
export function getStagePoints(
  isCorrect: boolean,
  elapsedSec: number,
  stageNumber: number,
  totalSec: number = PREVIEW_SECONDS,
): number {
  return Math.round(getGuessPoints(isCorrect, elapsedSec, totalSec) * getTournamentStage(stageNumber).multiplier)
}

/**
 * Replays the round results through the tournament rules: a wrong guess or timeout costs a life;
 * 5 rounds clear a stage, restoring 1 life (max 3) and moving on; losing the last life ends the run
 * (even on a stage's 5th round); clearing the final stage conquers the tournament.
 */
export function summarizeTournament(results: readonly RoundResult[]): TournamentSummary {
  let score = 0
  let correct = 0
  let currentStreak = 0
  let bestStreak = 0
  let lives = LIVES_PER_RUN
  let stage = 1
  let roundInStage = 0
  let stagesCleared = 0
  let justClearedStage: number | null = null
  let restoredLife = false
  let status: TournamentSummary['status'] = 'playing'

  for (const result of results) {
    if (status !== 'playing') break
    justClearedStage = null
    restoredLife = false
    score += result.points
    if (result.outcome === 'correct') {
      correct += 1
      currentStreak += 1
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      currentStreak = 0
      lives -= 1
    }
    roundInStage += 1

    if (lives <= 0) {
      lives = 0
      status = 'game-over'
    } else if (roundInStage === ROUNDS_PER_STAGE) {
      stagesCleared += 1
      if (stage === FINAL_STAGE) {
        status = 'conquered'
      } else {
        justClearedStage = stage
        stage += 1
        roundInStage = 0
        restoredLife = lives < LIVES_PER_RUN
        lives = Math.min(LIVES_PER_RUN, lives + 1)
      }
    }
  }

  return {
    score,
    played: results.length,
    correct,
    livesLeft: lives,
    currentStreak,
    bestStreak,
    stage,
    roundInStage,
    stagesCleared,
    justClearedStage,
    restoredLife,
    status,
  }
}

// ---------- Rank ----------

const RANKS: ReadonlyArray<readonly [minScore: number, title: RankTitle]> = [
  [22000, 'Immortal Riff God'],
  [12000, 'Main Stage Shredder'],
  [5000, 'Mosh Pit Regular'],
  [0, 'Garage Roadie'],
]

/** Rank earned by a tournament score (max 35,000): <5,000, <12,000, <22,000, ≥22,000. */
export function getRankTitle(score: number): RankTitle {
  for (const [minScore, title] of RANKS) {
    if (score >= minScore) return title
  }
  return 'Garage Roadie'
}

// ---------- All-time records (localStorage) ----------

export const HIGH_SCORE_STORAGE_KEY = 'rmv:arena:high-score'
export const BEST_STREAK_STORAGE_KEY = 'rmv:arena:best-streak'

/** Parses a stored count; anything but a non-negative integer becomes 0. */
export function parseStoredCount(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw.trim())) return 0
  const value = Number(raw.trim())
  return Number.isSafeInteger(value) ? value : 0
}

export function loadArenaRecords(storage: Pick<Storage, 'getItem'> | null): ArenaRecords {
  const read = (key: string): number => {
    try {
      return parseStoredCount(storage?.getItem(key) ?? null)
    } catch {
      return 0
    }
  }
  return { highScore: read(HIGH_SCORE_STORAGE_KEY), bestStreak: read(BEST_STREAK_STORAGE_KEY) }
}

export function saveArenaRecords(
  storage: Pick<Storage, 'setItem'> | null,
  records: ArenaRecords,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(HIGH_SCORE_STORAGE_KEY, String(Math.max(0, Math.floor(records.highScore))))
    storage.setItem(BEST_STREAK_STORAGE_KEY, String(Math.max(0, Math.floor(records.bestStreak))))
    return true
  } catch {
    return false
  }
}

/** Records after a finished set: each one only ever goes up. */
export function mergeArenaRecords(records: ArenaRecords, set: TournamentSummary): ArenaRecords {
  return {
    highScore: Math.max(records.highScore, set.score),
    bestStreak: Math.max(records.bestStreak, set.bestStreak),
  }
}

// ---------- Head-to-Head ----------

const higherWins = (a: number, b: number): ComparisonWinner => (a > b ? 'a' : b > a ? 'b' : 'tie')

/**
 * Side-by-side rows for the Head-to-Head battle. Contests: the longer track wins Duration and
 * the earlier (more vintage) release wins Released. Style, origin, tuning and tempo are shown
 * for comparison only ('none').
 */
export function compareTracks(a: Track, b: Track): ComparisonRow[] {
  const riffA = getTrackRiffTab(a)
  const riffB = getTrackRiffTab(b)

  return [
    {
      label: 'Duration',
      valueA: formatDuration(a.durationMs),
      valueB: formatDuration(b.durationMs),
      winner: higherWins(a.durationMs, b.durationMs),
      winnerNote: 'Longer',
    },
    {
      label: 'Released',
      valueA: String(a.releaseYear ?? 'Unknown'),
      valueB: String(b.releaseYear ?? 'Unknown'),
      // Earlier year wins, so compare negated years.
      winner:
        a.releaseYear !== null && b.releaseYear !== null
          ? higherWins(-a.releaseYear, -b.releaseYear)
          : 'none',
      winnerNote: 'Vintage',
    },
    { label: 'Style', valueA: a.subgenre, valueB: b.subgenre, winner: 'none' },
    {
      label: 'Origin',
      valueA: `${a.originFlag} ${a.originCountry}`,
      valueB: `${b.originFlag} ${b.originCountry}`,
      winner: 'none',
    },
    { label: 'Guitar tuning', valueA: riffA.tuning, valueB: riffB.tuning, winner: 'none' },
    { label: 'Riff tempo', valueA: `≈ ${riffA.bpm} BPM`, valueB: `≈ ${riffB.bpm} BPM`, winner: 'none' },
  ]
}
