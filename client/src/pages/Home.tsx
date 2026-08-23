import { useEffect, useMemo, useState } from 'react'
import { fetchContinueLearning, fetchFeed, fetchTodaysPick } from '../api'
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

  /*
   * Chips are derived from whatever is actually in the feed rather than a fixed
   * list. A hardcoded list silently hides videos: everything ingested from the
   * API lands in one category, and any category not on the list is unreachable
   * through the filter.
   */
  const categoryOptions = useMemo(() => {
    const present = [...new Set(feed.map((video) => video.category).filter(Boolean))]
    return ['All', ...present.sort()]
  }, [feed])

  // Guard against a stale selection when the feed changes underneath it.
  const activeCategory = categoryOptions.includes(category) ? category : 'All'

  // The featured video has its own slot above, so keep it out of the grid.
  const recommended = useMemo(() => {
    const withoutPick = feed.filter((video) => video.id !== todaysPick?.id)
    return activeCategory === 'All'
      ? withoutPick
      : withoutPick.filter((video) => video.category === activeCategory)
  }, [feed, activeCategory, todaysPick])

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
      <CategoryChips
        categories={categoryOptions}
        active={activeCategory}
        onChange={setCategory}
      />

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

      <PlayerModal video={playing} onClose={() => setPlaying(null)} onSelectVideo={setPlaying} />
    </>
  )
}
