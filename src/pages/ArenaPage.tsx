import { useMemo } from 'react'
import BlindTestGame from '../components/BlindTestGame'
import HeadToHead from '../components/HeadToHead'
import StatusMessage from '../components/StatusMessage'
import type { FetchStatus, Track } from '../types/track'
import { sortTracks } from '../utils/trackUtils'

export interface ArenaPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
  isInSetlist: (trackId: number) => boolean
  onToggleSetlist: (track: Track) => void
}

function ArenaPage({ tracks, status, error, onRetry, isInSetlist, onToggleSetlist }: ArenaPageProps) {
  const sortedTracks = useMemo(() => sortTracks(tracks, 'artist-asc'), [tracks])

  return (
    <section className="arena">
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

      {status === 'success' && tracks.length === 0 && (
        <StatusMessage
          variant="empty"
          title="No contenders yet"
          message="The Vault is empty right now, so there's nothing to battle."
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length > 0 && (
        <>
          <BlindTestGame
            tracks={tracks}
            isInSetlist={isInSetlist}
            onToggleSetlist={onToggleSetlist}
          />
          <HeadToHead
            tracks={sortedTracks}
            isInSetlist={isInSetlist}
            onToggleSetlist={onToggleSetlist}
          />
        </>
      )}
    </section>
  )
}

export default ArenaPage
