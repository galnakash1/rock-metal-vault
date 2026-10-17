import { Link, useParams } from 'react-router-dom'
import type { Track } from '../types/track'
import { formatDuration } from '../utils/trackUtils'

export interface TrackDetailPageProps {
  tracks: Track[]
}

function TrackDetailPage({ tracks }: TrackDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  // Only plain digit strings are valid iTunes track ids ("12abc", "-1", "" are not).
  const trackId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null
  const track = trackId === null ? undefined : tracks.find((item) => item.id === trackId)

  if (!track) {
    return (
      <section className="empty-state">
        <h1>Track not found</h1>
        <p>There's no track with id "{id}" in the Vault.</p>
        <Link to="/" className="button-link">
          Back to Vault
        </Link>
      </section>
    )
  }

  return (
    <article className="track-detail">
      <Link to="/" className="back-link">
        ← Back to Vault
      </Link>

      <div className="track-detail-body">
        <img
          className="track-detail-art"
          src={track.artworkUrlLarge}
          alt={`${track.album} album artwork`}
          width={600}
          height={600}
        />

        <div className="track-detail-info">
          <h1 className="track-detail-title">
            {track.title}
            {track.isExplicit && (
              <span className="badge-explicit" title="Explicit">
                E
              </span>
            )}
          </h1>
          <p className="track-artist">{track.artist}</p>

          <dl className="track-facts">
            <div>
              <dt>Album</dt>
              <dd>{track.album}</dd>
            </div>
            <div>
              <dt>Released</dt>
              <dd>{track.releaseYear ?? 'Unknown'}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(track.durationMs)}</dd>
            </div>
            <div>
              <dt>Genre</dt>
              <dd>{track.genre}</dd>
            </div>
            {track.albumTrackCount !== null && (
              <div>
                <dt>Album tracks</dt>
                <dd>{track.albumTrackCount}</dd>
              </div>
            )}
          </dl>

          <section className="preview">
            <h2>30-second preview</h2>
            {/* Basic player — replaced by the Amp Console (AudioPreviewPlayer) in Task 5 */}
            <audio
              className="preview-audio"
              controls
              preload="none"
              src={track.previewUrl}
              aria-label={`Preview of ${track.title} by ${track.artist}`}
            >
              Your browser does not support audio playback.
            </audio>
          </section>
        </div>
      </div>
    </article>
  )
}

export default TrackDetailPage
