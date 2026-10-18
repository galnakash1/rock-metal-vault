import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { togglePlay } from '../audio/playerEngine'
import { usePlayer } from '../hooks/usePlayer'
import type { ComparisonRow, Track } from '../types/track'
import { compareTracks } from '../utils/arenaUtils'
import { getLeadArtistKey } from '../utils/artistMetadata'
import { upgradeArtworkUrl } from '../utils/trackUtils'
import SetlistButton from './SetlistButton'
import TrackSelect from './TrackSelect'

export interface HeadToHeadProps {
  tracks: Track[] // already sorted for the pickers
  isInSetlist: (trackId: number) => boolean
  onToggleSetlist: (track: Track) => void
}

/** Play/pause for one contender. Only this button subscribes to playback updates. */
function PreviewToggle({ track }: { track: Track }) {
  const player = usePlayer()
  const isPlaying = !player.concealed && player.track?.id === track.id && player.isPlaying
  return (
    <button
      type="button"
      className="preview-toggle"
      onClick={() => void togglePlay(track)}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play the ${track.title} preview`}
    >
      <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span> {isPlaying ? 'Pause' : 'Preview'}
    </button>
  )
}

interface ContenderProps {
  side: 'a' | 'b'
  track: Track
  rows: ComparisonRow[]
  inSetlist: boolean
  onToggleSetlist: () => void
}

function Contender({ side, track, rows, inSetlist, onToggleSetlist }: ContenderProps) {
  const wins = rows.filter((row) => row.winner === side)
  return (
    <article className={`contender contender--${side}`} aria-label={`Track ${side.toUpperCase()}`}>
      <img
        className="contender-art"
        src={upgradeArtworkUrl(track.artworkUrl, 300)}
        alt={`${track.album} album artwork`}
        width={300}
        height={300}
      />
      <div className="contender-body">
        <h3 className="contender-title">
          <Link to={`/tracks/${track.id}`}>{track.title}</Link>
        </h3>
        <p className="track-card-artist">{track.artist}</p>
        <p className="track-card-origin">
          <span aria-hidden="true">{track.originFlag}</span> {track.originCountry} ·{' '}
          <span className="style-badge">{track.subgenre}</span>
        </p>
        {wins.length > 0 && (
          <ul className="contender-wins" aria-label="Wins">
            {wins.map((row) => (
              <li key={row.label} className="win-badge">
                {row.winnerNote ?? row.label}
              </li>
            ))}
          </ul>
        )}
        <div className="contender-actions">
          <PreviewToggle track={track} />
          <SetlistButton
            variant="compact"
            trackTitle={track.title}
            inSetlist={inSetlist}
            onToggle={onToggleSetlist}
          />
        </div>
      </div>
    </article>
  )
}

/** Head-to-Head Track Battle: pick any two tracks and compare them side by side. */
function HeadToHead({ tracks, isInSetlist, onToggleSetlist }: HeadToHeadProps) {
  const [trackAId, setTrackAId] = useState<number | null>(null)
  const [trackBId, setTrackBId] = useState<number | null>(null)

  // Defaults: the first track, against the first track by a different artist.
  const trackA = tracks.find((track) => track.id === trackAId) ?? tracks[0]
  const trackB =
    tracks.find((track) => track.id === trackBId) ??
    tracks.find(
      (track) => trackA && getLeadArtistKey(track.artist) !== getLeadArtistKey(trackA.artist),
    ) ??
    tracks[1]

  const rows = useMemo(
    () => (trackA && trackB ? compareTracks(trackA, trackB) : []),
    [trackA, trackB],
  )

  if (!trackA || !trackB) return null

  return (
    <section className="head-to-head" aria-labelledby="head-to-head-title">
      <header className="arena-section-header">
        <div>
          <h2 id="head-to-head-title">Head-to-Head Track Battle</h2>
          <p className="page-summary">
            Pick any two tracks. The longer track and the more vintage release take the win.
          </p>
        </div>
      </header>

      <div className="head-to-head-pickers">
        <TrackSelect id="track-a" label="Track A" tracks={tracks} value={trackA.id} onChange={setTrackAId} />
        <TrackSelect id="track-b" label="Track B" tracks={tracks} value={trackB.id} onChange={setTrackBId} />
      </div>

      {trackA.id === trackB.id && (
        <p className="head-to-head-note" role="status">
          Same track on both sides — pick a different Track B for a real battle.
        </p>
      )}

      <div className="head-to-head-arena">
        <Contender
          side="a"
          track={trackA}
          rows={rows}
          inSetlist={isInSetlist(trackA.id)}
          onToggleSetlist={() => onToggleSetlist(trackA)}
        />
        <span className="versus" aria-hidden="true">
          VS
        </span>
        <Contender
          side="b"
          track={trackB}
          rows={rows}
          inSetlist={isInSetlist(trackB.id)}
          onToggleSetlist={() => onToggleSetlist(trackB)}
        />
      </div>

      <table className="comparison-table">
        <caption className="sr-only">
          {trackA.title} versus {trackB.title}
        </caption>
        <thead>
          <tr>
            <th scope="col">Track A</th>
            <th scope="col">
              <span className="sr-only">Attribute</span>
            </th>
            <th scope="col">Track B</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className={row.winner === 'a' ? 'is-winner' : undefined}>
                {row.valueA}
                {row.winner === 'a' && <span className="win-badge">{row.winnerNote}</span>}
              </td>
              <th scope="row">{row.label}</th>
              <td className={row.winner === 'b' ? 'is-winner' : undefined}>
                {row.valueB}
                {row.winner === 'b' && <span className="win-badge">{row.winnerNote}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default HeadToHead
