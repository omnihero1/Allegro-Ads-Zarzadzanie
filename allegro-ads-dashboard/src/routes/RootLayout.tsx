import { Link, NavLink, Outlet } from 'react-router-dom'
import './layout.css'

export function RootLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/" className="brand">Allegro Ads</Link>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Dashboard
          </NavLink>
          <NavLink to="/allegro-ads" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Allegro Ads
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


