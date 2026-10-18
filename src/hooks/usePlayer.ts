import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe, type PlayerSnapshot } from '../audio/playerEngine'

/**
 * Subscribes a component to the global preview player. Only components that call this
 * re-render on playback updates (the Amp Console, riff tab and mini-player) — not App.
 */
export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
