import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSnapshot, onTrackEnded, pause, playTrack, stop } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import type { ArenaRecords, BlindTestRound, RoundResult, Track } from '../types/track'
import {
  FINAL_STAGE,
  LIVES_PER_RUN,
  MAX_TOURNAMENT_SCORE,
  PREVIEW_SECONDS,
  ROUNDS_PER_STAGE,
  TOURNAMENT_STAGES,
  buildBlindTestRound,
  getArtworkBlur,
  getRankTitle,
  getStagePoints,
  getTournamentStage,
  isStageCandidate,
  loadArenaRecords,
  mergeArenaRecords,
  saveArenaRecords,
  summarizeTournament,
  type TournamentStage,
} from '../utils/arenaUtils'
import { getBrowserStorage } from '../utils/setlistUtils'
import { formatDuration } from '../utils/trackUtils'
import SetlistButton from './SetlistButton'
import StatusMessage from './StatusMessage'

export interface BlindTestGameProps {
  tracks: Track[]
  isInSetlist: (trackId: number) => boolean
  onToggleSetlist: (track: Track) => void
}

type Phase = 'intro' | 'round' | 'stage-cleared' | 'summary'

/** Which stage and round-in-stage the current round belongs to (fixed when the round is built). */
interface RoundMeta {
  stage: number
  number: number
}

const RECENT_ANSWERS_TO_AVOID = 15
const formatPoints = (points: number): string => points.toLocaleString('en-US')
const formatMultiplier = (stage: TournamentStage): string => `×${stage.multiplier.toFixed(1)}`

/** Amp-tube lives indicator: lit tubes are lives left, dark ones are blown. */
function AmpTubes({ livesLeft }: { livesLeft: number }) {
  return (
    <span className="amp-tubes" role="img" aria-label={`${livesLeft} of ${LIVES_PER_RUN} lives left`}>
      {Array.from({ length: LIVES_PER_RUN }, (_, index) => (
        <span key={index} className={`amp-tube${index < livesLeft ? ' amp-tube--lit' : ''}`} />
      ))}
    </span>
  )
}

/** "Stage 2 · Medium · ×1.5" chip row for a stage. */
function StageBadges({ stage }: { stage: TournamentStage }) {
  return (
    <span className="stage-badges">
      <span className="stage-badge">Stage {stage.number}</span>
      <span className={`stage-badge stage-badge--${stage.difficulty.toLowerCase()}`}>{stage.difficulty}</span>
      <span className="stage-badge stage-badge--multiplier">{formatMultiplier(stage)} points</span>
    </span>
  )
}

/**
 * Riff Blind-Test Tournament: stages of 5 rounds that get harder (rarer bands, heavier blur,
 * closer decoys, bigger multipliers), with 3 lives (amp tubes) for the whole run. A hidden preview
 * plays (concealed, so the mini-player can't spoil it) while the blurred artwork sharpens; guess
 * among 4 options — faster correct guesses score more. Wrong guesses and timeouts blow a tube;
 * clearing a stage restores one. The run ends when the final stage is conquered or the last tube blows.
 */
function BlindTestGame({ tracks, isInSetlist, onToggleSetlist }: BlindTestGameProps) {
  const player = usePlayer()
  const [phase, setPhase] = useState<Phase>('intro')
  const [round, setRound] = useState<BlindTestRound | null>(null)
  const [roundMeta, setRoundMeta] = useState<RoundMeta>({ stage: 1, number: 1 })
  const [guessId, setGuessId] = useState<number | null>(null)
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [recentIds, setRecentIds] = useState<number[]>([])
  const [notEnoughTracks, setNotEnoughTracks] = useState(false)
  const [records, setRecords] = useState<ArenaRecords>(() => loadArenaRecords(getBrowserStorage()))
  const [newRecords, setNewRecords] = useState({ highScore: false, bestStreak: false })
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null)

  const summary = useMemo(() => summarizeTournament(results), [results])
  const roundStage = getTournamentStage(roundMeta.stage)

  useEffect(() => {
    saveArenaRecords(getBrowserStorage(), records)
  }, [records])

  // Leaving the arena stops a hidden round (a visible Head-to-Head preview keeps playing).
  useEffect(
    () => () => {
      if (getSnapshot().concealed) stop()
    },
    [],
  )

  // Announce the stage transition and the final scoreboard: move focus to their heading.
  useEffect(() => {
    if (phase === 'summary' || phase === 'stage-cleared') summaryHeadingRef.current?.focus()
  }, [phase])

  /** Records the current round's result; when the run ends, updates the all-time records. */
  const recordResult = useCallback(
    (result: RoundResult) => {
      const nextResults = [...results, result]
      setResults(nextResults)
      setRoundResult(result)
      const nextSummary = summarizeTournament(nextResults)
      if (nextSummary.status !== 'playing') {
        setNewRecords({
          highScore: nextSummary.score > records.highScore,
          bestStreak: nextSummary.bestStreak > records.bestStreak,
        })
        setRecords((current) => mergeArenaRecords(current, nextSummary))
      }
    },
    [results, records],
  )

  // Timeout: the hidden preview played to its end without a guess → it costs a life.
  useEffect(() => {
    if (phase !== 'round' || !round || roundResult) return
    return onTrackEnded((track) => {
      if (track.id === round.answer.id && getSnapshot().concealed) {
        recordResult({ track: round.answer, outcome: 'timeout', points: 0, stage: roundMeta.stage })
      }
    })
  }, [phase, round, roundMeta.stage, roundResult, recordResult])

  const isRoundAudio = round !== null && player.track?.id === round.answer.id && player.concealed
  const isRoundPlaying = isRoundAudio && player.isPlaying
  const elapsed = isRoundAudio ? player.currentTime : 0
  const duration = isRoundAudio ? player.duration : PREVIEW_SECONDS
  const revealed = roundResult !== null
  const blurPx = revealed ? 0 : getArtworkBlur(elapsed, duration, roundStage.startBlurPx)
  const isRunOver = summary.status !== 'playing'

  /** Builds the next round from the stage the run is now on (the summary has moved on after a clear). */
  const playNextRound = (from = summary) => {
    const stage = getTournamentStage(from.stage)
    const next = buildBlindTestRound(tracks, {
      excludeIds: new Set(recentIds),
      isAnswerCandidate: (track) => isStageCandidate(stage.number, track),
      decoyMode: stage.decoyMode,
    })
    if (!next) {
      setNotEnoughTracks(true)
      return
    }
    setRound(next)
    setRoundMeta({ stage: stage.number, number: from.roundInStage + 1 })
    setGuessId(null)
    setRoundResult(null)
    setPhase('round')
    setRecentIds((ids) => [next.answer.id, ...ids].slice(0, RECENT_ANSWERS_TO_AVOID))
    void playTrack(next.answer, { concealed: true })
  }

  const startNewRun = () => {
    setResults([])
    setNewRecords({ highScore: false, bestStreak: false })
    playNextRound(summarizeTournament([]))
  }

  const showStageCleared = () => {
    if (getSnapshot().concealed) stop()
    setPhase('stage-cleared')
  }

  const showFinalResults = () => {
    if (getSnapshot().concealed) stop()
    setPhase('summary')
  }

  const handleGuess = (option: Track) => {
    if (!round || revealed) return
    const isCorrect = option.id === round.answer.id
    // If the riff isn't playing (replaced or never started), score as if time ran out.
    const points = getStagePoints(isCorrect, isRoundAudio ? player.currentTime : PREVIEW_SECONDS, roundMeta.stage)
    setGuessId(option.id)
    recordResult({ track: round.answer, outcome: isCorrect ? 'correct' : 'wrong', points, stage: roundMeta.stage })
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

  const header = (
    <header className="arena-section-header">
      <div>
        <h2 id="blind-test-title">Riff Blind-Test Tournament</h2>
        {phase === 'round' ? (
          <p className="stage-heading">
            <StageBadges stage={roundStage} /> <span className="stage-name">{roundStage.name}</span>
          </p>
        ) : (
          <p className="page-summary">
            {FINAL_STAGE} stages of {ROUNDS_PER_STAGE} rounds, 3 amp tubes for the whole run. Name
            each track from its riff — every stage gets rarer, blurrier and worth more.
          </p>
        )}
      </div>
      {phase === 'round' && (
        <dl className="scoreboard" aria-label="Current run">
          <div>
            <dt>Round</dt>
            <dd>
              {roundMeta.number} <span className="scoreboard-sub">of {ROUNDS_PER_STAGE}</span>
            </dd>
          </div>
          <div>
            <dt>Lives</dt>
            <dd>
              <AmpTubes livesLeft={summary.livesLeft} />
            </dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>{formatPoints(summary.score)}</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{summary.currentStreak}</dd>
          </div>
        </dl>
      )}
    </header>
  )

  const allTimeLine = (
    <p className="arena-records">
      All-time high score <strong>{formatPoints(records.highScore)}</strong> · Best streak{' '}
      <strong>{records.bestStreak}</strong>
    </p>
  )

  // ---------- Final scoreboard ----------
  if (phase === 'stage-cleared') {
    const cleared = getTournamentStage(summary.justClearedStage ?? summary.stage - 1)
    const upcoming = getTournamentStage(summary.stage)
    const stageResults = results.filter((result) => result.stage === cleared.number)
    const stageScore = stageResults.reduce((total, result) => total + result.points, 0)
    const stageCorrect = stageResults.filter((result) => result.outcome === 'correct').length
    return (
      <section className="blind-test" aria-labelledby="blind-test-title">
        {header}
        <div className="stage-cleared">
          <div className="set-banner set-banner--victory">
            <h3 className="set-banner-title" ref={summaryHeadingRef} tabIndex={-1}>
              Stage {cleared.number} Cleared!
            </h3>
            <p className="set-rank">
              {cleared.name}: {stageCorrect} / {stageResults.length} correct · +{formatPoints(stageScore)} points
            </p>
          </div>
          <dl className="set-stats">
            <div>
              <dt>Run score</dt>
              <dd>{formatPoints(summary.score)}</dd>
            </div>
            <div>
              <dt>Lives carried over</dt>
              <dd>
                <AmpTubes livesLeft={summary.livesLeft} />
                <span className="scoreboard-sub">
                  {summary.restoredLife ? ' +1 tube restored' : ` already at full power (max ${LIVES_PER_RUN})`}
                </span>
              </dd>
            </div>
            <div>
              <dt>Streak</dt>
              <dd>{summary.currentStreak}</dd>
            </div>
          </dl>
          <div className="stage-next">
            <p className="stage-next-label">Up next</p>
            <p className="stage-heading">
              <StageBadges stage={upcoming} /> <span className="stage-name">{upcoming.name}</span>
            </p>
            <p className="stage-next-description">{upcoming.description}</p>
          </div>
          <button type="button" className="button button--large" onClick={() => playNextRound()}>
            Advance to Stage {upcoming.number} →
          </button>
        </div>
      </section>
    )
  }

  if (phase === 'summary') {
    const isConquered = summary.status === 'conquered'
    const reachedStage = getTournamentStage(summary.stage)
    return (
      <section className="blind-test" aria-labelledby="blind-test-title">
        {header}
        <div className="set-summary">
          <div className={`set-banner set-banner--${isConquered ? 'victory' : 'game-over'}`}>
            <h3 className="set-banner-title" ref={summaryHeadingRef} tabIndex={-1}>
              {isConquered ? 'Tournament Conquered!' : 'Game Over — Amp Blown!'}
            </h3>
            <p className="set-rank">
              {isConquered
                ? `All ${FINAL_STAGE} stages cleared.`
                : `Reached Stage ${reachedStage.number} of ${FINAL_STAGE}: ${reachedStage.name} · ${summary.stagesCleared} ${summary.stagesCleared === 1 ? 'stage' : 'stages'} cleared.`}
            </p>
            <p className="set-rank">
              Rank earned: <strong>{getRankTitle(summary.score)}</strong>
            </p>
          </div>

          <dl className="set-stats">
            <div>
              <dt>Final score</dt>
              <dd>
                {formatPoints(summary.score)}
                <span className="scoreboard-sub"> / {formatPoints(MAX_TOURNAMENT_SCORE)}</span>
                {newRecords.highScore && <span className="win-badge">New high score</span>}
              </dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>
                {summary.correct} / {summary.played} correct
              </dd>
            </div>
            <div>
              <dt>Best streak in run</dt>
              <dd>
                {summary.bestStreak}
                {newRecords.bestStreak && <span className="win-badge">New record</span>}
              </dd>
            </div>
            <div>
              <dt>All-time high score</dt>
              <dd>{formatPoints(records.highScore)}</dd>
            </div>
            <div>
              <dt>All-time best streak</dt>
              <dd>{records.bestStreak}</dd>
            </div>
          </dl>

          <h3 className="recap-title">Round-by-round recap</h3>
          <ol className="recap-list">
            {results.map((result, index) => {
              const roundInStage =
                results.slice(0, index + 1).filter((item) => item.stage === result.stage).length
              return (
                <li key={`${result.track.id}-${index}`} className="recap-item">
                  <span
                    className="recap-outcome"
                    role="img"
                    aria-label={
                      result.outcome === 'correct'
                        ? 'Correct'
                        : result.outcome === 'timeout'
                          ? "Time's up"
                          : 'Wrong'
                    }
                  >
                    {result.outcome === 'correct' ? '✅' : '❌'}
                  </span>
                  <span className="recap-round">
                    S{result.stage} · R{roundInStage}
                  </span>
                  <img
                    className="recap-art"
                    src={result.track.artworkUrl}
                    alt=""
                    width={48}
                    height={48}
                    loading="lazy"
                  />
                  <span className="recap-track">
                    <Link to={`/tracks/${result.track.id}`} className="recap-title-link">
                      {result.track.title}
                    </Link>
                    <span className="recap-artist">
                      {result.track.artist} · <span aria-hidden="true">{result.track.originFlag}</span>{' '}
                      {result.track.subgenre}
                      {result.outcome === 'timeout' && ' · time ran out'}
                    </span>
                  </span>
                  <span className="recap-points">+{formatPoints(result.points)}</span>
                  <SetlistButton
                    variant="compact"
                    trackTitle={result.track.title}
                    inSetlist={isInSetlist(result.track.id)}
                    onToggle={() => onToggleSetlist(result.track)}
                  />
                </li>
              )
            })}
          </ol>

          <button type="button" className="button button--large" onClick={startNewRun}>
            ▶ Start a New Tournament
          </button>
        </div>
      </section>
    )
  }

  // ---------- Intro ----------
  if (phase === 'intro' || !round) {
    return (
      <section className="blind-test" aria-labelledby="blind-test-title">
        {header}
        <div className="blind-test-intro">
          <p>
            Each stage is <strong>{ROUNDS_PER_STAGE} rounds</strong> and you have{' '}
            <strong>{LIVES_PER_RUN} amp tubes</strong> for the whole run. A wrong guess — or letting
            the 30-second riff run out — blows a tube; clearing a stage restores one.
          </p>
          <ol className="stage-ladder">
            {TOURNAMENT_STAGES.map((stage) => (
              <li key={stage.number} className="stage-ladder-item">
                <StageBadges stage={stage} />
                <strong className="stage-name">{stage.name}</strong>
                <span className="stage-ladder-description">{stage.description}</span>
              </li>
            ))}
          </ol>
          {allTimeLine}
          <button type="button" className="button button--large" onClick={startNewRun}>
            ▶ Start the Tournament
          </button>
        </div>
      </section>
    )
  }

  // ---------- Round ----------
  const { answer } = round
  const feedback =
    roundResult === null
      ? null
      : roundResult.outcome === 'correct'
        ? `Nailed it! +${formatPoints(roundResult.points)} points${summary.currentStreak > 1 ? ` · ${summary.currentStreak} in a row` : ''}`
        : `${roundResult.outcome === 'timeout' ? "Time's up — the riff ran out." : 'Wrong answer.'} ${
            summary.livesLeft > 0
              ? `A tube blew — ${summary.livesLeft} ${summary.livesLeft === 1 ? 'life' : 'lives'} left.`
              : 'That was your last tube!'
          }`

  return (
    <section className="blind-test" aria-labelledby="blind-test-title">
      {header}
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
            {roundResult && (
              <>
                <p className={roundResult.outcome === 'correct' ? 'feedback-correct' : 'feedback-wrong'}>
                  {feedback}
                </p>
                <p className="blind-test-reveal">
                  It was <Link to={`/tracks/${answer.id}`}>{answer.title}</Link> by {answer.artist} ·{' '}
                  <span aria-hidden="true">{answer.originFlag}</span> {answer.originCountry} ·{' '}
                  {answer.subgenre}
                </p>
              </>
            )}
          </div>

          {revealed && (
            <button
              type="button"
              className="button button--large"
              onClick={
                isRunOver
                  ? showFinalResults
                  : summary.justClearedStage !== null
                    ? showStageCleared
                    : () => playNextRound()
              }
            >
              {isRunOver
                ? 'See Final Results'
                : summary.justClearedStage !== null
                  ? `Stage ${summary.justClearedStage} Cleared →`
                  : 'Next Riff →'}
            </button>
          )}
          {allTimeLine}
        </div>
      </div>
    </section>
  )
}

export default BlindTestGame
