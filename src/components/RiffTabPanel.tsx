import type { GuitarRiffTab } from '../types/riff'
import { GUITAR_STRINGS } from '../utils/riffTabs'

export interface RiffTabPanelProps {
  tab: GuitarRiffTab
  subgenre: string
  activeStep: number | null // playhead column, null when nothing is playing
}

/** 6-string tab viewer: tuning/BPM/difficulty badges and an aligned tab with a playhead. */
function RiffTabPanel({ tab, subgenre, activeStep }: RiffTabPanelProps) {
  const isSignature = tab.kind === 'signature'

  return (
    <section className="riff-panel" aria-labelledby="riff-panel-title">
      <header className="riff-header">
        <p className="riff-kind">{isSignature ? 'Signature riff tab' : 'Practice riff tab'}</p>
        <h2 id="riff-panel-title" className="riff-title">
          {tab.title}
        </h2>
        <ul className="riff-badges" aria-label="Riff details">
          <li className="riff-badge">{tab.tuning}</li>
          <li className="riff-badge">≈ {tab.bpm} BPM</li>
          <li className={`riff-badge riff-badge--${tab.difficulty.toLowerCase()}`}>
            {tab.difficulty}
          </li>
        </ul>
      </header>

      <div className="riff-tab" role="group" aria-label={`Guitar tab in ${tab.tuning}`}>
        {GUITAR_STRINGS.map((string) => (
          <div key={string} className="riff-row">
            <span className="riff-string">{string}</span>
            <span aria-hidden="true">|-</span>
            {tab.columns.map((column, index) => (
              <span
                key={index}
                className={index === activeStep ? 'riff-cell riff-cell--active' : 'riff-cell'}
              >
                {column.cells[string]}
                <span aria-hidden="true">-</span>
              </span>
            ))}
            <span aria-hidden="true">|</span>
          </div>
        ))}
      </div>

      <p className="riff-note">
        {isSignature
          ? 'A simplified tab of the song’s opening riff. The highlight follows the preview at the riff’s tempo.'
          : `A practice riff in the style of ${subgenre} — not a transcription of this recording. The highlight follows the preview at the suggested tempo.`}
      </p>
    </section>
  )
}

export default RiffTabPanel
