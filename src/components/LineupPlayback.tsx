import { pause, playQueue, togglePlay } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import type { Track } from '../types/track'
import { SETLIST_QUEUE_LABEL } from '../utils/setlistUtils'

/** True while the active queue is this festival lineup (not a single track or another queue). */
function useIsLineupQueue(): boolean {
  const player = usePlayer()
  return player.queueLabel === SETLIST_QUEUE_LABEL && player.queue.length > 0 && !player.concealed
}

export interface LineupPlayButtonProps {
  setlist: Track[]
}

/** "▶ Play Full Festival Lineup": queues the whole running order, or pauses/resumes it. */
export function LineupPlayButton({ setlist }: LineupPlayButtonProps) {
  const player = usePlayer()
  const isLineup = useIsLineupQueue()
  const isPlaying = isLineup && player.isPlaying

  const handleClick = () => {
    if (isPlaying) pause()
    else if (isLineup && player.track) void togglePlay(player.track)
    else void playQueue(setlist, 0, SETLIST_QUEUE_LABEL)
  }

  return (
    <button
      type="button"
      className={`button button--large lineup-play${isPlaying ? ' lineup-play--playing' : ''}`}
      onClick={handleClick}
    >
      <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>{' '}
      {isPlaying ? 'Pause Festival Lineup' : isLineup ? 'Resume Festival Lineup' : 'Play Full Festival Lineup'}
    </button>
  )
}

export interface RowPlayButtonProps {
  setlist: Track[]
  index: number
}

/** Play/pause for one running-order row; starts the lineup queue from this track. */
export function RowPlayButton({ setlist, index }: RowPlayButtonProps) {
  const player = usePlayer()
  const track = setlist[index]
  if (!track) return null

  const isCurrent = !player.concealed && player.track?.id === track.id
  const isPlaying = isCurrent && player.isPlaying

  const handleClick = () => {
    if (isPlaying) pause()
    else if (isCurrent) void togglePlay(track)
    else void playQueue(setlist, index, SETLIST_QUEUE_LABEL)
  }

  return (
    <button
      type="button"
      className="row-play"
      data-state={isPlaying ? 'playing' : isCurrent ? 'paused' : 'idle'}
      onClick={handleClick}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
    >
      {isPlaying ? (
        <span className="eq-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      ) : (
        <span aria-hidden="true">▶</span>
      )}
    </button>
  )
}
