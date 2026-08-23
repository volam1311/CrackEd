import { useState } from 'react'
import type { Video } from '../../types'
import { formatAge, formatDuration, formatViews } from '../../lib/format'
import { Icon } from '../ui/Icon'

type VideoCardProps = {
  video: Video
  onPlay: (video: Video) => void
  /** 0–100. Renders the Continue-learning progress bar when present. */
  watchedPct?: number
  /** Show the source's own title too. Used on search results, where a match
   *  can otherwise look arbitrary because the card shows the AI-rewritten title. */
  showOriginalTitle?: boolean
}

export function VideoCard({
  video,
  onPlay,
  watchedPct,
  showOriginalTitle = false,
}: VideoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPlay(video)}
      className="group flex w-full flex-col text-left"
    >
      <Thumbnail video={video} watchedPct={watchedPct} />

      <h3 className="mt-3 line-clamp-2 text-sm leading-snug font-semibold text-text">
        {video.title}
      </h3>

      {showOriginalTitle && video.originalTitle && video.originalTitle !== video.title ? (
        <p className="mt-1 line-clamp-1 text-xs text-muted italic">
          {video.originalTitle}
        </p>
      ) : null}

      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        <span className="truncate">{video.channel}</span>
        {video.channelVerified ? (
          <Icon name="verified" className="size-3.5 shrink-0 text-muted" filled />
        ) : null}
      </p>

      <p className="mt-0.5 text-xs text-muted">
        {watchedPct === undefined
          ? `${formatViews(video.views)} • ${formatAge(video.publishedAt)}`
          : `${watchedPct}% watched`}
      </p>
    </button>
  )
}

function Thumbnail({ video, watchedPct }: { video: Video; watchedPct?: number }) {
  const [failed, setFailed] = useState(false)
  // An empty src resolves to the page URL and may never fire onError, so treat
  // a missing thumbnail as failed up front. Uploaded videos have no thumbnail.
  const showPlaceholder = failed || !video.thumbnailUrl

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface">
      {showPlaceholder ? (
        <div className="size-full bg-gradient-to-br from-surface via-elevated to-surface" />
      ) : (
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
        {formatDuration(video.durationSeconds)}
      </span>

      {video.partNumber && video.totalParts ? (
        <span className="absolute top-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
          Part {video.partNumber}/{video.totalParts}
        </span>
      ) : null}

      {watchedPct !== undefined ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
          <div className="h-full bg-accent" style={{ width: `${watchedPct}%` }} />
        </div>
      ) : null}
    </div>
  )
}
