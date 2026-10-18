/**
 * Decorative concert stage behind every page: crimson and molten-amber light beams, a lightning
 * strike and rising embers. Fixed, behind content, hidden from assistive tech, animated only with
 * transform/opacity (and frozen for reduced motion).
 */
function StageBackdrop() {
  return (
    <div className="stage-backdrop" aria-hidden="true">
      <span className="stage-beam stage-beam--crimson" />
      <span className="stage-beam stage-beam--amber" />
      <span className="stage-lightning" />
      <span className="stage-embers" />
    </div>
  )
}

export default StageBackdrop
