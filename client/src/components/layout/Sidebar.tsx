import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/Icon'

type NavItem = {
  to: string
  label: string
  icon: IconName
}

/**
 * Three items only. The feature-heavy sidebar in the mockups (Trending, Watch
 * Later, Playlists…) was cut from scope — see the project spec.
 */
const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/fetch', label: 'Fetch from YouTube', icon: 'youtube' },
  { to: '/upload', label: 'Upload Videos', icon: 'upload' },
]

const secondaryNav: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/help', label: 'Help', icon: 'help' },
]

function navItemClass(isActive: boolean): string {
  const base =
    'flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors'
  return isActive
    ? `${base} bg-accent/10 text-accent`
    : `${base} text-muted hover:bg-surface hover:text-text`
}

type SidebarProps = {
  /** Mobile only: the drawer is hidden off-canvas until opened from the top bar. */
  open: boolean
  onNavigate: () => void
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onNavigate}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-bg px-3 py-4 transition-transform md:pt-20 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-1 flex-col gap-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) => navItemClass(isActive)}
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Icon name="flame" className="size-5 text-accent" filled />
            <p className="text-sm font-semibold text-text">
              Stay focused,
              <br />
              keep learning.
            </p>
          </div>
          <p className="mt-3 text-xs text-muted">3 of 5 videos today</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
            <div className="h-full w-3/5 rounded-full bg-accent" />
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-3">
          {secondaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => navItemClass(isActive)}
            >
              <Icon name={item.icon} className="size-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  )
}
