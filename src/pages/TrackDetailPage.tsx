import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import StreamingLinks from '../components/StreamingLinks'
import AudioPreviewPlayer from '../components/AudioPreviewPlayer'
import RiffTabPanel from '../components/RiffTabPanel'
import SetlistButton from '../components/SetlistButton'
import StatusMessage from '../components/StatusMessage'
import { usePlayer } from '../hooks/usePlayer'
import type { GuitarRiffTab } from '../types/riff'
import type { FetchStatus, Track } from '../types/track'
import { getRiffPlayheadIndex, getTrackRiffTab } from '../utils/riffTabs'
import { formatDuration, resolveTrackDetail } from '../utils/trackUtils'

export interface TrackDetailPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
  /** False while later catalog batches are still arriving (progressive loading). */
  isCatalogComplete: boolean
  setlist: Track[]
  isInSetlist: (trackId: number) => boolean
  onToggleSetlist: (track: Track) => void
}

const BACK_TO_VAULT = { label: 'Back to Vault', to: '/' }

function TrackDetailPage({
  tracks,
  status,
  error,
  onRetry,
  isCatalogComplete,
  setlist,
  isInSetlist,
  onToggleSetlist,
}: TrackDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  // Saved tracks are full Track objects, so they open even while the catalog is loading or offline;
  // a valid id stays "loading" until every catalog batch has arrived.
  const detail = resolveTrackDetail(id, { tracks, setlist, status, isCatalogComplete })

  if (detail.kind === 'found') {
    const { track } = detail
    // Keyed by id so per-track view state resets; playback itself lives in the global player.
    return (
      <TrackDetailView
        key={track.id}
        track={track}
        inSetlist={isInSetlist(track.id)}
        onToggleSetlist={() => onToggleSetlist(track)}
      />
    )
  }

  if (detail.kind === 'loading') {
    return <StatusMessage variant="loading" message="Pulling this track from the Vault…" />
  }

  if (detail.kind === 'error') {
    return (
      <StatusMessage
        variant="error"
        title="Couldn't load this track"
        message={error ?? 'Something went wrong while loading the Vault.'}
        onRetry={onRetry}
        action={BACK_TO_VAULT}
      />
    )
  }

  return (
    <StatusMessage
      variant="empty"
      title="Track not found"
      message={`There's no track with id "${id}" in the Vault.`}
      action={BACK_TO_VAULT}
    />
  )
}

interface TrackDetailViewProps {
  track: Track
  inSetlist: boolean
  onToggleSetlist: () => void
}

function TrackDetailView({ track, inSetlist, onToggleSetlist }: TrackDetailViewProps) {
  const riffTab = useMemo(() => getTrackRiffTab(track), [track])

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
          <p className="track-detail-origin">
            <span aria-hidden="true">{track.originFlag}</span> {track.originCountry} ·{' '}
            <span className="style-badge">{track.subgenre}</span>
          </p>
          <h1 className="track-detail-title">
            {track.title}
            {track.isExplicit && (
              <span className="badge-explicit" title="Explicit">
                E
              </span>
            )}
          </h1>
          <p className="track-artist">{track.artist}</p>
          <div className="track-detail-actions">
            <SetlistButton trackTitle={track.title} inSetlist={inSetlist} onToggle={onToggleSetlist} />
            <StreamingLinks track={track} />
          </div>

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
              <dt>Style</dt>
              <dd>{track.subgenre}</dd>
            </div>
            <div>
              <dt>Band origin</dt>
              <dd>
                <span aria-hidden="true">{track.originFlag}</span> {track.originCountry}
              </dd>
            </div>
            <div>
              <dt>iTunes genre</dt>
              <dd>{track.genre}</dd>
            </div>
            {track.albumTrackCount !== null && (
              <div>
                <dt>Album tracks</dt>
                <dd>{track.albumTrackCount}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="track-detail-studio">
        <AudioPreviewPlayer track={track} />
        <LiveRiffTab track={track} tab={riffTab} />
      </div>
    </article>
  )
}

/**
 * The riff tab with a playhead synced to the global player. Only this small component
 * subscribes to playback updates, so the rest of the detail page doesn't re-render each frame.
 */
function LiveRiffTab({ track, tab }: { track: Track; tab: GuitarRiffTab }) {
  const player = usePlayer()
  const isCurrent = player.track?.id === track.id
  const hasStarted = isCurrent && (player.isPlaying || player.currentTime > 0)
  const activeStep = hasStarted
    ? getRiffPlayheadIndex(player.currentTime, tab.bpm, tab.columns.length, tab.stepsPerBeat)
    : null

  return <RiffTabPanel tab={tab} subgenre={track.subgenre} activeStep={activeStep} />
}

export default TrackDetailPage
