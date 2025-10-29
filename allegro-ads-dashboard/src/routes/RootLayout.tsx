import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { signOut, onAuthChange } from '../services/auth'
import type { User } from 'firebase/auth'
import omniheroLogo from '../assets/omnihero-logo.svg'
import './layout.css'

export function RootLayout() {
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthChange(setUser)
    return unsubscribe
  }, [])

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="brand">
            <img src={omniheroLogo} alt="Omnihero" className="brand-logo" />
          </Link>
        </div>
        
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Dashboard
          </NavLink>

          <div className="nav-category">Sprzedaż</div>
          <NavLink to="/sales-summary" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Podsumowanie
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Produkty
          </NavLink>
          <NavLink to="/offers" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Oferty
          </NavLink>
          <NavLink to="/profitability" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Rentowność
          </NavLink>

          <div className="nav-category">Allegro Ads</div>
          <NavLink to="/ads-stats" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Statystyki
          </NavLink>
          <NavLink to="/allegro-ads" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Edycja
          </NavLink>
          <NavLink to="/schedules" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Harmonogram
          </NavLink>

          <div className="nav-category">Analizy</div>

          <div className="nav-category">Adminka</div>
          <NavLink to="/integrations" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Integracje
          </NavLink>
          <NavLink to="/administration" className={({ isActive }) => isActive ? 'nav-item nav-subitem active' : 'nav-item nav-subitem'}>
            Administracja
          </NavLink>
        </nav>

        {user && (
          <div className="sidebar-user-bottom">
            <div className="user-info">
              <div className="user-avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} />
                ) : (
                  <span>{user.email?.[0].toUpperCase()}</span>
                )}
              </div>
              <div className="user-details">
                <div className="user-name">{user.displayName || 'User'}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
            <button className="signout-btn" onClick={handleSignOut} title="Wyloguj">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h6v2H4v8h4v2H2V2zm7 4l5 3-5 3V6z"/>
              </svg>
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}


