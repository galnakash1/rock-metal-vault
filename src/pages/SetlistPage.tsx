import { Link } from 'react-router-dom'

function SetlistPage() {
  return (
    <section>
      <header className="page-header">
        <h1>Festival Poster</h1>
        <p className="page-summary">
          Save tracks from the Vault to build your festival lineup — Headliners, Underbill, and
          total runtime.
        </p>
      </header>

      <div className="empty-state">
        <p>
          Your lineup is empty — <Link to="/">go find some riffs</Link>.
        </p>
      </div>
    </section>
  )
}

export default SetlistPage
