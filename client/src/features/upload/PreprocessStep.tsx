import { Check, LoaderCircle } from 'lucide-react'
import { PREPROCESS_STAGES, type PreprocessJob, type VideoDetails } from './types'

type PreprocessStepProps = {
  job: PreprocessJob
  details: VideoDetails
  onToggleFiller: (value: boolean) => void
}

export function PreprocessStep({
  job,
  details,
  onToggleFiller,
}: PreprocessStepProps) {
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-6 text-sm text-muted">
        Simulated AI pipeline — Person 2 can swap this for the real job later.
        Split points and clip titles are mocked from the video length.
      </p>

      <label className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
        <input
          type="checkbox"
          checked={details.removeFiller}
          onChange={(e) => onToggleFiller(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        <span>
          <span className="block font-medium text-white">
            Remove pauses and filler
          </span>
          <span className="text-muted">Optional. Applied during preprocess.</span>
        </span>
      </label>

      <ol className="space-y-3">
        {PREPROCESS_STAGES.map((stage, i) => {
          const skipFiller = i === 3 && !details.removeFiller
          const done = job.complete || i < job.stageIndex
          const active = job.running && i === job.stageIndex && !skipFiller

          return (
            <li
              key={stage}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span className="grid size-7 place-items-center">
                {skipFiller ? (
                  <span className="size-2 rounded-full bg-border" />
                ) : done ? (
                  <Check className="size-4 text-emerald-400" />
                ) : active ? (
                  <LoaderCircle className="size-4 animate-spin text-accent" />
                ) : (
                  <span className="size-2 rounded-full bg-border" />
                )}
              </span>
              <span
                className={
                  skipFiller
                    ? 'text-sm text-muted line-through'
                    : 'text-sm text-text'
                }
              >
                {stage}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
