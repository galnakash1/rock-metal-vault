import { useEffect, useRef, useState } from 'react'
import { useAmpConsole } from '../hooks/useAmpConsole'
import type { EqPresetId } from '../types/audio'
import { EQ_PRESETS, EQ_PRESET_IDS, bucketFrequencies } from '../utils/audioUtils'
import { formatDuration } from '../utils/trackUtils'

export interface AudioPreviewPlayerProps {
  src: string
  title: string
  /** Called on every animation frame while playing, and on pause/seek/end. */
  onProgress?: (seconds: number, isPlaying: boolean) => void
}

const BAR_COUNT = 32
const PREVIEW_SECONDS = 30 // iTunes previews are 30s; replaced by the real duration once known

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

/** The Amp Console: preview player with live EQ presets and a frequency-bar visualizer. */
function AudioPreviewPlayer({ src, title, onProgress }: AudioPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onProgressRef = useRef(onProgress)

  const [presetId, setPresetId] = useState<EqPresetId>('flat')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(PREVIEW_SECONDS)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const { engine, connect, readFrequencies } = useAmpConsole(audioRef, EQ_PRESETS[presetId])

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  // While playing: follow the playhead every frame and draw the analyser bars.
  useEffect(() => {
    if (!isPlaying) {
      if (canvasRef.current) drawBars(canvasRef.current, SILENCE)
      return
    }

    let frameId = 0
    const tick = () => {
      const audio = audioRef.current
      if (audio) {
        setCurrentTime(audio.currentTime)
        onProgressRef.current?.(audio.currentTime, true)
      }
      const data = readFrequencies()
      if (canvasRef.current && data) drawBars(canvasRef.current, bucketFrequencies(data, BAR_COUNT))
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, readFrequencies])

  const reportPaused = (seconds: number) => {
    setCurrentTime(seconds)
    onProgressRef.current?.(seconds, false)
  }

  const handleTogglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
      return
    }
    setPlaybackError(null)
    await connect() // must run inside the click so browsers allow the AudioContext to start
    try {
      await audio.play()
    } catch {
      setPlaybackError('The preview could not start. Try again in a moment.')
    }
  }

  const handleSeek = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    if (audio.paused) reportPaused(seconds)
    else setCurrentTime(seconds)
  }

  const activePreset = EQ_PRESETS[presetId]

  return (
    <section className="amp-console" aria-label={`Amp Console — ${title}`}>
      <header className="amp-header">
        <h2 className="amp-title">Amp Console</h2>
        <span className={`amp-led amp-led--${isPlaying ? 'on' : 'off'}`} aria-hidden="true" />
      </header>

      <audio
        ref={audioRef}
        src={src}
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={(event) => {
          setIsPlaying(false)
          reportPaused(event.currentTarget.currentTime)
        }}
        onEnded={(event) => {
          setIsPlaying(false)
          reportPaused(event.currentTarget.currentTime)
        }}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration
          if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds)
        }}
        onError={() => setPlaybackError('This preview is unavailable right now.')}
      />

      <canvas
        ref={canvasRef}
        className="amp-visualizer"
        aria-hidden="true"
        data-engine={engine}
      />
      {engine === 'unavailable' && (
        <p className="amp-note">
          Web Audio isn't available here, so the preview plays without EQ or visualizer.
        </p>
      )}

      <div className="amp-transport">
        <button
          type="button"
          className="amp-play"
          onClick={() => void handleTogglePlay()}
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
          onChange={(event) => handleSeek(Number(event.target.value))}
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
            aria-pressed={id === presetId}
            disabled={engine === 'unavailable'}
            title={EQ_PRESETS[id].description}
            onClick={() => setPresetId(id)}
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

      {playbackError && (
        <p className="amp-error" role="alert">
          {playbackError}
        </p>
      )}
    </section>
  )
}

const formatGain = (db: number): string => (db > 0 ? `+${db}` : String(db))

export default AudioPreviewPlayer
