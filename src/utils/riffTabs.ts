import type {
  GuitarRiffTab,
  GuitarString,
  RiffDifficulty,
  RiffFamily,
  RiffStep,
} from '../types/riff'
import type { Subgenre, Track } from '../types/track'

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

/**
 * Renders fret steps as six aligned tab lines ("|-0-0-3-|"). Each column is as wide as
 * its widest fret number, so two-digit frets never break alignment.
 */
export function renderTab(steps: readonly RiffStep[]): Record<GuitarString, string> {
  const widths = steps.map((step) =>
    Math.max(1, ...GUITAR_STRINGS.map((string) => String(step[string] ?? '').length)),
  )
  const renderLine = (string: GuitarString): string =>
    '|-' +
    steps
      .map((step, index) => String(step[string] ?? '').padEnd(widths[index] ?? 1, '-') + '-')
      .join('') +
    '|'

  return {
    e: renderLine('e'),
    B: renderLine('B'),
    G: renderLine('G'),
    D: renderLine('D'),
    A: renderLine('A'),
    E: renderLine('E'),
  }
}

/**
 * Resolves a playable practice riff for any track, deterministically: the track's style picks
 * the tuning, difficulty and riff templates, and its id picks the template and tempo.
 * These are style-based practice riffs, not transcriptions of the recording.
 */
export function getTrackRiffTab(track: Pick<Track, 'id' | 'subgenre'>): GuitarRiffTab {
  const family = SUBGENRE_RIFF_FAMILIES[track.subgenre]
  const profile = RIFF_PROFILES[family]
  const seed = Math.abs(Math.trunc(track.id))
  const template = profile.templates[seed % profile.templates.length] ?? []
  const [minBpm, maxBpm] = profile.bpmRange

  return {
    title: `${track.subgenre} practice riff`,
    family,
    tuning: profile.tuning,
    bpm: minBpm + (seed % (maxBpm - minBpm + 1)),
    difficulty: profile.difficulty,
    lines: renderTab(template),
  }
}
