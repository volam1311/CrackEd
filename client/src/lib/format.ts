/** Display helpers for video metadata. Pure — no React, no side effects. */

export function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${trimZero(views / 1_000_000)}M views`
  }
  if (views >= 1_000) {
    return `${trimZero(views / 1_000)}K views`
  }
  return views === 1 ? '1 view' : `${views} views`
}

/** `9:47`, or `1:24:13` once past an hour. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${minutes}:${pad(seconds)}`
}

/** Coarse relative age, YouTube style: `2 weeks ago`. */
export function formatAge(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return ''

  const seconds = Math.max(0, Math.floor((now.getTime() - then) / 1000))
  const units: Array<[label: string, seconds: number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]

  for (const [label, unitSeconds] of units) {
    const value = Math.floor(seconds / unitSeconds)
    if (value >= 1) {
      return `${value} ${label}${value === 1 ? '' : 's'} ago`
    }
  }
  return 'just now'
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '')
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

export function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
