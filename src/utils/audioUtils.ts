import type { EqPreset, EqPresetId } from '../types/audio'

// ---------- EQ ----------

/** Filter settings for the three Amp Console bands (BiquadFilterNode type, frequency in Hz). */
export const EQ_BANDS = {
  bass: { type: 'lowshelf', frequency: 120 },
  mid: { type: 'peaking', frequency: 900, q: 1 },
  treble: { type: 'highshelf', frequency: 4500 },
} as const

/** Display order of the preset buttons. */
export const EQ_PRESET_IDS: readonly EqPresetId[] = [
  'flat',
  'metalcore-scoop',
  'classic-tube-amp',
  'bass-drop',
]

/** Narrows a string (e.g. a <select> value) to a known EQ preset id. */
export function isEqPresetId(value: string): value is EqPresetId {
  return (EQ_PRESET_IDS as readonly string[]).includes(value)
}

export const EQ_PRESETS: Record<EqPresetId, EqPreset> = {
  flat: {
    id: 'flat',
    label: 'Flat',
    description: 'The preview exactly as released',
    bassDb: 0,
    midDb: 0,
    trebleDb: 0,
  },
  'metalcore-scoop': {
    id: 'metalcore-scoop',
    label: 'Metalcore Scoop',
    description: 'Boosted lows and highs with scooped mids',
    bassDb: 5,
    midDb: -6,
    trebleDb: 4,
  },
  'classic-tube-amp': {
    id: 'classic-tube-amp',
    label: 'Classic Tube Amp',
    description: 'Warm mid push with softened highs',
    bassDb: 2,
    midDb: 4,
    trebleDb: -2,
  },
  'bass-drop': {
    id: 'bass-drop',
    label: 'Bass Drop',
    description: 'Heavy low-end boost',
    bassDb: 9,
    midDb: -2,
    trebleDb: -1,
  },
}

// ---------- Visualizer ----------

/**
 * Reduces analyser FFT data (0–255 per bin) to `bars` averaged levels between 0 and 1.
 * Only the lower `usableFraction` of bins is used: the top of a 30s preview's spectrum
 * is nearly silent, so including it would leave the right-hand bars permanently flat.
 */
export function bucketFrequencies(
  data: ArrayLike<number>,
  bars: number,
  usableFraction = 0.75,
): number[] {
  if (bars <= 0) return []
  const usable = Math.floor(data.length * Math.min(Math.max(usableFraction, 0), 1))

  return Array.from({ length: bars }, (_, bar) => {
    const start = Math.floor((bar * usable) / bars)
    const end = Math.max(start + 1, Math.floor(((bar + 1) * usable) / bars))
    let sum = 0
    let count = 0
    for (let index = start; index < end && index < usable; index += 1) {
      sum += data[index] ?? 0
      count += 1
    }
    return count === 0 ? 0 : sum / count / 255
  })
}

// ---------- Now Playing mini-player ----------

/** The track id in a `/tracks/:id` path, or null on any other route. */
export function getTrackIdFromPath(pathname: string): number | null {
  const match = /^\/tracks\/(\d+)\/?$/.exec(pathname)
  return match ? Number(match[1]) : null
}

/**
 * The mini-player shows whenever a preview is loaded (playing or paused), except on that
 * track's own detail page (the full Amp Console already controls it) and for concealed
 * Blind-Test playback (showing the title would give the answer away).
 */
export function shouldShowMiniPlayer(
  loadedTrackId: number | null,
  pathname: string,
  concealed = false,
): boolean {
  return !concealed && loadedTrackId !== null && getTrackIdFromPath(pathname) !== loadedTrackId
}

// ---------- Playback queue ----------

export type QueueDirection = 'next' | 'previous'

/** Past this point, ⏮ restarts the current song instead of going back (like most players). */
export const RESTART_THRESHOLD_SECONDS = 3

/**
 * Where a ⏭ / ⏮ press (or auto-advance) goes in a queue of `length` tracks:
 * a queue index, 'restart' to rewind the current track, or null when there's nowhere to go.
 */
export function getQueueStep(
  length: number,
  index: number | null,
  direction: QueueDirection,
  currentTimeSec = 0,
): number | 'restart' | null {
  if (index === null || length <= 0 || index < 0 || index >= length) return null
  if (direction === 'next') return index + 1 < length ? index + 1 : null
  if (currentTimeSec > RESTART_THRESHOLD_SECONDS || index === 0) return 'restart'
  return index - 1
}

/** "Setlist 2 / 7" — shown in the mini-player and on the detail page while a queue is active. */
export function formatQueuePosition(label: string, index: number, length: number): string {
  return `${label} ${index + 1} / ${length}`
}
