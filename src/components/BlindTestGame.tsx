import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSnapshot, pause, playTrack, stop } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import type { BlindTestRound, BlindTestScore, Track } from '../types/track'
import {
  INITIAL_BLIND_TEST_SCORE,
  PREVIEW_SECONDS,
  applyGuess,
  buildBlindTestRound,
  getArtworkBlur,
  getGuessPoints,
  loadBestStreak,
  saveBestStreak,
} from '../utils/arenaUtils'
import { getBrowserStorage } from '../utils/setlistUtils'
import { formatDuration } from '../utils/trackUtils'
import StatusMessage from './StatusMessage'

export interface BlindTestGameProps {
  tracks: Track[]
}

const RECENT_ANSWERS_TO_AVOID = 15

/**
 * Riff Blind-Test: a hidden preview plays (concealed, so the mini-player can't spoil it) while
 * the blurred artwork sharpens; guess among 4 options — faster correct guesses score more.
 */
function BlindTestGame({ tracks }: BlindTestGameProps) {
  const player = usePlayer()
  const [round, setRound] = useState<BlindTestRound | null>(null)
  const [guessId, setGuessId] = useState<number | null>(null)
  const [lastPoints, setLastPoints] = useState(0)
  const [recentIds, setRecentIds] = useState<number[]>([])
  const [notEnoughTracks, setNotEnoughTracks] = useState(false)
  const [score, setScore] = useState<BlindTestScore>(() => ({
    ...INITIAL_BLIND_TEST_SCORE,
    bestStreak: loadBestStreak(getBrowserStorage()),
  }))

  useEffect(() => {
    saveBestStreak(getBrowserStorage(), score.bestStreak)
  }, [score.bestStreak])

  // Leaving the arena stops a hidden round (a visible Head-to-Head preview keeps playing).
  useEffect(
    () => () => {
      if (getSnapshot().concealed) stop()
    },
    [],
  )

  const isRoundAudio = round !== null && player.track?.id === round.answer.id && player.concealed
  const isRoundPlaying = isRoundAudio && player.isPlaying
  const elapsed = isRoundAudio ? player.currentTime : 0
  const duration = isRoundAudio ? player.duration : PREVIEW_SECONDS
  const revealed = guessId !== null
  const blurPx = revealed ? 0 : getArtworkBlur(elapsed, duration)

  const startRound = () => {
    const next = buildBlindTestRound(tracks, { excludeIds: new Set(recentIds) })
    if (!next) {
      setNotEnoughTracks(true)
      return
    }
    setRound(next)
    setGuessId(null)
    setLastPoints(0)
    setRecentIds((ids) => [next.answer.id, ...ids].slice(0, RECENT_ANSWERS_TO_AVOID))
    void playTrack(next.answer, { concealed: true })
  }

  const handleGuess = (option: Track) => {
    if (!round || revealed) return
    const isCorrect = option.id === round.answer.id
    // If the riff isn't playing (replaced or never started), score as if time ran out.
    const points = getGuessPoints(isCorrect, isRoundAudio ? player.currentTime : PREVIEW_SECONDS)
    setGuessId(option.id)
    setLastPoints(points)
    setScore((current) => applyGuess(current, isCorrect, points))
  }

  const handleTogglePlayback = () => {
    if (!round) return
    if (isRoundPlaying) pause()
    else void playTrack(round.answer, { concealed: true })
  }

  if (notEnoughTracks) {
    return (
      <StatusMessage
        variant="empty"
        title="Not enough bands for a round"
        message="The Blind-Test needs tracks from at least 4 different artists."
      />
    )
  }

  const accuracy = score.played > 0 ? Math.round((score.correct / score.played) * 100) : 0
  const answer = round?.answer
  const wasCorrect = revealed && answer !== undefined && guessId === answer.id

  return (
    <section className="blind-test" aria-labelledby="blind-test-title">
      <header className="arena-section-header">
        <div>
          <h2 id="blind-test-title">Riff Blind-Test Challenge</h2>
          <p className="page-summary">
            Name the track from its riff. The artwork sharpens as the preview plays — guess early
            for more points.
          </p>
        </div>
        <dl className="scoreboard" aria-label="Score">
          <div>
            <dt>Score</dt>
            <dd>{score.score}</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{score.streak}</dd>
          </div>
          <div>
            <dt>Best streak</dt>
            <dd>{score.bestStreak}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>
              {score.correct}/{score.played}
              {score.played > 0 && <span className="scoreboard-sub"> · {accuracy}%</span>}
            </dd>
          </div>
        </dl>
      </header>

      {!round || !answer ? (
        <div className="blind-test-intro">
          <p>
            A random preview plays with its artwork hidden behind heavy blur. Pick the right track
            out of 4 before the riff gives it away.
          </p>
          <button type="button" className="button button--large" onClick={startRound}>
            ▶ Start the challenge
          </button>
        </div>
      ) : (
        <div className="blind-test-stage">
          <div className="blind-test-art-column">
            <div className="blind-test-art-frame">
              <img
                className="blind-test-art"
                src={answer.artworkUrlLarge}
                alt={revealed ? `${answer.album} album artwork` : 'Mystery album artwork, blurred'}
                width={600}
                height={600}
                style={{ filter: `blur(${blurPx}px)` }}
              />
            </div>
            <div className="blind-test-transport">
              <button
                type="button"
                className="amp-play"
                onClick={handleTogglePlayback}
                aria-label={isRoundPlaying ? 'Pause the mystery riff' : 'Play the mystery riff'}
              >
                {isRoundPlaying ? '❚❚' : '▶'}
              </button>
              <div
                className="blind-test-progress"
                role="progressbar"
                aria-label="Riff progress"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(elapsed)}
              >
                <span style={{ transform: `scaleX(${Math.min(elapsed / duration, 1)})` }} />
              </div>
              <span className="amp-time">
                {formatDuration(elapsed * 1000)} / {formatDuration(duration * 1000)}
              </span>
            </div>
            {isRoundAudio && player.error && (
              <p className="amp-error" role="alert">
                {player.error}
              </p>
            )}
          </div>

          <div className="blind-test-play">
            <p className="blind-test-question">Which track is this?</p>
            <ul className="blind-test-options">
              {round.options.map((option) => {
                const isAnswer = option.id === answer.id
                const state = !revealed
                  ? ''
                  : isAnswer
                    ? ' blind-test-option--correct'
                    : option.id === guessId
                      ? ' blind-test-option--wrong'
                      : ' blind-test-option--dim'
                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      className={`blind-test-option${state}`}
                      onClick={() => handleGuess(option)}
                      disabled={revealed}
                    >
                      <span className="blind-test-option-title">{option.title}</span>
                      <span className="blind-test-option-artist">{option.artist}</span>
                      {revealed && isAnswer && <span className="sr-only"> (correct answer)</span>}
                      {revealed && !isAnswer && option.id === guessId && (
                        <span className="sr-only"> (your guess, wrong)</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="blind-test-feedback" role="status" aria-live="polite">
              {revealed && (
                <>
                  <p className={wasCorrect ? 'feedback-correct' : 'feedback-wrong'}>
                    {wasCorrect
                      ? `Nailed it! +${lastPoints} points${score.streak > 1 ? ` · ${score.streak} in a row` : ''}`
                      : 'Not this time — the streak resets.'}
                  </p>
                  <p className="blind-test-reveal">
                    It was <Link to={`/tracks/${answer.id}`}>{answer.title}</Link> by {answer.artist}{' '}
                    · <span aria-hidden="true">{answer.originFlag}</span> {answer.originCountry} ·{' '}
                    {answer.subgenre}
                  </p>
                </>
              )}
            </div>

            {revealed && (
              <button type="button" className="button button--large" onClick={startRound}>
                Next Riff →
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default BlindTestGame
