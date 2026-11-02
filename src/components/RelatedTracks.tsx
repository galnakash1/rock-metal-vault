import { Link } from 'react-router-dom'
import type { Track } from '../types/track'
import { upgradeArtworkUrl } from '../utils/trackUtils'

export interface RelatedTracksProps {
  /** Already ranked (see `getRelatedTracks`); the strip renders nothing when empty. */
  tracks: readonly Track[]
}

// Sharp on high-density screens at the strip's ~170px card width.
const ART_SIZE = 300

/**
 * "More Like This": a horizontal strip of related catalog tracks, each linking to its own detail
 * page. Purely presentational — no requests, no player state.
 */
function RelatedTracks({ tracks }: RelatedTracksProps) {
  if (tracks.length === 0) return null

  return (
    <section className="related-tracks" aria-labelledby="related-tracks-title">
      <div className="related-tracks-header">
        <h2 id="related-tracks-title">More Like This</h2>
        <p className="page-summary">Same style first, then the same iTunes genre — straight from the Vault.</p>
      </div>
      <ul className="related-tracks-list">
        {tracks.map((track) => (
          <li key={track.id} className="related-track">
            <Link
              to={`/tracks/${track.id}`}
              className="related-track-link"
              // The next detail page should start at the top, not where this strip was scrolled to.
              onClick={() => window.scrollTo(0, 0)}
            >
              <img
                className="related-track-art"
                src={upgradeArtworkUrl(track.artworkUrl, ART_SIZE)}
                alt=""
                width={ART_SIZE}
                height={ART_SIZE}
                loading="lazy"
              />
              <span className="related-track-title">{track.title}</span>
              <span className="related-track-artist">{track.artist}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RelatedTracks
