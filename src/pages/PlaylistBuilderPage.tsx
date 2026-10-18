import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineupPlayButton, RowPlayButton } from '../components/LineupPlayback'
import SetlistButton from '../components/SetlistButton'
import StatusMessage from '../components/StatusMessage'
import StreamingLinks from '../components/StreamingLinks'
import type { FetchStatus, Track } from '../types/track'
import {
  DIAGNOSTIC_QUESTIONS,
  buildPlaylist,
  getMetalPersona,
  isDiagnosticComplete,
  rankTracksForProfile,
  swapPlaylistTrack,
  type DiagnosticAnswers,
  type QuestionId,
} from '../utils/builderUtils'
import { formatDuration, getTotalDuration } from '../utils/trackUtils'

export interface PlaylistBuilderPageProps {
  tracks: Track[]
  status: FetchStatus
  error: string | null
  onRetry: () => void
  isInSetlist: (trackId: number) => boolean
  onToggleSetlist: (track: Track) => void
  onAddAllToSetlist: (tracks: readonly Track[]) => void
}

export const PLAYLIST_QUEUE_LABEL = 'Playlist'

/** The 5-question Sonic Diagnostic, one question at a time. */
function Diagnostic({
  answers,
  onAnswer,
}: {
  answers: Partial<DiagnosticAnswers>
  onAnswer: (id: QuestionId, optionId: string) => void
}) {
  const [step, setStep] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const question = DIAGNOSTIC_QUESTIONS[step]

  // Move focus to each new question so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (step > 0) headingRef.current?.focus()
  }, [step])

  if (!question) return null

  const choose = (optionId: string) => {
    onAnswer(question.id, optionId)
    if (step < DIAGNOSTIC_QUESTIONS.length - 1) setStep(step + 1)
  }

  return (
    <section className="diagnostic" aria-labelledby="diagnostic-question">
      <div className="diagnostic-progress">
        <span className="diagnostic-step">
          Question {step + 1} of {DIAGNOSTIC_QUESTIONS.length}
        </span>
        <ol className="diagnostic-dots" aria-hidden="true">
          {DIAGNOSTIC_QUESTIONS.map((item, index) => (
            <li
              key={item.id}
              className={`diagnostic-dot${index < step ? ' diagnostic-dot--done' : ''}${index === step ? ' diagnostic-dot--current' : ''}`}
            />
          ))}
        </ol>
      </div>

      <p className="diagnostic-kicker">{question.title}</p>
      <h2 className="diagnostic-question" id="diagnostic-question" ref={headingRef} tabIndex={-1}>
        {question.prompt}
      </h2>

      <ul className="diagnostic-options">
        {question.options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="diagnostic-option"
              aria-pressed={answers[question.id] === option.id}
              onClick={() => choose(option.id)}
            >
              <span className="diagnostic-option-label">{option.label}</span>
              <span className="diagnostic-option-hint">{option.hint}</span>
            </button>
          </li>
        ))}
      </ul>

      {step > 0 && (
        <button type="button" className="button button--ghost" onClick={() => setStep(step - 1)}>
          ← Back
        </button>
      )}
    </section>
  )
}

/**
 * Playlist Builder: a 5-question Sonic Diagnostic scores every catalog track against the answers
 * (pure, tested scoring in builderUtils), names a Metal Persona and serves a 10-track playlist
 * that can be previewed, queued, swapped track by track and added to the festival setlist.
 */
function PlaylistBuilderPage({
  tracks,
  status,
  error,
  onRetry,
  isInSetlist,
  onToggleSetlist,
  onAddAllToSetlist,
}: PlaylistBuilderPageProps) {
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>({})
  const [playlist, setPlaylist] = useState<Track[] | null>(null)
  // Bumped by "Re-run" so the diagnostic starts again at question 1.
  const [runId, setRunId] = useState(0)
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null)

  const completeAnswers = isDiagnosticComplete(answers) ? answers : null
  const ranked = useMemo(
    () => (completeAnswers ? rankTracksForProfile(tracks, completeAnswers) : []),
    [tracks, completeAnswers],
  )

  useEffect(() => {
    if (playlist) resultsHeadingRef.current?.focus()
  }, [playlist])

  const handleAnswer = (id: QuestionId, optionId: string) => {
    const next = { ...answers, [id]: optionId }
    setAnswers(next)
    // The last answer completes the diagnostic: build the playlist right away.
    if (id === DIAGNOSTIC_QUESTIONS.at(-1)?.id && isDiagnosticComplete(next)) {
      setPlaylist(buildPlaylist(rankTracksForProfile(tracks, next)))
    }
  }

  const rerun = () => {
    setAnswers({})
    setPlaylist(null)
    setRunId((id) => id + 1)
  }

  const swap = (index: number) => {
    if (playlist) setPlaylist(swapPlaylistTrack(ranked, playlist, index))
  }

  const persona = completeAnswers ? getMetalPersona(completeAnswers) : null
  const allSaved = playlist !== null && playlist.length > 0 && playlist.every((track) => isInSetlist(track.id))
  const profileChips = completeAnswers
    ? DIAGNOSTIC_QUESTIONS.map((question) => ({
        id: question.id,
        title: question.title,
        label: question.options.find((option) => option.id === completeAnswers[question.id])?.label ?? '',
      }))
    : []

  return (
    <section className="builder">
      <header className="page-header">
        <h1>Playlist Builder</h1>
        <p className="page-summary">
          Answer the 5-question Sonic Diagnostic and get your Metal Persona plus a tailored
          10-track playlist from the Vault.
        </p>
      </header>

      {status === 'loading' && <StatusMessage variant="loading" message="Warming up the diagnostic rig…" />}

      {status === 'error' && (
        <StatusMessage
          variant="error"
          title="The diagnostic rig is down"
          message={error ?? 'Something went wrong while loading the Vault.'}
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length === 0 && (
        <StatusMessage
          variant="empty"
          title="Nothing to build from"
          message="The Vault is empty right now, so there's nothing to recommend."
          onRetry={onRetry}
        />
      )}

      {status === 'success' && tracks.length > 0 && !playlist && (
        <Diagnostic key={runId} answers={answers} onAnswer={handleAnswer} />
      )}

      {status === 'success' && playlist && persona && (
        <div className="builder-results">
          <section className="persona-card" aria-labelledby="persona-title">
            <p className="persona-kicker">Your Metal Persona</p>
            <h2 className="persona-title" id="persona-title" ref={resultsHeadingRef} tabIndex={-1}>
              {persona.title}
            </h2>
            <p className="persona-tagline">{persona.tagline}</p>
            <ul className="persona-profile" aria-label="Your answers">
              {profileChips.map((chip) => (
                <li key={chip.id} className="persona-chip">
                  <span className="persona-chip-title">{chip.title}</span> {chip.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="builder-playlist" aria-labelledby="builder-playlist-title">
            <div className="running-order-header">
              <h2 id="builder-playlist-title">Your {playlist.length}-track playlist</h2>
              <p className="page-summary">
                {formatDuration(getTotalDuration(playlist))} · ranked for your profile · max 2 tracks
                per band
              </p>
            </div>

            <div className="builder-actions">
              <LineupPlayButton
                setlist={playlist}
                queueLabel={PLAYLIST_QUEUE_LABEL}
                noun="Playlist"
                playLabel={`Play All ${playlist.length} Tracks`}
              />
              <button
                type="button"
                className="button button--large"
                onClick={() => onAddAllToSetlist(playlist)}
                disabled={allSaved}
              >
                {allSaved ? '✓ All in Festival Setlist' : `Add All ${playlist.length} to Festival Setlist`}
              </button>
              <button type="button" className="button button--ghost" onClick={rerun}>
                ↻ Re-run Diagnostic
              </button>
            </div>

            <ol className="running-order-list builder-list">
              {playlist.map((track, index) => (
                <li key={track.id} className="running-order-item builder-item">
                  <span className="running-order-index">{index + 1}</span>
                  <RowPlayButton setlist={playlist} index={index} queueLabel={PLAYLIST_QUEUE_LABEL} />
                  <img
                    className="running-order-art"
                    src={track.artworkUrl}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                  />
                  <div className="running-order-info">
                    <Link to={`/tracks/${track.id}`} className="running-order-title">
                      {track.title}
                    </Link>
                    <span className="running-order-artist">
                      {track.artist} · {track.subgenre} · {track.releaseYear ?? '—'}
                    </span>
                    <StreamingLinks track={track} variant="compact" />
                  </div>
                  <div className="builder-item-actions">
                    <button
                      type="button"
                      className="builder-swap"
                      onClick={() => swap(index)}
                      aria-label={`Swap ${track.title} for another track`}
                      title="Swap for another track"
                    >
                      <span aria-hidden="true">⇄</span> Swap
                    </button>
                    <SetlistButton
                      variant="compact"
                      trackTitle={track.title}
                      inSetlist={isInSetlist(track.id)}
                      onToggle={() => onToggleSetlist(track)}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </section>
  )
}

export default PlaylistBuilderPage
