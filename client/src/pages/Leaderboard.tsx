import { useMemo, useState } from 'react'
import { rivals } from '../mocks/leaderboard'
import { useProfile } from '../lib/useProfile'
import { setNickname, videosToday, DAILY_GOAL } from '../lib/progress'
import { Icon } from '../components/ui/Icon'

type Row = {
  id: string
  nickname: string
  points: number
  streakDays: number
  isYou: boolean
}

export function Leaderboard() {
  const profile = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile.nickname)

  const rows = useMemo<Row[]>(() => {
    const you: Row = {
      id: 'you',
      nickname: profile.nickname,
      points: profile.points,
      streakDays: profile.streakDays,
      isYou: true,
    }
    const others: Row[] = rivals.map((rival) => ({ ...rival, isYou: false }))

    // Ties resolve in the learner's favour, so passing someone feels like passing them.
    return [...others, you].sort((a, b) => b.points - a.points || (a.isYou ? -1 : 1))
  }, [profile])

  const yourRank = rows.findIndex((row) => row.isYou) + 1
  const above = rows[yourRank - 2]

  function saveNickname() {
    setNickname(draft)
    setEditing(false)
  }

  return (
    <section className="mx-auto max-w-3xl py-6">
      <h1 className="text-2xl font-bold text-text">Leaderboard</h1>
      <p className="mt-2 text-sm text-muted">
        Points come from quiz accuracy, never from how fast you answer.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Your points" value={profile.points.toString()} />
        <Stat label="Rank" value={`#${yourRank}`} />
        <Stat
          label="Day streak"
          value={profile.streakDays > 0 ? `${profile.streakDays}` : '—'}
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        {videosToday(profile)} of {DAILY_GOAL} videos today
        {above ? (
          <>
            {' • '}
            {above.points - profile.points} points behind {above.nickname}
          </>
        ) : (
          ' • you are top of the board'
        )}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 ${
              row.isYou ? 'bg-accent/10' : 'bg-surface'
            }`}
          >
            <span
              className={`w-8 shrink-0 text-sm font-bold tabular-nums ${
                index < 3 ? 'text-accent' : 'text-muted'
              }`}
            >
              {index + 1}
            </span>

            <span className="flex-1 truncate text-sm font-medium text-text">
              {row.nickname}
              {row.isYou ? <span className="ml-2 text-xs text-accent">you</span> : null}
            </span>

            <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
              <Icon name="flame" className="size-3.5" filled />
              {row.streakDays}
            </span>

            <span className="w-16 shrink-0 text-right text-sm font-semibold text-text tabular-nums">
              {row.points}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        {editing ? (
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveNickname()
              }}
              maxLength={24}
              aria-label="Your display name"
              className="flex-1 rounded-full border border-border bg-elevated px-4 py-2 text-sm text-text focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={saveNickname}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Playing as <span className="font-semibold text-text">{profile.nickname}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(profile.nickname)
                setEditing(true)
              }}
              className="rounded-full border border-border px-4 py-2 text-sm text-text hover:bg-elevated"
            >
              Change name
            </button>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Scores are stored in this browser only — there is no sign-in yet, so the other
          entries are seeded rather than real people.
        </p>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-bold text-text tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  )
}
