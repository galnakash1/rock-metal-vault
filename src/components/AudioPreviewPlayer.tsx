import { useEffect, useRef } from 'react'
import { readFrequencies, seek, setPreset, togglePlay } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import type { Track } from '../types/track'
import { EQ_PRESETS, EQ_PRESET_IDS, bucketFrequencies } from '../utils/audioUtils'
import { formatDuration } from '../utils/trackUtils'

export interface AudioPreviewPlayerProps {
  track: Track
}

const BAR_COUNT = 32
const PREVIEW_SECONDS = 30

function drawBars(canvas: HTMLCanvasElement, levels: readonly number[]): void {
  const context = canvas.getContext('2d')
  if (!context) return

  const ratio = window.devicePixelRatio || 1
  const width = Math.round(canvas.clientWidth * ratio)
  const height = Math.round(canvas.clientHeight * ratio)
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  const styles = getComputedStyle(canvas)
  const gradient = context.createLinearGradient(0, height, 0, 0)
  gradient.addColorStop(0, styles.getPropertyValue('--viz-low').trim() || '#c81e1e')
  gradient.addColorStop(1, styles.getPropertyValue('--viz-high').trim() || '#f5a524')

  context.clearRect(0, 0, width, height)
  context.fillStyle = gradient
  const gap = 2 * ratio
  const barWidth = (width - gap * (levels.length - 1)) / levels.length
  levels.forEach((level, index) => {
    const barHeight = Math.max(2 * ratio, level * height)
    context.fillRect(index * (barWidth + gap), height - barHeight, barWidth, barHeight)
  })
}

const SILENCE: readonly number[] = Array.from({ length: BAR_COUNT }, () => 0)

/**
 * The Amp Console: a view onto the global preview player for one track. If this track is the
 * one already playing (e.g. started here, then the user browsed away and came back), it shows
 * and controls that ongoing playback — nothing restarts.
 */
function AudioPreviewPlayer({ track }: AudioPreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const player = usePlayer()

  const isCurrent = player.track?.id === track.id
  const isPlaying = isCurrent && player.isPlaying
  const currentTime = isCurrent ? player.currentTime : 0
  const duration = isCurrent ? player.duration : PREVIEW_SECONDS
  const title = `${track.title} by ${track.artist}`

  // Draw the analyser bars while this track plays; flat bars otherwise.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!isPlaying) {
      drawBars(canvas, SILENCE)
      return
    }
    let frameId = 0
    const tick = () => {
      const data = readFrequencies()
      drawBars(canvas, data ? bucketFrequencies(data, BAR_COUNT) : SILENCE)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isPlaying])

  const activePreset = EQ_PRESETS[player.presetId]

  return (
    <section className="amp-console" aria-label={`Amp Console — ${title}`}>
      <header className="amp-header">
        <h2 className="amp-title">Amp Console</h2>
        <span className={`amp-led amp-led--${isPlaying ? 'on' : 'off'}`} aria-hidden="true" />
      </header>

      <canvas ref={canvasRef} className="amp-visualizer" aria-hidden="true" data-engine={player.engine} />
      {player.engine === 'unavailable' && (
        <p className="amp-note">
          Web Audio isn't available here, so the preview plays without EQ or visualizer.
        </p>
      )}

      <div className="amp-transport">
        <button
          type="button"
          className="amp-play"
          onClick={() => void togglePlay(track)}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          className="amp-scrubber"
          min={0}
          max={duration}
          step={0.1}
          value={Math.min(currentTime, duration)}
          disabled={!isCurrent}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatDuration(currentTime * 1000)} of ${formatDuration(duration * 1000)}`}
        />
        <span className="amp-time">
          {formatDuration(currentTime * 1000)} / {formatDuration(duration * 1000)}
        </span>
      </div>

      <div className="amp-presets" role="group" aria-label="EQ presets">
        {EQ_PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="amp-preset"
            aria-pressed={id === player.presetId}
            disabled={player.engine === 'unavailable'}
            title={EQ_PRESETS[id].description}
            onClick={() => setPreset(id)}
          >
            {EQ_PRESETS[id].label}
          </button>
        ))}
      </div>
      <p className="amp-note">
        {activePreset.label}: {activePreset.description.toLowerCase()} (bass{' '}
        {formatGain(activePreset.bassDb)}, mid {formatGain(activePreset.midDb)}, treble{' '}
        {formatGain(activePreset.trebleDb)} dB).
      </p>

      {isCurrent && player.error && (
        <p className="amp-error" role="alert">
          {player.error}
        </p>
      )}
    </section>
  )
}

const formatGain = (db: number): string => (db > 0 ? `+${db}` : String(db))

export default AudioPreviewPlayer
