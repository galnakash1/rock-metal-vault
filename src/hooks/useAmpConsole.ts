import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { EqPreset } from '../types/audio'
import { EQ_BANDS } from '../utils/audioUtils'

/**
 * - 'idle': nothing connected yet (the graph is built on the first Play click)
 * - 'active': audio flows through the EQ filters and analyser
 * - 'unavailable': Web Audio is missing or failed, so the plain <audio> element plays alone
 */
export type AmpEngineState = 'idle' | 'active' | 'unavailable'

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

const EQ_RAMP_SECONDS = 0.05

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext ?? null
}

function applyPreset(graph: AmpGraph, preset: EqPreset, immediate: boolean): void {
  const now = graph.context.currentTime
  const bands: ReadonlyArray<readonly [BiquadFilterNode, number]> = [
    [graph.bass, preset.bassDb],
    [graph.mid, preset.midDb],
    [graph.treble, preset.trebleDb],
  ]
  for (const [filter, gainDb] of bands) {
    // A short ramp avoids clicks and changes the sound without interrupting playback.
    if (immediate) filter.gain.setValueAtTime(gainDb, now)
    else filter.gain.setTargetAtTime(gainDb, now, EQ_RAMP_SECONDS)
  }
}

/**
 * Routes an <audio> element through a 3-band EQ (lowshelf → peaking → highshelf) and an
 * AnalyserNode. Call `connect()` from a user gesture (Play) before `audio.play()`.
 */
export function useAmpConsole(audioRef: RefObject<HTMLAudioElement | null>, preset: EqPreset) {
  const graphRef = useRef<AmpGraph | null>(null)
  const presetRef = useRef(preset)
  const [engine, setEngine] = useState<AmpEngineState>('idle')

  // Live EQ: retune the running filters whenever the preset changes.
  useEffect(() => {
    presetRef.current = preset
    if (graphRef.current) applyPreset(graphRef.current, preset, false)
  }, [preset])

  // Release the audio hardware when the player unmounts.
  useEffect(
    () => () => {
      const graph = graphRef.current
      graphRef.current = null
      if (graph) void graph.context.close()
    },
    [],
  )

  const connect = useCallback(async (): Promise<void> => {
    const existing = graphRef.current
    if (existing) {
      if (existing.context.state === 'suspended') await existing.context.resume()
      return
    }

    const audio = audioRef.current
    if (!audio) return
    const AudioContextConstructor = getAudioContextConstructor()
    if (!AudioContextConstructor) {
      setEngine('unavailable')
      return
    }

    try {
      const context = new AudioContextConstructor()
      // An element can only ever feed one source node, so the graph is built once per player.
      const source = context.createMediaElementSource(audio)

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

      const graph: AmpGraph = {
        context,
        bass,
        mid,
        treble,
        analyser,
        frequencyData: new Uint8Array(analyser.frequencyBinCount),
      }
      graphRef.current = graph
      applyPreset(graph, presetRef.current, true)

      if (context.state === 'suspended') await context.resume()
      setEngine('active')
    } catch {
      // Graceful fallback: keep playing the plain element without EQ or visualizer.
      setEngine('unavailable')
    }
  }, [audioRef])

  /** Current FFT levels (0–255 per bin), or null before the graph exists. */
  const readFrequencies = useCallback((): Uint8Array<ArrayBuffer> | null => {
    const graph = graphRef.current
    if (!graph) return null
    graph.analyser.getByteFrequencyData(graph.frequencyData)
    return graph.frequencyData
  }, [])

  return { engine, connect, readFrequencies }
}
