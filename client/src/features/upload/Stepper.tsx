import { STEPS, type StepId } from './types'

type StepperProps = {
  current: StepId
  maxReachable: StepId
  onSelect: (step: StepId) => void
}

function indexOf(id: StepId) {
  return STEPS.findIndex((s) => s.id === id)
}

export function Stepper({ current, maxReachable, onSelect }: StepperProps) {
  const currentIndex = indexOf(current)
  const maxIndex = indexOf(maxReachable)

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((step, i) => {
        const isCurrent = step.id === current
        const reachable = i <= maxIndex
        const done = i < currentIndex

        return (
          <li key={step.id} className="flex items-center gap-2">
            {i > 0 ? (
              <span className="hidden text-muted sm:inline" aria-hidden>
                →
              </span>
            ) : null}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onSelect(step.id)}
              className="flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <span
                className={[
                  'grid size-7 place-items-center rounded-full text-xs font-semibold',
                  isCurrent
                    ? 'bg-accent text-white'
                    : done
                      ? 'bg-accent/20 text-accent'
                      : 'bg-elevated text-muted',
                ].join(' ')}
              >
                {i + 1}
              </span>
              <span
                className={
                  isCurrent ? 'font-medium text-white' : 'text-muted'
                }
              >
                {step.label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
