import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FestivalPoster from '../components/FestivalPoster'
import StatusMessage from '../components/StatusMessage'
import type { PosterTheme, Track } from '../types/track'
import { POSTER_THEMES, buildFestivalLineup } from '../utils/setlistUtils'
import { formatDuration } from '../utils/trackUtils'

export interface SetlistPageProps {
  setlist: Track[]
  onRemove: (trackId: number) => void
  onClear: () => void
}

function SetlistPage({ setlist, onRemove, onClear }: SetlistPageProps) {
  const [theme, setTheme] = useState<PosterTheme>('blood-moon')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const lineup = useMemo(() => buildFestivalLineup(setlist), [setlist])

  const handleClear = () => {
    onClear()
    setConfirmingClear(false)
  }

  return (
    <section>
      <header className="page-header">
        <h1>Festival Poster</h1>
        <p className="page-summary">
          Your saved tracks become a festival lineup — the bands you saved most headline.
        </p>
      </header>

      {setlist.length === 0 ? (
        <StatusMessage
          variant="empty"
          title="Your lineup is empty"
          message="Add tracks from the Vault to start recruiting bands for your festival."
          action={{ label: 'Browse the Vault', to: '/' }}
        />
      ) : (
        <div className="setlist-layout">
          <div className="setlist-poster-column">
            <fieldset className="theme-switcher">
              <legend className="filter-label">Poster theme</legend>
              {POSTER_THEMES.map((option) => (
                <label
                  key={option.id}
                  className={`theme-option${option.id === theme ? ' theme-option--active' : ''}`}
                  title={option.description}
                >
                  <input
                    type="radio"
                    name="poster-theme"
                    value={option.id}
                    checked={option.id === theme}
                    onChange={() => setTheme(option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <FestivalPoster lineup={lineup} theme={theme} />
          </div>

          <section className="running-order" aria-labelledby="running-order-title">
            <div className="running-order-header">
              <h2 id="running-order-title">Running order</h2>
              <p className="page-summary">
                {lineup.trackCount} {lineup.trackCount === 1 ? 'track' : 'tracks'} ·{' '}
                {formatDuration(lineup.totalRuntimeMs)}
              </p>
            </div>

            <ol className="running-order-list">
              {setlist.map((track, index) => (
                <li key={track.id} className="running-order-item">
                  <span className="running-order-index">{index + 1}</span>
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
                      {track.artist} · <span aria-hidden="true">{track.originFlag}</span>{' '}
                      {track.subgenre}
                    </span>
                  </div>
                  <span className="running-order-duration">{formatDuration(track.durationMs)}</span>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onRemove(track.id)}
                    aria-label={`Remove ${track.title} from setlist`}
                    title="Remove"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>

            <div className="running-order-actions">
              {confirmingClear ? (
                <>
                  <span>Clear all {lineup.trackCount} tracks?</span>
                  <button type="button" className="button" onClick={handleClear}>
                    Yes, clear lineup
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setConfirmingClear(true)}
                >
                  Clear Lineup
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default SetlistPage
