import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

/**
 * Layout route: the sidebar and top bar mount once and persist across
 * navigation, with each page rendering into the <Outlet />.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-svh bg-bg">
      <div className="fixed top-0 left-0 z-50 hidden h-16 w-60 items-center px-6 md:flex">
        <Link to="/" className="text-2xl font-extrabold tracking-tight">
          <span className="text-text">Crack</span>
          <span className="text-accent">Ed</span>
        </Link>
      </div>

      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />

      <div className="md:pl-60">
        <TopBar onToggleNav={() => setNavOpen((open) => !open)} />
        <main className="px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
