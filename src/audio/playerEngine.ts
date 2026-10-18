import type { EqPresetId } from '../types/audio'
import type { Track } from '../types/track'
import { EQ_BANDS, EQ_PRESETS } from '../utils/audioUtils'

/**
 * The app-wide preview player. One <audio> element and one Web Audio graph live here, outside
 * React, so playback keeps going while routes mount and unmount. Components read the state with
 * `usePlayer()` (useSyncExternalStore) and call the exported actions.
 *
 * Graph: <audio crossOrigin="anonymous"> → lowshelf → peaking → highshelf → analyser → speakers
 */

/**
 * - 'idle': nothing connected yet (the graph is built on the first Play click)
 * - 'active': audio flows through the EQ filters and analyser
 * - 'unavailable': Web Audio is missing or failed, so the plain <audio> element plays alone
 */
export type AmpEngineState = 'idle' | 'active' | 'unavailable'

export interface PlayerSnapshot {
  track: Track | null // the loaded preview (playing or paused), null when stopped
  /** True for Blind-Test playback: the answer must not be revealed (e.g. by the mini-player). */
  concealed: boolean
  isPlaying: boolean
  currentTime: number // seconds
  duration: number // seconds
  presetId: EqPresetId
  engine: AmpEngineState
  error: string | null
}

interface AmpGraph {
  context: AudioContext
  bass: BiquadFilterNode
  mid: BiquadFilterNode
  treble: BiquadFilterNode
  analyser: AnalyserNode
  frequencyData: Uint8Array<ArrayBuffer>
}

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

const PREVIEW_SECONDS = 30 // iTunes previews are 30s; replaced by the real duration once known
const EQ_RAMP_SECONDS = 0.05
const MIN_TIME_STEP = 1 / 30 // don't notify subscribers for sub-frame time changes

// ---------- Store ----------

let snapshot: PlayerSnapshot = {
  track: null,
  concealed: false,
  isPlaying: false,
  currentTime: 0,
  duration: PREVIEW_SECONDS,
  presetId: 'flat',
  engine: 'idle',
  error: null,
}
const listeners = new Set<() => void>()

function update(patch: Partial<PlayerSnapshot>): void {
  snapshot = { ...snapshot, ...patch }
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): PlayerSnapshot {
  return snapshot
}

// ---------- Audio element & progress ticker ----------

let audio: HTMLAudioElement | null = null
let graph: AmpGraph | null = null
let frameId: number | null = null

function stopTicker(): void {
  if (frameId !== null) cancelAnimationFrame(frameId)
  frameId = null
}

/** Follows the playhead every animation frame while playing (smooth riff-tab highlight). */
function startTicker(element: HTMLAudioElement): void {
  stopTicker()
  const tick = () => {
    if (Math.abs(element.currentTime - snapshot.currentTime) >= MIN_TIME_STEP) {
      update({ currentTime: element.currentTime })
    }
    frameId = requestAnimationFrame(tick)
  }
  frameId = requestAnimationFrame(tick)
}

/** Created lazily on first use, so importing this module never touches the DOM (tests, SSR). */
function getAudio(): HTMLAudioElement {
  if (audio) return audio
  const element = new Audio()
  element.crossOrigin = 'anonymous' // Apple sends CORS headers, so the analyser gets real data
  element.preload = 'metadata'

  element.addEventListener('play', () => {
    update({ isPlaying: true, error: null })
    startTicker(element)
  })
  const settle = () => {
    stopTicker()
    update({ isPlaying: false, currentTime: element.currentTime })
  }
  element.addEventListener('pause', settle)
  element.addEventListener('ended', settle)
  element.addEventListener('seeked', () => update({ currentTime: element.currentTime }))
  element.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(element.duration) && element.duration > 0) {
      update({ duration: element.duration })
    }
  })
  element.addEventListener('error', () => {
    if (snapshot.track) update({ isPlaying: false, error: 'This preview is unavailable right now.' })
  })

  audio = element
  return element
}

// ---------- Web Audio graph ----------

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext ?? null
}

function applyPreset(target: AmpGraph, presetId: EqPresetId, immediate: boolean): void {
  const preset = EQ_PRESETS[presetId]
  const now = target.context.currentTime
  const bands: ReadonlyArray<readonly [BiquadFilterNode, number]> = [
    [target.bass, preset.bassDb],
    [target.mid, preset.midDb],
    [target.treble, preset.trebleDb],
  ]
  for (const [filter, gainDb] of bands) {
    // A short ramp avoids clicks and changes the sound without interrupting playback.
    if (immediate) filter.gain.setValueAtTime(gainDb, now)
    else filter.gain.setTargetAtTime(gainDb, now, EQ_RAMP_SECONDS)
  }
}

/**
 * Builds the EQ + analyser graph once for the shared element (an element can only ever feed
 * one MediaElementAudioSourceNode). Must run inside a user gesture (Play) so the browser lets
 * the AudioContext start. Falls back to plain playback if Web Audio is missing or fails.
 */
async function ensureGraph(element: HTMLAudioElement): Promise<void> {
  if (graph) {
    if (graph.context.state === 'suspended') await graph.context.resume()
    return
  }
  if (snapshot.engine === 'unavailable') return

  const AudioContextConstructor = getAudioContextConstructor()
  if (!AudioContextConstructor) {
    update({ engine: 'unavailable' })
    return
  }

  try {
    const context = new AudioContextConstructor()
    const source = context.createMediaElementSource(element)

    const bass = context.createBiquadFilter()
    bass.type = EQ_BANDS.bass.type
    bass.frequency.value = EQ_BANDS.bass.frequency

    const mid = context.createBiquadFilter()
    mid.type = EQ_BANDS.mid.type
    mid.frequency.value = EQ_BANDS.mid.frequency
    mid.Q.value = EQ_BANDS.mid.q

    const treble = context.createBiquadFilter()
    treble.type = EQ_BANDS.treble.type
    treble.frequency.value = EQ_BANDS.treble.frequency

    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    source.connect(bass)
    bass.connect(mid)
    mid.connect(treble)
    treble.connect(analyser)
    analyser.connect(context.destination)

    graph = {
      context,
      bass,
      mid,
      treble,
      analyser,
      frequencyData: new Uint8Array(analyser.frequencyBinCount),
    }
    applyPreset(graph, snapshot.presetId, true)
    if (context.state === 'suspended') await context.resume()
    update({ engine: 'active' })
  } catch {
    update({ engine: 'unavailable' })
  }
}

// ---------- Actions ----------

export interface PlayOptions {
  /** Hide what's playing from the UI (Blind-Test rounds). */
  concealed?: boolean
}

/** Loads (if needed) and plays a track's preview. Switching tracks replaces the current one. */
export async function playTrack(track: Track, { concealed = false }: PlayOptions = {}): Promise<void> {
  const element = getAudio()
  if (snapshot.track?.id !== track.id) {
    element.src = track.previewUrl
    update({ track, concealed, isPlaying: false, currentTime: 0, duration: PREVIEW_SECONDS, error: null })
  } else if (snapshot.concealed !== concealed) {
    update({ concealed })
  }
  await ensureGraph(element)
  try {
    await element.play()
  } catch (error) {
    // AbortError just means a newer play/load interrupted this one.
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      update({ isPlaying: false, error: 'The preview could not start. Try again in a moment.' })
    }
  }
}

export function pause(): void {
  audio?.pause()
}

/** Play/pause for `track` (visible playback): resumes or pauses it if loaded, otherwise starts it. */
export function togglePlay(track: Track): Promise<void> {
  if (snapshot.track?.id === track.id && snapshot.isPlaying) {
    pause()
    return Promise.resolve()
  }
  return playTrack(track)
}

/** Seeks the loaded preview (clamped to its length). */
export function seek(seconds: number): void {
  if (!audio || !snapshot.track) return
  const clamped = Math.min(Math.max(seconds, 0), snapshot.duration)
  audio.currentTime = clamped
  update({ currentTime: clamped })
}

/** Stops playback and unloads the preview (closes the mini-player). */
export function stop(): void {
  stopTicker()
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  update({
    track: null,
    concealed: false,
    isPlaying: false,
    currentTime: 0,
    duration: PREVIEW_SECONDS,
    error: null,
  })
}

/** Switches the EQ preset; a playing preview changes sound immediately, without restarting. */
export function setPreset(presetId: EqPresetId): void {
  update({ presetId })
  if (graph) applyPreset(graph, presetId, false)
}

/** Current FFT levels (0–255 per bin), or null before the Web Audio graph exists. */
export function readFrequencies(): Uint8Array<ArrayBuffer> | null {
  if (!graph) return null
  graph.analyser.getByteFrequencyData(graph.frequencyData)
  return graph.frequencyData
}
