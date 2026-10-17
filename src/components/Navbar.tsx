import { Link, NavLink } from 'react-router-dom'

export interface NavbarProps {
  setlistCount: number
}

function Navbar({ setlistCount }: NavbarProps) {
  return (
    <header className="navbar">
      <nav className="navbar-inner" aria-label="Main">
        <Link to="/" className="navbar-brand">
          Rock &amp; Metal Vault
        </Link>
        <ul className="navbar-links">
          <li>
            {/* `end` keeps "/" from matching every route */}
            <NavLink to="/" end className="nav-link">
              Vault Catalog
            </NavLink>
          </li>
          <li>
            <NavLink to="/setlist" className="nav-link">
              Festival Poster
              <span className="nav-badge">{setlistCount}</span>
              <span className="sr-only"> saved tracks</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/arena" className="nav-link">
              Riff Arena
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  )
}

export default Navbar
