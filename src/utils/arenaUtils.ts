import type { BlindTestRound, BlindTestScore, ComparisonRow, ComparisonWinner, Track } from '../types/track'
import { getLeadArtistKey } from './artistMetadata'
import { getTrackRiffTab, normalizeTitleKey } from './riffTabs'
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

export interface BlindTestRoundOptions {
  random?: RandomSource
  /** Recently played answers to avoid repeating (ignored if it would leave nothing to play). */
  excludeIds?: ReadonlySet<number>
}

/** How plausible a decoy is next to the answer: same style counts most, then same country. */
const decoySimilarity = (answer: Track, candidate: Track): number =>
  (candidate.subgenre === answer.subgenre ? 2 : 0) +
  (candidate.originCountry === answer.originCountry ? 1 : 0)

/**
 * Builds a round: a random playable answer plus 3 realistic decoys — by different lead artists
 * (so exactly one option is right), with different titles, preferring the answer's style and
 * country — all 4 shuffled. Returns null when the catalog has fewer than 4 distinct artists.
 */
export function buildBlindTestRound(
  tracks: readonly Track[],
  { random = Math.random, excludeIds }: BlindTestRoundOptions = {},
): BlindTestRound | null {
  const playable = tracks.filter((track) => track.previewUrl !== '')
  const fresh = excludeIds ? playable.filter((track) => !excludeIds.has(track.id)) : playable
  const answer = pickRandomTrack(fresh.length > 0 ? fresh : playable, random)
  if (!answer) return null

  const usedArtists = new Set([getLeadArtistKey(answer.artist)])
  const usedTitles = new Set([normalizeTitleKey(answer.title)])

  // Shuffle first, then a stable sort by similarity: realistic decoys, random among equals.
  const candidates = shuffle(playable, random).sort(
    (a, b) => decoySimilarity(answer, b) - decoySimilarity(answer, a),
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

export const INITIAL_BLIND_TEST_SCORE: BlindTestScore = {
  score: 0,
  played: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
}

/** Next score after a guess: a miss resets the streak; the best streak only ever grows. */
export function applyGuess(
  current: BlindTestScore,
  isCorrect: boolean,
  points: number,
): BlindTestScore {
  const streak = isCorrect ? current.streak + 1 : 0
  return {
    score: current.score + (isCorrect ? points : 0),
    played: current.played + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
    streak,
    bestStreak: Math.max(current.bestStreak, streak),
  }
}

// ---------- Best streak persistence ----------

export const BEST_STREAK_STORAGE_KEY = 'rmv:arena:best-streak'

/** Parses a stored best streak; anything but a non-negative integer becomes 0. */
export function parseBestStreak(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw.trim())) return 0
  const value = Number(raw.trim())
  return Number.isSafeInteger(value) ? value : 0
}

export function loadBestStreak(storage: Pick<Storage, 'getItem'> | null): number {
  try {
    return parseBestStreak(storage?.getItem(BEST_STREAK_STORAGE_KEY) ?? null)
  } catch {
    return 0
  }
}

export function saveBestStreak(storage: Pick<Storage, 'setItem'> | null, bestStreak: number): boolean {
  if (!storage) return false
  try {
    storage.setItem(BEST_STREAK_STORAGE_KEY, String(Math.max(0, Math.floor(bestStreak))))
    return true
  } catch {
    return false
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
