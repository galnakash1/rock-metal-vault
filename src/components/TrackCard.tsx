import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Track } from '../types/track'
import { formatDuration, upgradeArtworkUrl } from '../utils/trackUtils'

export interface TrackCardProps {
  track: Track
  /** Extra controls rendered outside the card link (e.g. the Task 6 setlist toggle). */
  actions?: ReactNode
}

// Sharp on high-density screens at card size, and much lighter than the 600px detail art.
const CARD_ART_SIZE = 300

function TrackCard({ track, actions }: TrackCardProps) {
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
      {actions && <div className="track-card-actions">{actions}</div>}
    </article>
  )
}

export default TrackCard
