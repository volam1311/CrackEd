import { formatDuration } from '../../lib/format'
import type { Clip } from './types'

type ReviewStepProps = {
  clips: Clip[]
  onChange: (clips: Clip[]) => void
}

export function ReviewStep({ clips, onChange }: ReviewStepProps) {
  function update(id: string, patch: Partial<Clip>) {
    onChange(clips.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <p className="mb-4 text-sm text-muted">
        Edit clip titles or exclude a segment before publishing. Timestamps are
        mocked until the AI splitter is wired up.
      </p>
      {clips.map((clip, i) => (
        <article
          key={clip.id}
          className={[
            'rounded-xl border bg-surface p-4',
            clip.included ? 'border-border' : 'border-border opacity-50',
          ].join(' ')}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={clip.included}
                onChange={(e) => update(clip.id, { included: e.target.checked })}
                className="accent-accent"
              />
              Clip {i + 1}
            </label>
            <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-xs text-muted">
              {formatDuration(clip.start)} – {formatDuration(clip.end)}
            </span>
          </div>
          <input
            value={clip.title}
            onChange={(e) => update(clip.id, { title: e.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-white outline-none focus:border-accent/50"
          />
        </article>
      ))}
    </div>
  )
}
