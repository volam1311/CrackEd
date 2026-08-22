import { Mic, Monitor, Music, Pencil } from 'lucide-react'

const TIPS = [
  {
    icon: Mic,
    text: 'Record in a quiet environment for better transcripts.',
  },
  {
    icon: Monitor,
    text: 'Slides or screen capture improve accuracy.',
  },
  {
    icon: Music,
    text: 'Longer videos are automatically split into 5–10 min clips.',
  },
  {
    icon: Pencil,
    text: 'You can review and edit before publishing.',
  },
] as const

export function TipsRow() {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-medium text-muted">
        Tips for best results
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TIPS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
