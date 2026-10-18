import { describe, expect, it } from 'vitest'
import {
  EQ_PRESETS,
  EQ_PRESET_IDS,
  RESTART_THRESHOLD_SECONDS,
  bucketFrequencies,
  formatQueuePosition,
  getQueueStep,
  getTrackIdFromPath,
  shouldShowMiniPlayer,
} from './audioUtils'

describe('EQ_PRESETS', () => {
  it('defines the four Amp Console presets in button order', () => {
    expect(EQ_PRESET_IDS.map((id) => EQ_PRESETS[id].label)).toEqual([
      'Flat',
      'Metalcore Scoop',
      'Classic Tube Amp',
      'Bass Drop',
    ])
    for (const id of EQ_PRESET_IDS) expect(EQ_PRESETS[id].id).toBe(id)
  })

  it('shapes each preset as described', () => {
    expect(EQ_PRESETS.flat).toMatchObject({ bassDb: 0, midDb: 0, trebleDb: 0 })
    const scoop = EQ_PRESETS['metalcore-scoop']
    expect(scoop.midDb).toBeLessThan(0)
    expect(scoop.bassDb).toBeGreaterThan(0)
    expect(scoop.trebleDb).toBeGreaterThan(0)
    expect(EQ_PRESETS['classic-tube-amp'].midDb).toBeGreaterThan(0)
    expect(EQ_PRESETS['classic-tube-amp'].trebleDb).toBeLessThan(0)
    const bassDrop = EQ_PRESETS['bass-drop']
    expect(bassDrop.bassDb).toBe(Math.max(...EQ_PRESET_IDS.map((id) => EQ_PRESETS[id].bassDb)))
  })
})

describe('bucketFrequencies', () => {
  it('averages bins into the requested number of bars, normalized to 0–1', () => {
    const data = Uint8Array.from([255, 255, 0, 0, 51, 153, 255, 255])
    expect(bucketFrequencies(data, 4, 1)).toEqual([1, 0, 0.4, 1])
  })

  it('ignores the near-silent top of the spectrum by default (lower 75% of bins)', () => {
    const data = Uint8Array.from([255, 255, 255, 0])
    expect(bucketFrequencies(data, 3)).toEqual([1, 1, 1])
  })

  it('handles silence, empty input and more bars than bins', () => {
    expect(bucketFrequencies(new Uint8Array(128), 32)).toEqual(Array.from({ length: 32 }, () => 0))
    expect(bucketFrequencies(new Uint8Array(0), 4)).toEqual([0, 0, 0, 0])
    expect(bucketFrequencies(Uint8Array.from([255, 0]), 4, 1)).toEqual([1, 1, 0, 0])
    expect(bucketFrequencies(Uint8Array.from([255]), 0)).toEqual([])
  })
})

describe('Now Playing mini-player visibility', () => {
  it('reads the track id from a detail route only', () => {
    expect(getTrackIdFromPath('/tracks/574050602')).toBe(574050602)
    expect(getTrackIdFromPath('/tracks/574050602/')).toBe(574050602)
    expect(getTrackIdFromPath('/tracks/abc')).toBeNull()
    expect(getTrackIdFromPath('/setlist')).toBeNull()
    expect(getTrackIdFromPath('/')).toBeNull()
  })

  it('shows on every route except the loaded track’s own detail page', () => {
    expect(shouldShowMiniPlayer(574050602, '/')).toBe(true)
    expect(shouldShowMiniPlayer(574050602, '/setlist')).toBe(true)
    expect(shouldShowMiniPlayer(574050602, '/tracks/785232521')).toBe(true) // another track
    expect(shouldShowMiniPlayer(574050602, '/tracks/574050602')).toBe(false)
    expect(shouldShowMiniPlayer(null, '/')).toBe(false) // nothing loaded
  })

  it('stays hidden during concealed Blind-Test playback so the answer is not revealed', () => {
    expect(shouldShowMiniPlayer(574050602, '/arena', true)).toBe(false)
    expect(shouldShowMiniPlayer(574050602, '/arena', false)).toBe(true)
  })
})

describe('playback queue', () => {
  it('advances with ⏭ and auto-advance until the last track', () => {
    expect(getQueueStep(7, 0, 'next')).toBe(1)
    expect(getQueueStep(7, 5, 'next')).toBe(6)
    expect(getQueueStep(7, 6, 'next')).toBeNull() // end of the lineup: stop
  })

  it('goes back with ⏮, or restarts the current song once it has played a few seconds', () => {
    expect(getQueueStep(7, 3, 'previous', 1)).toBe(2)
    expect(getQueueStep(7, 3, 'previous', RESTART_THRESHOLD_SECONDS + 0.5)).toBe('restart')
    expect(getQueueStep(7, 0, 'previous', 0)).toBe('restart') // first track: rewind
  })

  it('does nothing without a valid queue position', () => {
    expect(getQueueStep(0, 0, 'next')).toBeNull()
    expect(getQueueStep(5, null, 'next')).toBeNull()
    expect(getQueueStep(5, 9, 'previous')).toBeNull()
  })

  it('formats the queue position for the players', () => {
    expect(formatQueuePosition('Setlist', 1, 7)).toBe('Setlist 2 / 7')
    expect(formatQueuePosition('Setlist', 0, 1)).toBe('Setlist 1 / 1')
  })
})
