import type { MouseEvent } from 'react'

export interface SetlistButtonProps {
  trackTitle: string
  inSetlist: boolean
  onToggle: () => void
  variant?: 'compact' | 'full'
}

/** Add/remove a track from the festival setlist. Safe to place inside clickable cards. */
function SetlistButton({ trackTitle, inSetlist, onToggle, variant = 'full' }: SetlistButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Never let the click reach a surrounding card link (no accidental navigation).
    event.preventDefault()
    event.stopPropagation()
    onToggle()
  }

  return (
    <button
      type="button"
      className={`setlist-button setlist-button--${variant}${inSetlist ? ' setlist-button--saved' : ''}`}
      onClick={handleClick}
      aria-label={inSetlist ? `Remove ${trackTitle} from setlist` : `Add ${trackTitle} to setlist`}
    >
      <span aria-hidden="true">{inSetlist ? '✓' : '+'}</span>{' '}
      {inSetlist ? 'Remove from Setlist' : 'Add to Setlist'}
    </button>
  )
}

export default SetlistButton
