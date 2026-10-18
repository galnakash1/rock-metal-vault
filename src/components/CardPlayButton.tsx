import { togglePlay } from '../audio/playerEngine'
import { usePlayerSelector } from '../hooks/usePlayer'
import type { Track } from '../types/track'

export interface CardPlayButtonProps {
  track: Track
  /** Starts playback from this track (e.g. queue the current list starting here). */
  onPlay: (track: Track) => void
}

type CardPlayState = 'idle' | 'playing' | 'paused'

/**
 * Play/pause for one track card. It subscribes to a single derived value, so a playing preview
 * re-renders only the one or two buttons whose state actually changes — never the whole grid.
 */
function CardPlayButton({ track, onPlay }: CardPlayButtonProps) {
  const state = usePlayerSelector<CardPlayState>((player) =>
    player.track?.id === track.id && !player.concealed ? (player.isPlaying ? 'playing' : 'paused') : 'idle',
  )
  const title = `${track.title} by ${track.artist}`

  return (
    <button
      type="button"
      className={`card-play${state === 'playing' ? ' card-play--playing' : ''}`}
      aria-label={state === 'playing' ? `Pause ${title}` : `Play ${title}`}
      aria-pressed={state === 'playing'}
      onClick={() => {
        if (state === 'idle') onPlay(track)
        else void togglePlay(track)
      }}
    >
      <span aria-hidden="true">{state === 'playing' ? '❚❚' : '▶'}</span>
    </button>
  )
}

export default CardPlayButton
