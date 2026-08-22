import { useState } from 'react'
import type { Video } from '../../types'
import { formatAge, formatDuration, formatViews, summariseDescription } from '../../lib/format'
import { Icon } from '../ui/Icon'

type TodaysPickProps = {
  video: Video
  onPlay: (video: Video) => void
}

export function TodaysPick({ video, onPlay }: TodaysPickProps) {
  const [failed, setFailed] = useState(false)
  const showPlaceholder = failed || !video.thumbnailUrl
  const summary = summariseDescription(video.description)

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <button
        type="button"
        onClick={() => onPlay(video)}
        className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-surface"
      >
        {showPlaceholder ? (
          <div className="size-full bg-gradient-to-br from-surface via-elevated to-surface" />
        ) : (
          <img
            src={video.thumbnailUrl}
            alt=""
            onError={() => setFailed(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <span className="absolute right-3 bottom-3 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white tabular-nums">
          {formatDuration(video.durationSeconds)}
        </span>
      </button>

      <div className="flex flex-col justify-center">
        <p className="text-xs font-bold tracking-widest text-accent uppercase">
          Today&apos;s pick
        </p>

        <h1 className="mt-3 text-2xl leading-tight font-bold text-text xl:text-3xl">
          {video.title}
        </h1>

        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
          <span>{video.channel}</span>
          {video.channelVerified ? (
            <Icon name="verified" className="size-4 shrink-0" filled />
          ) : null}
        </p>

        <p className="mt-1 text-sm text-muted">
          {formatViews(video.views)} • {formatAge(video.publishedAt)}
        </p>

        {summary ? (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted">{summary}</p>
        ) : null}

        <button
          type="button"
          onClick={() => onPlay(video)}
          className="mt-6 flex w-fit items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <Icon name="play" className="size-4" filled />
          Watch Now
        </button>
      </div>
    </section>
  )
}
