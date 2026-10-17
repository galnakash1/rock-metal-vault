import { Link } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage'
import type { FetchStatus, Track } from '../types/track'
import { formatDuration, getTotalDuration } from '../utils/trackUtils'

export interface CatalogPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
}

function CatalogPage({ tracks, status, error, onRetry }: CatalogPageProps) {
  return (
    <section>
      <header className="page-header">
        <h1>Vault Catalog</h1>
        {status === 'success' && tracks.length > 0 && (
          <p className="page-summary">
            {tracks.length} tracks · {formatDuration(getTotalDuration(tracks))} total
          </p>
        )}
      </header>

      {status === 'loading' && (
        <StatusMessage variant="loading" message="Tuning up — loading the Vault…" />
      )}

      {status === 'error' && (
        <StatusMessage
          variant="error"
          title="The Vault is locked"
          message={error ?? 'Something went wrong while loading the Vault.'}
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length === 0 && (
        <StatusMessage
          variant="empty"
          title="The Vault is empty"
          message="The iTunes API didn't return any rock or metal tracks right now."
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length > 0 && (
        <ul className="track-list">
          {tracks.map((track) => (
            <li key={track.id}>
              <Link to={`/tracks/${track.id}`} className="track-row">
                <img
                  className="track-art"
                  src={track.artworkUrl}
                  alt={`${track.album} album artwork`}
                  width={100}
                  height={100}
                  loading="lazy"
                />
                <div className="track-info">
                  <h2 className="track-title">{track.title}</h2>
                  <p className="track-artist">{track.artist}</p>
                  <p className="track-meta">
                    {track.album} · {track.genre}
                  </p>
                </div>
                <span className="track-duration">{formatDuration(track.durationMs)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default CatalogPage
