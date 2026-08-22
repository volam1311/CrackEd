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

/*
 * YouTube descriptions are mostly housekeeping: cross-promo links, home pages,
 * music credits, patron thanks, chapter timestamps. Real data from the ingested
 * library runs to a median of ~1,400 characters and a maximum of ~3,800, with
 * the one or two useful sentences buried somewhere in the middle.
 *
 * This trims to the part worth reading. It is display-only - the full text stays
 * in the database, so nothing is lost and the rule can be changed freely.
 */

const URL_PATTERN = /https?:\/\/\S+|www\.\S+/gi

/** Lines that are housekeeping rather than description. */
const BOILERPLATE_LINE =
  /^\s*(home\s?page|website|music|soundtrack|thanks|thank you|special thanks|support|patreon|donate|merch|twitter|x|instagram|tiktok|discord|facebook|newsletter|mailing list|subscribe|follow|credits?|links?|chapters?|timestamps?|table of contents|correction|errata)\b/i

/** A chapter/timestamp line such as "0:00 Introduction". */
const TIMESTAMP_LINE = /^\s*\d{1,2}:\d{2}(:\d{2})?\b/

export function summariseDescription(description: string, maxChars = 220): string {
  if (!description) return ''

  const kept = description
    .split(/\r?\n/)
    .map((line) => line.replace(URL_PATTERN, '').trim())
    .filter((line) => {
      if (!line) return false
      if (TIMESTAMP_LINE.test(line)) return false
      if (BOILERPLATE_LINE.test(line)) return false
      // A line left as punctuation-only once its link was removed carried nothing.
      if (!/[a-z]{3}/i.test(line)) return false
      // Ends with a colon: it was introducing the link we just stripped, e.g.
      // "Full text of the poem here:" - keeping it strands a dangling lead-in.
      if (/[:\-–]$/.test(line)) return false
      // Short "Label: value" leftovers are credits (translations, music, names),
      // not description. Real sentences of this length rarely carry a colon.
      if (line.length < 40 && line.includes(':')) return false
      return true
    })

  const text = kept.join(' ').replace(/\s{2,}/g, ' ').trim()
  if (text.length <= maxChars) return text

  // Prefer cutting at a sentence end, then a word, rather than mid-word.
  const window = text.slice(0, maxChars)
  const sentenceEnd = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
  if (sentenceEnd > maxChars * 0.5) return window.slice(0, sentenceEnd + 1)

  const wordEnd = window.lastIndexOf(' ')
  return `${window.slice(0, wordEnd > 0 ? wordEnd : maxChars).trimEnd()}…`
}
