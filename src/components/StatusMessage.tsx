import { Link } from 'react-router-dom'

export type StatusVariant = 'loading' | 'error' | 'empty'

export interface StatusMessageProps {
  variant: StatusVariant
  message: string
  title?: string
  onRetry?: () => void
  retryLabel?: string // defaults to "Retry"
  action?: { label: string; to: string } // e.g. "Back to Vault" → "/"
}

function StatusMessage({
  variant,
  message,
  title,
  onRetry,
  retryLabel = 'Retry',
  action,
}: StatusMessageProps) {
  return (
    <div
      className={`status-message status-message--${variant}`}
      // Errors interrupt screen readers; loading/empty updates are announced politely.
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {variant === 'loading' && <span className="status-spinner" aria-hidden="true" />}
      {title && <h2 className="status-title">{title}</h2>}
      <p>{message}</p>
      {(onRetry || action) && (
        <div className="status-actions">
          {onRetry && (
            <button type="button" className="button" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
          {action && (
            <Link to={action.to} className="button-link">
              {action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default StatusMessage
