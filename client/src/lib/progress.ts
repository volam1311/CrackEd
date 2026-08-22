/**
 * Local learner profile: watch progress, daily goal, streak and quiz points.
 *
 * Everything lives in localStorage. There is no auth and no user model on the
 * server yet, so this is deliberately per-browser and spoofable — enough to make
 * the streak, Continue-learning and leaderboard real rather than hardcoded,
 * without blocking on a backend nobody has scoped.
 *
 * Reads go through a cached snapshot so `useSyncExternalStore` sees a stable
 * reference and does not re-render forever.
 */

const STORAGE_KEY = 'cracked.profile.v1'

/** Videos per day the sidebar goal counts towards. */
export const DAILY_GOAL = 5

export type Profile = {
  nickname: string
  points: number
  /** videoId → seconds of the video actually spent with the player open. */
  watchedSeconds: Record<string, number>
  /** videoId → best quiz score, as correct/total. */
  quizScores: Record<string, { correct: number; total: number }>
  /** ISO date (YYYY-MM-DD) → count of distinct videos opened that day. */
  dailyVideos: Record<string, string[]>
  /** Consecutive days with at least one video, as of `lastActiveDate`. */
  streakDays: number
  lastActiveDate: string | null
}

const emptyProfile: Profile = {
  nickname: 'You',
  points: 0,
  watchedSeconds: {},
  quizScores: {},
  dailyVideos: {},
  streakDays: 0,
  lastActiveDate: null,
}

let cache: Profile | null = null
const listeners = new Set<() => void>()

function todayKey(now: Date = new Date()): string {
  // Local date, not UTC — a streak should follow the learner's own midnight.
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

function read(): Profile {
  if (cache) return cache

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? { ...emptyProfile, ...(JSON.parse(raw) as Partial<Profile>) } : emptyProfile
  } catch {
    // Private mode, blocked storage, or corrupt JSON — fall back to empty.
    cache = emptyProfile
  }
  return cache
}

function write(next: Profile): void {
  cache = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: keep the in-memory value so the session still works.
  }
  listeners.forEach((listener) => listener())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): Profile {
  return read()
}

/** Marks today active and rolls the streak forward (or resets it after a gap). */
function withTodayActive(profile: Profile, videoId: string): Profile {
  const today = todayKey()
  const seenToday = profile.dailyVideos[today] ?? []
  const dailyVideos = seenToday.includes(videoId)
    ? profile.dailyVideos
    : { ...profile.dailyVideos, [today]: [...seenToday, videoId] }

  if (profile.lastActiveDate === today) {
    return { ...profile, dailyVideos }
  }

  const gap = profile.lastActiveDate ? daysBetween(profile.lastActiveDate, today) : null
  const streakDays = gap === 1 ? profile.streakDays + 1 : 1

  return { ...profile, dailyVideos, streakDays, lastActiveDate: today }
}

/** Adds real watch time for a video. Called when the player closes. */
export function recordWatch(videoId: string, seconds: number): void {
  if (seconds <= 0) return

  const profile = read()
  const next = withTodayActive(
    {
      ...profile,
      watchedSeconds: {
        ...profile.watchedSeconds,
        [videoId]: (profile.watchedSeconds[videoId] ?? 0) + seconds,
      },
    },
    videoId,
  )
  write(next)
}

/** Points are awarded for understanding, never for speed. */
export function pointsFor(correct: number, total: number): number {
  const base = correct * 10
  const perfectBonus = total > 0 && correct === total ? 20 : 0
  return base + perfectBonus
}

/** Records a quiz attempt, keeping the best score and awarding the difference. */
export function recordQuiz(videoId: string, correct: number, total: number): number {
  const profile = read()
  const previous = profile.quizScores[videoId]

  const earned = pointsFor(correct, total)
  const previouslyEarned = previous ? pointsFor(previous.correct, previous.total) : 0
  // Re-taking a quiz can only ever top up to the new best, never double-count.
  const delta = Math.max(0, earned - previouslyEarned)

  const isBest = !previous || correct > previous.correct
  write({
    ...profile,
    points: profile.points + delta,
    quizScores: isBest
      ? { ...profile.quizScores, [videoId]: { correct, total } }
      : profile.quizScores,
  })

  return delta
}

export function setNickname(nickname: string): void {
  const trimmed = nickname.trim()
  if (!trimmed) return
  write({ ...read(), nickname: trimmed.slice(0, 24) })
}

/** Distinct videos opened today, for the sidebar goal. */
export function videosToday(profile: Profile): number {
  return (profile.dailyVideos[todayKey()] ?? []).length
}

/** Percent of a video watched, clamped to 0–100. */
export function watchedPct(profile: Profile, videoId: string, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0
  const seconds = profile.watchedSeconds[videoId] ?? 0
  return Math.min(100, Math.round((seconds / durationSeconds) * 100))
}
