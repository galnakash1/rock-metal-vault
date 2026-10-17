import type {
  GuitarRiffTab,
  GuitarString,
  RiffDifficulty,
  RiffFamily,
  RiffStep,
  TabColumn,
} from '../types/riff'
import type { Subgenre, Track } from '../types/track'
import { normalizeArtistKey } from './artistMetadata'

/** Tab line order: highest string on top, lowest at the bottom. */
export const GUITAR_STRINGS: readonly GuitarString[] = ['e', 'B', 'G', 'D', 'A', 'E']

// ---------- Step builders ----------

/** Palm-muted chug on the lowest string. */
const chug = (fret = 0): RiffStep => ({ E: fret })
/** One-finger power chord (root, fifth, octave) — only works in drop tunings. */
const dropFive = (fret: number): RiffStep => ({ E: fret, A: fret, D: fret })
/** Standard-tuning power chord rooted on the low E string. */
const powerE = (fret: number): RiffStep => ({ E: fret, A: fret + 2, D: fret + 2 })
/** Standard-tuning power chord rooted on the A string. */
const powerA = (fret: number): RiffStep => ({ A: fret, D: fret + 2, G: fret + 2 })
const note = (string: GuitarString, fret: number): RiffStep => ({ [string]: fret })

// ---------- Style profiles ----------

interface RiffProfile {
  tuning: string
  bpmRange: readonly [min: number, max: number]
  difficulty: RiffDifficulty
  templates: ReadonlyArray<readonly RiffStep[]>
}

export const RIFF_PROFILES: Record<RiffFamily, RiffProfile> = {
  metalcore: {
    tuning: 'Drop C (C G C F A D)',
    bpmRange: [140, 180],
    difficulty: 'Intermediate',
    templates: [
      [chug(), chug(), chug(), chug(), dropFive(3), chug(), chug(), dropFive(5), chug(), chug(), dropFive(6), dropFive(5)],
      [chug(), dropFive(8), dropFive(7), chug(), chug(), dropFive(5), dropFive(3), chug(), chug(), dropFive(1), chug(), chug()],
    ],
  },
  'nu-metal': {
    tuning: 'Drop B (B F# B E G# C#)',
    bpmRange: [90, 120],
    difficulty: 'Beginner',
    templates: [
      [chug(), chug(), dropFive(1), chug(), chug(), dropFive(3), dropFive(1), chug(), chug(), chug(), dropFive(5), dropFive(3)],
      [chug(), chug(), dropFive(6), dropFive(5), chug(), chug(), dropFive(3), dropFive(1), chug(), dropFive(1), dropFive(3), chug()],
    ],
  },
  'alt-metal': {
    tuning: 'Drop D (D A D G B E)',
    bpmRange: [100, 140],
    difficulty: 'Intermediate',
    templates: [
      [dropFive(0), dropFive(0), dropFive(3), dropFive(5), dropFive(0), dropFive(0), dropFive(7), dropFive(5)],
      [chug(), chug(), dropFive(5), chug(), chug(), dropFive(3), note('G', 2), note('G', 4), chug(), dropFive(1)],
    ],
  },
  thrash: {
    tuning: 'E Standard (E A D G B E)',
    bpmRange: [180, 220],
    difficulty: 'Advanced',
    templates: [
      [chug(), chug(), chug(1), chug(), chug(), chug(2), chug(), chug(), chug(3), chug(2), chug(1), powerE(0)],
      [chug(), chug(), powerE(5), chug(), chug(), powerE(6), chug(), chug(), powerE(8), powerE(7), powerE(5), chug()],
    ],
  },
  'heavy-metal': {
    tuning: 'E Standard (E A D G B E)',
    bpmRange: [140, 180],
    difficulty: 'Intermediate',
    templates: [
      [chug(), chug(), chug(), powerE(3), chug(), chug(), chug(), powerE(5), chug(), chug(), chug(), powerA(5)],
      [powerE(0), powerE(3), powerE(5), powerE(0), powerE(3), powerE(6), powerE(5), chug()],
    ],
  },
  progressive: {
    tuning: 'Drop D (D A D G B E)',
    bpmRange: [110, 150],
    difficulty: 'Advanced',
    templates: [
      [dropFive(0), note('G', 2), note('B', 3), note('e', 2), dropFive(0), note('G', 4), note('B', 5), note('e', 5), dropFive(3), note('G', 5), note('B', 7)],
      [note('A', 0), note('D', 2), note('G', 4), note('D', 2), note('A', 3), note('D', 5), note('G', 7), note('D', 5), dropFive(5), dropFive(7)],
    ],
  },
  'hard-rock': {
    tuning: 'E Standard (E A D G B E)',
    bpmRange: [110, 140],
    difficulty: 'Intermediate',
    templates: [
      [powerA(0), powerA(0), powerE(3), powerE(5), powerA(0), powerA(0), powerE(3), powerE(2)],
      [powerE(0), powerE(0), powerA(0), powerA(2), powerE(0), powerE(0), powerA(3), powerA(2), powerA(0)],
    ],
  },
  'classic-rock': {
    tuning: 'E Standard (E A D G B E)',
    bpmRange: [90, 130],
    difficulty: 'Beginner',
    templates: [
      [powerE(5), powerE(5), powerE(8), powerE(10), powerE(5), powerE(8), powerE(11), powerE(10)],
      [powerA(0), powerA(0), powerA(2), powerA(3), powerA(2), powerA(0), powerE(3), powerE(5)],
    ],
  },
  punk: {
    tuning: 'E Standard (E A D G B E)',
    bpmRange: [160, 200],
    difficulty: 'Beginner',
    templates: [
      [powerE(3), powerE(3), powerE(3), powerE(3), powerA(3), powerA(3), powerA(5), powerA(5)],
      [powerE(0), powerE(0), powerE(5), powerE(5), powerE(3), powerE(3), powerE(7), powerE(7)],
    ],
  },
  grunge: {
    tuning: 'Drop D (D A D G B E)',
    bpmRange: [90, 120],
    difficulty: 'Beginner',
    templates: [
      [dropFive(0), dropFive(0), dropFive(3), dropFive(5), dropFive(0), dropFive(7), dropFive(5), dropFive(3)],
      [chug(), chug(), dropFive(1), dropFive(3), chug(), chug(), dropFive(5), dropFive(3)],
    ],
  },
}

export const SUBGENRE_RIFF_FAMILIES: Record<Subgenre, RiffFamily> = {
  Metalcore: 'metalcore',
  'Post-Hardcore': 'metalcore',
  'Nu Metal': 'nu-metal',
  'Rap Metal': 'nu-metal',
  'Industrial Metal': 'nu-metal',
  'Alternative Metal': 'alt-metal',
  'Groove Metal': 'alt-metal',
  'Thrash Metal': 'thrash',
  'Melodic Death Metal': 'thrash',
  'Power Metal': 'thrash',
  'Heavy Metal': 'heavy-metal',
  'Symphonic Metal': 'heavy-metal',
  'Progressive Metal': 'progressive',
  'Progressive Rock': 'progressive',
  'Hard Rock': 'hard-rock',
  'Stoner Rock': 'hard-rock',
  'Funk Rock': 'hard-rock',
  'Alternative Rock': 'hard-rock',
  'Post-Grunge': 'hard-rock',
  Rock: 'hard-rock',
  'Classic Rock': 'classic-rock',
  'Gothic Rock': 'classic-rock',
  'Punk Rock': 'punk',
  Emo: 'punk',
  Grunge: 'grunge',
}

// ---------- Rendering ----------

/** Splits steps into padded columns: each column is as wide as its widest fret number. */
export function getTabColumns(steps: readonly RiffStep[]): TabColumn[] {
  return steps.map((step) => {
    const width = Math.max(1, ...GUITAR_STRINGS.map((string) => String(step[string] ?? '').length))
    const cell = (string: GuitarString): string => String(step[string] ?? '').padEnd(width, '-')
    return {
      width,
      cells: { e: cell('e'), B: cell('B'), G: cell('G'), D: cell('D'), A: cell('A'), E: cell('E') },
    }
  })
}

/**
 * Renders fret steps as six aligned tab lines ("|-0-0-3-|"). Columns are padded to their
 * widest fret, so two-digit frets never break alignment.
 */
export function renderTab(steps: readonly RiffStep[]): Record<GuitarString, string> {
  const columns = getTabColumns(steps)
  const renderLine = (string: GuitarString): string =>
    '|-' + columns.map((column) => `${column.cells[string]}-`).join('') + '|'

  return {
    e: renderLine('e'),
    B: renderLine('B'),
    G: renderLine('G'),
    D: renderLine('D'),
    A: renderLine('A'),
    E: renderLine('E'),
  }
}

// ---------- Signature riffs ----------

interface SignatureRiff {
  artist: string
  title: string
  tuning: string
  bpm: number // approximate
  stepsPerBeat?: number // defaults to 2 (eighth notes)
  difficulty: RiffDifficulty
  steps: readonly RiffStep[]
}

const STANDARD = 'E Standard (E A D G B E)'

/**
 * Simplified transcriptions of a few famous opening riffs. Only riffs we can tab reliably
 * are listed; every other track keeps its style-based practice riff.
 */
export const SIGNATURE_RIFFS: readonly SignatureRiff[] = [
  {
    artist: 'Black Sabbath',
    title: 'Iron Man',
    tuning: STANDARD,
    bpm: 76,
    difficulty: 'Beginner',
    // B5 D5 D5 E5 E5 G5 F#5 G5 F#5 G5 D5 D5 E5 E5
    steps: [7, 10, 10, 12, 12, 15, 14, 15, 14, 15, 10, 10, 12, 12].map(powerE),
  },
  {
    artist: 'AC/DC',
    title: 'Back In Black',
    tuning: STANDARD,
    bpm: 94,
    difficulty: 'Intermediate',
    // Opening chord hits: E5 – D/F# – A/C#
    steps: [powerE(0), powerE(0), { E: 2, A: 0, D: 0 }, { A: 4, D: 2 }],
  },
  {
    artist: 'Deep Purple',
    title: 'Smoke On the Water',
    tuning: STANDARD,
    bpm: 112,
    difficulty: 'Beginner',
    // Fourths on the D and G strings: G Bb C · G Bb Db C · G Bb C Bb G
    steps: [0, 3, 5, 0, 3, 6, 5, 0, 3, 5, 3, 0].map((fret) => ({ D: fret, G: fret })),
  },
  {
    artist: 'Nirvana',
    title: 'Smells Like Teen Spirit',
    tuning: STANDARD,
    bpm: 117,
    difficulty: 'Beginner',
    // F5 Bb5 Ab5 Db5
    steps: [powerE(1), powerE(1), powerA(1), powerA(1), powerE(4), powerE(4), powerA(4), powerA(4)],
  },
  {
    artist: "Guns N' Roses",
    title: "Sweet Child O' Mine",
    tuning: 'E♭ Standard (half step down)',
    bpm: 125,
    stepsPerBeat: 4,
    difficulty: 'Intermediate',
    steps: [
      note('D', 12),
      note('B', 15),
      note('G', 14),
      note('G', 12),
      note('e', 15),
      note('G', 14),
      note('e', 14),
      note('G', 14),
    ],
  },
  {
    artist: 'Ozzy Osbourne',
    title: 'Crazy Train',
    tuning: STANDARD,
    bpm: 138,
    stepsPerBeat: 4,
    difficulty: 'Intermediate',
    // F# F# C# F# D F# C# F# · B A G# A B A G# E
    steps: [
      chug(2), chug(2), note('A', 4), chug(2), note('A', 5), chug(2), note('A', 4), chug(2),
      note('A', 2), note('A', 0), chug(4), note('A', 0), note('A', 2), note('A', 0), chug(4), chug(0),
    ],
  },
  {
    artist: 'Metallica',
    title: 'Nothing Else Matters',
    tuning: STANDARD,
    bpm: 46,
    stepsPerBeat: 3,
    difficulty: 'Beginner',
    // Open-string E minor arpeggio: E G B e B G
    steps: [chug(0), note('G', 0), note('B', 0), note('e', 0), note('B', 0), note('G', 0)],
  },
]

/** Lowercases a title and strips "(2015 Remaster)", "[Live]" and " - Remastered" style suffixes. */
export function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s*[([][^)\]]*[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const signatureKey = (artist: string, title: string): string =>
  `${normalizeArtistKey(artist)}|${normalizeTitleKey(title)}`

const SIGNATURE_RIFF_INDEX: ReadonlyMap<string, SignatureRiff> = new Map(
  SIGNATURE_RIFFS.map((riff) => [signatureKey(riff.artist, riff.title), riff]),
)

/** The curated signature riff for a track, or null when it isn't one of the listed songs. */
export function findSignatureRiff(track: Pick<Track, 'artist' | 'title'>): SignatureRiff | null {
  return SIGNATURE_RIFF_INDEX.get(signatureKey(track.artist, track.title)) ?? null
}

// ---------- Resolver ----------

const DEFAULT_STEPS_PER_BEAT = 2

/**
 * Resolves a playable riff for any track, deterministically:
 * - listed iconic songs get their simplified signature riff (kind 'signature');
 * - everything else gets a practice riff for its style (kind 'practice'): the style picks the
 *   tuning, difficulty and templates, and the track id picks the template and tempo.
 */
export function getTrackRiffTab(
  track: Pick<Track, 'id' | 'subgenre' | 'artist' | 'title'>,
): GuitarRiffTab {
  const family = SUBGENRE_RIFF_FAMILIES[track.subgenre]
  const signature = findSignatureRiff(track)

  if (signature) {
    return {
      kind: 'signature',
      title: `${signature.title} — signature riff`,
      family,
      tuning: signature.tuning,
      bpm: signature.bpm,
      stepsPerBeat: signature.stepsPerBeat ?? DEFAULT_STEPS_PER_BEAT,
      difficulty: signature.difficulty,
      columns: getTabColumns(signature.steps),
      lines: renderTab(signature.steps),
    }
  }

  const profile = RIFF_PROFILES[family]
  const seed = Math.abs(Math.trunc(track.id))
  const template = profile.templates[seed % profile.templates.length] ?? []
  const [minBpm, maxBpm] = profile.bpmRange

  return {
    kind: 'practice',
    title: `${track.subgenre} practice riff`,
    family,
    tuning: profile.tuning,
    bpm: minBpm + (seed % (maxBpm - minBpm + 1)),
    stepsPerBeat: DEFAULT_STEPS_PER_BEAT,
    difficulty: profile.difficulty,
    columns: getTabColumns(template),
    lines: renderTab(template),
  }
}

/**
 * Which tab column the playhead is on after `elapsedSec` of playback, looping the riff at
 * `bpm` with `stepsPerBeat` columns per beat. Returns null when there is nothing to highlight.
 */
export function getRiffPlayheadIndex(
  elapsedSec: number,
  bpm: number,
  stepCount: number,
  stepsPerBeat = DEFAULT_STEPS_PER_BEAT,
): number | null {
  if (stepCount <= 0 || bpm <= 0 || stepsPerBeat <= 0 || !Number.isFinite(elapsedSec)) return null
  const step = Math.floor((Math.max(elapsedSec, 0) * bpm * stepsPerBeat) / 60)
  return step % stepCount
}
