import { Link } from 'react-router-dom'
import type { Track } from '../types/track'
import { formatDuration, getTotalDuration } from '../utils/trackUtils'

export interface CatalogPageProps {
  tracks: Track[]
}

function CatalogPage({ tracks }: CatalogPageProps) {
  return (
    <section>
      <header className="page-header">
        <h1>Vault Catalog</h1>
        <p className="page-summary">
          {tracks.length} tracks · {formatDuration(getTotalDuration(tracks))} total
        </p>
      </header>

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
    </section>
  )
}

export default CatalogPage
