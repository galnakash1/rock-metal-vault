import type { FestivalLineup, LineupAct, PosterTheme } from '../types/track'
import { formatDuration } from '../utils/trackUtils'

export interface FestivalPosterProps {
  lineup: FestivalLineup
  theme: PosterTheme
  festivalName?: string
}

function ActMeta({ act }: { act: LineupAct }) {
  return (
    <span className="poster-act-meta">
      <span aria-hidden="true">{act.originFlag}</span> {act.originCountry} · {act.subgenre}
    </span>
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
