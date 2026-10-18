import { pause, playQueue, togglePlay } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import type { Track } from '../types/track'
import { SETLIST_QUEUE_LABEL } from '../utils/setlistUtils'

/** True while the active queue is this list (not a single track or another queue). */
function useIsListQueue(queueLabel: string): boolean {
  const player = usePlayer()
  return player.queueLabel === queueLabel && player.queue.length > 0 && !player.concealed
}

export interface LineupPlayButtonProps {
  setlist: Track[]
  /** Queue name shown in the players ("Setlist", "Playlist"). */
  queueLabel?: string
  /** What the button plays, e.g. "Festival Lineup" → "Pause Festival Lineup". */
  noun?: string
  /** Label before anything plays. */
  playLabel?: string
}

/** "▶ Play Full Festival Lineup": queues the whole list, or pauses/resumes it. */
export function LineupPlayButton({
  setlist,
  queueLabel = SETLIST_QUEUE_LABEL,
  noun = 'Festival Lineup',
  playLabel = `Play Full ${noun}`,
}: LineupPlayButtonProps) {
  const player = usePlayer()
  const isLineup = useIsListQueue(queueLabel)
  const isPlaying = isLineup && player.isPlaying

  const handleClick = () => {
    if (isPlaying) pause()
    else if (isLineup && player.track) void togglePlay(player.track)
    else void playQueue(setlist, 0, queueLabel)
  }

  return (
    <button
      type="button"
      className={`button button--large lineup-play${isPlaying ? ' lineup-play--playing' : ''}`}
      onClick={handleClick}
    >
      <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>{' '}
      {isPlaying ? `Pause ${noun}` : isLineup ? `Resume ${noun}` : playLabel}
    </button>
  )
}

export interface RowPlayButtonProps {
  setlist: Track[]
  index: number
  queueLabel?: string
}

/** Play/pause for one running-order row; starts the list's queue from this track. */
export function RowPlayButton({ setlist, index, queueLabel = SETLIST_QUEUE_LABEL }: RowPlayButtonProps) {
  const player = usePlayer()
  const track = setlist[index]
  if (!track) return null

  const isCurrent = !player.concealed && player.track?.id === track.id
  const isPlaying = isCurrent && player.isPlaying

  const handleClick = () => {
    if (isPlaying) pause()
    else if (isCurrent) void togglePlay(track)
    else void playQueue(setlist, index, queueLabel)
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
