import { Link, useLocation } from 'react-router-dom'

function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <section className="empty-state">
      <h1>404 — This track doesn't exist</h1>
      <p>
        Nothing is playing at <code>{pathname}</code>.
      </p>
      <Link to="/" className="button-link">
        Back to Vault
      </Link>
    </section>
  )
}

export default NotFoundPage
