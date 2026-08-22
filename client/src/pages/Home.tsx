import { useEffect, useMemo, useState } from 'react'
import { fetchContinueLearning, fetchFeed, fetchTodaysPick } from '../api'
import { categories } from '../mocks/videos'
import type { Video, VideoWithProgress } from '../types'
import { CategoryChips } from '../components/ui/CategoryChips'
import { PlayerModal } from '../components/video/PlayerModal'
import { TodaysPick } from '../components/video/TodaysPick'
import { VideoRow } from '../components/video/VideoRow'

export function Home() {
  const [feed, setFeed] = useState<Video[]>([])
  const [todaysPick, setTodaysPick] = useState<Video | null>(null)
  const [continueLearning, setContinueLearning] = useState<VideoWithProgress[]>([])
  const [category, setCategory] = useState<string>('All')
  const [playing, setPlaying] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchTodaysPick(), fetchFeed(), fetchContinueLearning()])
      .then(([pick, videos, inProgress]) => {
        if (cancelled) return
        setTodaysPick(pick)
        setFeed(videos)
        setContinueLearning(inProgress)
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
