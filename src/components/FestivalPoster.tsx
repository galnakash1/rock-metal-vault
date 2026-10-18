import type { FestivalLineup, LineupAct, PosterTheme } from '../types/track'
import { WORLD_TOUR_STOPS, formatTourDate, getTourYear } from '../utils/setlistUtils'
import { formatDuration } from '../utils/trackUtils'

export interface FestivalPosterProps {
  lineup: FestivalLineup
  theme: PosterTheme
  festivalName?: string
}

/** The poster bills acts by style only — the world tour below says where they play. */
function ActMeta({ act }: { act: LineupAct }) {
  return <span className="poster-act-meta">{act.subgenre}</span>
}

const pad = (value: number): string => String(value).padStart(2, '0')
const toIsoDate = (year: number, month: number, day: number): string => `${year}-${pad(month + 1)}-${pad(day)}`

/** "World Tour Dates & Venues": the festival grounds and arenas the lineup plays. */
function WorldTour() {
  const year = getTourYear(new Date())
  return (
    <section className="poster-tour" aria-labelledby="poster-tour-title">
      <h3 className="poster-tour-title" id="poster-tour-title">
        World Tour {year} · Dates &amp; Venues
      </h3>
      <ol className="poster-tour-list">
        {WORLD_TOUR_STOPS.map((stop) => (
          <li key={stop.venue} className="poster-tour-stop">
            <time className="poster-tour-date" dateTime={toIsoDate(year, stop.month, stop.day)}>
              {formatTourDate(stop)}
            </time>
            <span className="poster-tour-venue">
              {stop.venue} <span className="poster-tour-place">· {stop.place}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Stylized festival poster; the theme only swaps CSS custom properties via data-theme. */
function FestivalPoster({ lineup, theme, festivalName = 'Vault Fest' }: FestivalPosterProps) {
  return (
    <article className="poster" data-theme={theme} aria-label={`${festivalName} festival poster`}>
      <header className="poster-header">
        <p className="poster-presents">Rock &amp; Metal Vault presents</p>
        <h2 className="poster-name">{festivalName}</h2>
      </header>

      <section className="poster-tier poster-tier--headliners" aria-label="Headliners">
        <h3 className="poster-tier-title">Headliners</h3>
        <ul className="poster-acts">
          {lineup.headliners.map((act) => (
            <li key={act.artist} className="poster-act">
              <span className="poster-act-name">{act.artist}</span>
              <ActMeta act={act} />
            </li>
          ))}
        </ul>
      </section>

      {lineup.underbill.length > 0 && (
        <section className="poster-tier poster-tier--underbill" aria-label="Main Stage underbill">
          <h3 className="poster-tier-title">Main Stage</h3>
          <ul className="poster-acts">
            {lineup.underbill.map((act) => (
              <li key={act.artist} className="poster-act">
                <span className="poster-act-name">{act.artist}</span>
                <ActMeta act={act} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <WorldTour />

      <footer className="poster-footer">
        <dl className="poster-stats">
          <div>
            <dt>Tracks</dt>
            <dd>{lineup.trackCount}</dd>
          </div>
          <div>
            <dt>Bands</dt>
            <dd>{lineup.artistCount}</dd>
          </div>
          <div>
            <dt>Runtime</dt>
            <dd>{formatDuration(lineup.totalRuntimeMs)}</dd>
          </div>
        </dl>
      </footer>
    </article>
  )
}

export default FestivalPoster
