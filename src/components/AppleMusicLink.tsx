import type { Track } from '../types/track'

export interface AppleMusicLinkProps {
  track: Pick<Track, 'title' | 'storeUrl'>
  variant?: 'full' | 'compact'
}

/**
 * The iTunes API only provides 30-second previews; this opens the full song on Apple Music.
 * Renders nothing when Apple didn't supply a store link.
 */
function AppleMusicLink({ track, variant = 'full' }: AppleMusicLinkProps) {
  if (!track.storeUrl) return null
  return (
    <a
      className={`apple-music-link apple-music-link--${variant}`}
      href={track.storeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Full song of ${track.title} on Apple Music (opens in a new tab)`}
    >
      {variant === 'full' ? 'Full Song on Apple Music' : 'Apple Music'} <span aria-hidden="true">↗</span>
    </a>
  )
}

export default AppleMusicLink
