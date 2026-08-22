import type { Video } from '../../types'
import { VideoCard } from './VideoCard'

type VideoRowProps = {
  title: string
  videos: Video[]
  onPlay: (video: Video) => void
  /** Maps video id → percent watched, for Continue-learning rows. */
  progressById?: Record<string, number>
  showOriginalTitle?: boolean
}

export function VideoRow({
  title,
  videos,
  onPlay,
  progressById,
  showOriginalTitle,
}: VideoRowProps) {
  if (videos.length === 0) return null

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-text">{title}</h2>
        <button
          type="button"
          className="rounded-full px-3 py-1 text-sm text-muted transition-colors hover:bg-surface hover:text-text"
        >
          View all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onPlay={onPlay}
            watchedPct={progressById?.[video.id]}
            showOriginalTitle={showOriginalTitle}
          />
        ))}
      </div>
    </section>
  )
}
