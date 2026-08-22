import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'

type TopBarProps = {
  onToggleNav: () => void
}

export function TopBar({ onToggleNav }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/95 px-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggleNav}
        aria-label="Toggle navigation"
        className="rounded-lg p-2 text-muted hover:bg-surface hover:text-text md:hidden"
      >
        <Icon name="menu" className="size-6" />
      </button>

      <Link to="/" className="text-xl font-extrabold tracking-tight md:hidden">
        <span className="text-text">Crack</span>
        <span className="text-accent">Ed</span>
      </Link>

      <div className="mx-auto hidden w-full max-w-2xl md:block">
        <SearchInput />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <Link
          to="/upload"
          className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface sm:flex"
        >
          <Icon name="upload" className="size-4" />
          Upload
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-2 text-muted hover:bg-surface hover:text-text"
        >
          <Icon name="bell" className="size-5" />
        </button>
        <div
          className="size-9 shrink-0 rounded-full bg-gradient-to-br from-accent to-purple-600"
          aria-hidden="true"
        />
      </div>
    </header>
  )
}

/** Submits to /search, which queries the whole library rather than the loaded page. */
function SearchInput() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [term, setTerm] = useState(params.get('q') ?? '')

  return (
    <form
      className="relative"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const query = term.trim()
        if (query) navigate(`/search?q=${encodeURIComponent(query)}`)
      }}
    >
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search videos, topics, or channels..."
        aria-label="Search videos, topics, or channels"
        className="w-full rounded-full border border-border bg-surface py-2.5 pr-4 pl-11 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </form>
  )
}
