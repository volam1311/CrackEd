export type IconName =
  | 'home'
  | 'youtube'
  | 'upload'
  | 'settings'
  | 'help'
  | 'search'
  | 'bell'
  | 'menu'
  | 'close'
  | 'play'
  | 'verified'
  | 'flame'

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9',
  youtube:
    'M3 7.5a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5zM10.5 9.5l4 2.5-4 2.5z',
  upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.8 9.5a2.2 2.2 0 1 1 3.1 2 1.7 1.7 0 0 0-.9 1.5v.5M12 17h.01',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  bell: 'M18 9a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  play: 'M7 5l12 7-12 7z',
  verified: 'M12 2.5 14.4 5l3.4-.3.6 3.4 2.9 1.8-1.6 3 1.6 3-2.9 1.8-.6 3.4-3.4-.3L12 21.5 9.6 19l-3.4.3-.6-3.4L2.7 14l1.6-3-1.6-3 2.9-1.8.6-3.4L9.6 5zM8.8 12l2.2 2.2 4.2-4.4',
  flame:
    'M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10 0 0-3 1.5-3 5 0 1.5-1 2-1.5 1.2C10 10.5 10 9 10 9s-5 2.5-5 6a7 7 0 0 0 7 7z',
}

type IconProps = {
  name: IconName
  className?: string
  /** Solid icons (play, verified) read better filled than stroked. */
  filled?: boolean
}

export function Icon({ name, className = 'size-6', filled = false }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
