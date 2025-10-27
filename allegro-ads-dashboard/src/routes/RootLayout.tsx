import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { signOut, onAuthChange } from '../services/auth'
import type { User } from 'firebase/auth'
import omniheroLogo from '../assets/omnihero-logo.png'
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
        
        {user && (
          <div className="sidebar-user">
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
        
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Dashboard
          </NavLink>
          <NavLink to="/allegro-ads" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Allegro Ads
          </NavLink>
          <NavLink to="/schedules" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Harmonogramy
          </NavLink>
          <NavLink to="/integrations" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Integracje
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}


