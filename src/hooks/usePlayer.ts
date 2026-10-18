import { useSyncExternalStore } from 'react'
import { getSnapshot, subscribe, type PlayerSnapshot } from '../audio/playerEngine'

/**
 * Subscribes a component to the global preview player. Only components that call this
 * re-render on playback updates (the Amp Console, riff tab and mini-player) — not App.
 */
export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Subscribes to one derived value of the player (e.g. "is this card's track playing?"). The
 * component re-renders only when that value changes, so return a primitive — not a new object.
 */
export function usePlayerSelector<T extends string | number | boolean | null>(
  selector: (snapshot: PlayerSnapshot) => T,
): T {
  const select = () => selector(getSnapshot())
  return useSyncExternalStore(subscribe, select, select)
}
