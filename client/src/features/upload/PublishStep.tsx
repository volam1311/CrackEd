import { Check } from 'lucide-react'
import { formatBytes, formatDuration } from '../../lib/format'
import { parseTags, type Clip, type UploadedVideo, type VideoDetails } from './types'

type PublishStepProps = {
  video: UploadedVideo
  details: VideoDetails
  clips: Clip[]
  published: boolean
  onPublish: () => void
}

export function PublishStep({
  video,
  details,
  clips,
  published,
  onPublish,
}: PublishStepProps) {
  const included = clips.filter((c) => c.included)
  const tags = parseTags(details.tagText)

  if (published) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-12 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-emerald-500/20">
          <Check className="size-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Published locally</h2>
        <p className="mt-2 text-sm text-muted">
          {included.length} clip{included.length === 1 ? '' : 's'} ready. Person 1’s
          API can replace this with a real publish call.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-lg font-medium text-white">{details.title}</h2>
        <p className="mt-1 text-sm text-muted">
          {video.name} • {formatBytes(video.size)}
          {video.duration > 0 ? ` • ${formatDuration(video.duration)}` : ''}
        </p>
        {details.topic ? (
          <p className="mt-3 text-sm text-muted">Topic: {details.topic}</p>
        ) : null}
        {details.description ? (
          <p className="mt-2 text-sm text-muted">{details.description}</p>
        ) : null}
        {details.apiKey.trim() ? (
          <p className="mt-3 text-xs text-muted">
            Clip titles generated with your API key
          </p>
        ) : null}
        {tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-elevated px-2 py-0.5 text-xs text-text"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-medium text-text">
          {included.length} clips to publish
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {included.map((clip) => (
            <li key={clip.id} className="flex justify-between gap-3">
              <span className="truncate">{clip.title}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {formatDuration(clip.end - clip.start)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onPublish}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Publish
      </button>
    </div>
  )
}
