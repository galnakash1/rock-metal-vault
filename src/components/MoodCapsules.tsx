import type { MoodId } from '../types/track'
import { MOOD_CAPSULES } from '../utils/trackUtils'

export interface MoodCapsulesProps {
  activeMood: MoodId | null
  onChange: (mood: MoodId | null) => void
}

/** Sonic Mood Capsules: "All" plus one toggle pill per mood. Clicking the active pill clears it. */
function MoodCapsules({ activeMood, onChange }: MoodCapsulesProps) {
  return (
    <div className="mood-capsules" role="group" aria-label="Sonic Mood Capsules">
      <button
        type="button"
        className="mood-pill"
        aria-pressed={activeMood === null}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {MOOD_CAPSULES.map((capsule) => (
        <button
          key={capsule.id}
          type="button"
          className="mood-pill"
          aria-pressed={activeMood === capsule.id}
          title={capsule.description}
          onClick={() => onChange(activeMood === capsule.id ? null : capsule.id)}
        >
          {capsule.label}
        </button>
      ))}
    </div>
  )
}

export default MoodCapsules
