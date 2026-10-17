import StatusMessage from '../components/StatusMessage'
import type { FetchStatus, Track } from '../types/track'

export interface ArenaPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
}

function ArenaPage({ tracks, status, error, onRetry }: ArenaPageProps) {
  return (
    <section>
      <header className="page-header">
        <h1>Riff Arena</h1>
        <p className="page-summary">
          Name the track from its riff in the Blind-Test Challenge, then pit two tracks
          head-to-head.
        </p>
      </header>

      {status === 'loading' && (
        <StatusMessage variant="loading" message="Loading contenders for the arena…" />
      )}

      {status === 'error' && (
        <StatusMessage
          variant="error"
          title="The arena is dark"
          message={error ?? 'Something went wrong while loading the Vault.'}
          onRetry={onRetry}
        />
      )}

      {status === 'success' && (
        <StatusMessage
          variant="empty"
          message={`${tracks.length} tracks are warming up — the arena opens soon.`}
        />
      )}
    </section>
  )
}

export default ArenaPage
