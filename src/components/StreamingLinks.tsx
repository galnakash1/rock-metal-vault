import type { Track } from '../types/track'
import { getStreamingLinks } from '../utils/streamingLinks'

export interface StreamingLinksProps {
  track: Pick<Track, 'artist' | 'title' | 'storeUrl'>
  variant?: 'full' | 'compact'
}

/**
 * The iTunes API only provides 30-second previews; these open the full song on Apple Music,
 * Spotify or YouTube (each in a new tab).
 */
function StreamingLinks({ track, variant = 'full' }: StreamingLinksProps) {
  const links = getStreamingLinks(track)
  return (
    <ul
      className={`streaming-links streaming-links--${variant}`}
      aria-label={`Full song of ${track.title}`}
    >
      {variant === 'full' && (
        <li className="streaming-links-label" aria-hidden="true">
          Full song
        </li>
      )}
      {links.map((link) => (
        <li key={link.service}>
          <a
            className={`streaming-link streaming-link--${link.service}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${track.title} on ${link.label} (opens in a new tab)`}
          >
            <span className="streaming-link-dot" aria-hidden="true" />
            {link.label}
            {variant === 'full' && <span aria-hidden="true"> ↗</span>}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default StreamingLinks
