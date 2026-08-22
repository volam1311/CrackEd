import { LoaderCircle, Check } from 'lucide-react'
import type { PreprocessJob } from './types'

type PreprocessStepProps = {
  job: PreprocessJob
}

export function PreprocessStep({ job }: PreprocessStepProps) {
  const progress = job.complete ? 100 : Math.round((job.stageIndex / 3) * 100)

  return (
    <div className="mx-auto max-w-md text-center py-12">
      {job.complete ? (
        <>
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-500/15">
            <Check className="size-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Processing complete</h2>
          <p className="text-sm text-muted">Your video has been split into clips. Click Continue to review them.</p>
        </>
      ) : job.running ? (
        <>
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-accent/15">
            <LoaderCircle className="size-7 animate-spin text-accent" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Processing your video...</h2>
          <p className="text-sm text-muted mb-6">
            Transcribing audio, finding split points, and generating titles.
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">{progress}%</p>
        </>
      ) : (
        <>
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-surface">
            <LoaderCircle className="size-7 text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Ready to process</h2>
          <p className="text-sm text-muted">Waiting to start...</p>
        </>
      )}
    </div>
  )
}
