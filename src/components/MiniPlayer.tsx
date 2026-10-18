import { Link, useLocation } from 'react-router-dom'
import { nextTrack, previousTrack, stop, togglePlay } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import { EQ_PRESETS, formatQueuePosition, shouldShowMiniPlayer } from '../utils/audioUtils'
import { formatDuration } from '../utils/trackUtils'

/**
 * Now Playing bar: keeps a loaded preview controllable from every route except that track's own
 * detail page (where the full Amp Console takes over the same playback).
 */
function MiniPlayer() {
  const { pathname } = useLocation()
  const player = usePlayer()
  const { track } = player

  if (!track || !shouldShowMiniPlayer(track.id, pathname, player.concealed)) return null

  const progress = player.duration > 0 ? Math.min(player.currentTime / player.duration, 1) : 0
  const detailPath = `/tracks/${track.id}`
  const queuePosition =
    player.queue.length > 1 && player.queueIndex !== null
      ? formatQueuePosition(player.queueLabel ?? 'Queue', player.queueIndex, player.queue.length)
      : null
  const isLastInQueue = player.queueIndex !== null && player.queueIndex >= player.queue.length - 1

  return (
    <>
      {/* Reserves room at the bottom so the fixed bar never covers page content. */}
      <div className="mini-player-spacer" aria-hidden="true" />
      <aside className="mini-player" aria-label="Now playing">
        <div
          className="mini-player-progress"
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden="true"
        />
        <Link to={detailPath} className="mini-player-track" title="Open in the Amp Console">
          <img className="mini-player-art" src={track.artworkUrl} alt="" width={48} height={48} />
          <span className="mini-player-text">
            <span className="mini-player-title">{track.title}</span>
            <span className="mini-player-artist">
              {track.artist} · <span aria-hidden="true">{track.originFlag}</span>{' '}
              {track.originCountry}
            </span>
          </span>
        </Link>

        {queuePosition && (
          <span className="mini-player-queue" aria-label={`Playing ${queuePosition}`}>
            {queuePosition}
          </span>
        )}
        <span className="mini-player-eq" title="Current EQ preset">
          EQ · {EQ_PRESETS[player.presetId].label}
        </span>
        <span className="mini-player-time">
          {formatDuration(player.currentTime * 1000)} / {formatDuration(player.duration * 1000)}
        </span>

        {queuePosition && (
          <button
            type="button"
            className="mini-player-button"
            onClick={() => void previousTrack()}
            aria-label="Previous track"
            title="Previous"
          >
            ⏮
          </button>
        )}
        <button
          type="button"
          className="mini-player-button mini-player-button--play"
          onClick={() => void togglePlay(track)}
          aria-label={player.isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {player.isPlaying ? '❚❚' : '▶'}
        </button>
        {queuePosition && (
          <button
            type="button"
            className="mini-player-button"
            onClick={() => void nextTrack()}
            disabled={isLastInQueue}
            aria-label="Next track"
            title="Next"
          >
            ⏭
          </button>
        )}
        <button
          type="button"
          className="mini-player-button"
          onClick={stop}
          aria-label="Stop and close the player"
          title="Stop"
        >
          ✕
        </button>
      </aside>
    </>
  )
}

export default MiniPlayer
