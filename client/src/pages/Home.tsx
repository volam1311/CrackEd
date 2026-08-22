import { useEffect, useMemo, useState } from 'react'
import { fetchContinueLearning, fetchFeed, fetchTodaysPick } from '../api'
import { categories } from '../mocks/videos'
import type { Video, VideoWithProgress } from '../types'
import { watchedPct } from '../lib/progress'
import { useProfile } from '../lib/useProfile'
import { CategoryChips } from '../components/ui/CategoryChips'
import { PlayerModal } from '../components/video/PlayerModal'
import { TodaysPick } from '../components/video/TodaysPick'
import { VideoRow } from '../components/video/VideoRow'

export function Home() {
  const [feed, setFeed] = useState<Video[]>([])
  const [todaysPick, setTodaysPick] = useState<Video | null>(null)
  const [seededProgress, setSeededProgress] = useState<VideoWithProgress[]>([])
  const [category, setCategory] = useState<string>('All')
  const [playing, setPlaying] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const profile = useProfile()

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchTodaysPick(), fetchFeed(), fetchContinueLearning()])
      .then(([pick, videos, inProgress]) => {
        if (cancelled) return
        setTodaysPick(pick)
        setFeed(videos)
        setSeededProgress(inProgress)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load the feed')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // The featured video has its own slot above, so keep it out of the grid.
  const recommended = useMemo(() => {
    const withoutPick = feed.filter((video) => video.id !== todaysPick?.id)
    return category === 'All'
      ? withoutPick
      : withoutPick.filter((video) => video.category === category)
  }, [feed, category, todaysPick])

  /*
   * Continue learning is driven by real watch time once there is any, and falls
   * back to the seeded list on a fresh browser so the row is never empty in a
   * demo. Real entries always win — the seeded percentages are invented.
   */
  const continueLearning = useMemo<VideoWithProgress[]>(() => {
    const real = feed
      .map((video) => ({
        ...video,
        watchedPct: watchedPct(profile, video.id, video.durationSeconds),
      }))
      .filter((video) => video.watchedPct > 0)
      .sort((a, b) => b.watchedPct - a.watchedPct)

    return real.length > 0 ? real : seededProgress
  }, [feed, profile, seededProgress])

  const progressById = useMemo(
    () =>
      Object.fromEntries(
        continueLearning.map((video) => [video.id, video.watchedPct]),
      ) as Record<string, number>,
    [continueLearning],
  )

  if (loading) {
    return <p className="py-20 text-center text-sm text-muted">Loading your feed…</p>
  }

  if (error) {
    return <p className="py-20 text-center text-sm text-accent">{error}</p>
  }

  return (
    <>
      <CategoryChips categories={categories} active={category} onChange={setCategory} />

      <div className="mt-6">
        {todaysPick ? <TodaysPick video={todaysPick} onPlay={setPlaying} /> : null}
      </div>

      <VideoRow title="Recommended for you" videos={recommended} onPlay={setPlaying} />

      <VideoRow
        title="Continue learning"
        videos={continueLearning}
        onPlay={setPlaying}
        progressById={progressById}
      />

      <PlayerModal video={playing} onClose={() => setPlaying(null)} />
    </>
  )
}
