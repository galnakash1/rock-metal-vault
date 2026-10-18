import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Track } from '../types/track'
import { formatDuration, upgradeArtworkUrl } from '../utils/trackUtils'
import CardPlayButton from './CardPlayButton'
import SetlistButton from './SetlistButton'

export interface TrackCardProps {
  track: Track
  inSetlist: boolean
  /** Must be stable (useCallback) so memoized cards skip re-rendering. */
  onToggleSetlist: (track: Track) => void
  /** Must be stable too: starts the preview queue at this track. */
  onPlay: (track: Track) => void
}

// Sharp on high-density screens at card size, and much lighter than the 600px detail art.
const CARD_ART_SIZE = 300

/**
 * One catalog card. Memoized: with stable callbacks it only re-renders when its own track or
 * setlist state changes, which keeps returning to a large catalog fast.
 */
function TrackCard({ track, inSetlist, onToggleSetlist, onPlay }: TrackCardProps) {
  return (
    <article className="track-card">
      <Link to={`/tracks/${track.id}`} className="track-card-link">
        <img
          className="track-card-art"
          src={upgradeArtworkUrl(track.artworkUrl, CARD_ART_SIZE)}
          alt={`${track.album} album artwork`}
          width={CARD_ART_SIZE}
          height={CARD_ART_SIZE}
          loading="lazy"
        />
        <div className="track-card-body">
          <h2 className="track-card-title">
            {track.title}
            {track.isExplicit && (
              <span className="badge-explicit" title="Explicit">
                E
              </span>
            )}
          </h2>
          <p className="track-card-artist">{track.artist}</p>
          <p className="track-card-origin">
            <span aria-hidden="true">{track.originFlag}</span> {track.originCountry}
          </p>
          <div className="track-card-meta">
            <span className="style-badge">{track.subgenre}</span>
            <span>{track.releaseYear ?? '—'}</span>
            <span className="track-card-duration">{formatDuration(track.durationMs)}</span>
          </div>
        </div>
      </Link>
      <div className="track-card-actions">
        <CardPlayButton track={track} onPlay={onPlay} />
        <SetlistButton
          variant="compact"
          trackTitle={track.title}
          inSetlist={inSetlist}
          onToggle={() => onToggleSetlist(track)}
        />
      </div>
    </article>
  )
}

export default memo(TrackCard)
