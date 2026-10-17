import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AudioPreviewPlayer from '../components/AudioPreviewPlayer'
import RiffTabPanel from '../components/RiffTabPanel'
import StatusMessage from '../components/StatusMessage'
import type { FetchStatus, Track } from '../types/track'
import { getRiffPlayheadIndex, getTrackRiffTab } from '../utils/riffTabs'
import { formatDuration } from '../utils/trackUtils'

export interface TrackDetailPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
}

const BACK_TO_VAULT = { label: 'Back to Vault', to: '/' }

function TrackDetailPage({ tracks, status, error, onRetry }: TrackDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  // Only plain digit strings are valid iTunes track ids ("12abc", "-1", "" are not).
  const trackId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null
  const track = trackId === null ? undefined : tracks.find((item) => item.id === trackId)

  if (status === 'loading') {
    return <StatusMessage variant="loading" message="Pulling this track from the Vault…" />
  }

  if (status === 'error') {
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

  if (!track) {
    return (
      <StatusMessage
        variant="empty"
        title="Track not found"
        message={`There's no track with id "${id}" in the Vault.`}
        action={BACK_TO_VAULT}
      />
    )
  }

  // Keyed by id so playback state and the audio graph start fresh for every track.
  return <TrackDetailView key={track.id} track={track} />
}

interface Playback {
  seconds: number
  isPlaying: boolean
}

function TrackDetailView({ track }: { track: Track }) {
  const [playback, setPlayback] = useState<Playback>({ seconds: 0, isPlaying: false })
  const riffTab = useMemo(() => getTrackRiffTab(track), [track])

  const handleProgress = useCallback((seconds: number, isPlaying: boolean) => {
    setPlayback({ seconds, isPlaying })
  }, [])

  const hasStarted = playback.isPlaying || playback.seconds > 0
  const activeStep = hasStarted
    ? getRiffPlayheadIndex(playback.seconds, riffTab.bpm, riffTab.columns.length, riffTab.stepsPerBeat)
    : null

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
        <AudioPreviewPlayer
          src={track.previewUrl}
          title={`${track.title} by ${track.artist}`}
          onProgress={handleProgress}
        />
        <RiffTabPanel tab={riffTab} subgenre={track.subgenre} activeStep={activeStep} />
      </div>
    </article>
  )
}

export default TrackDetailPage
