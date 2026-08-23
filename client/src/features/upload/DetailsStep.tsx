import { TOPICS, type VideoDetails } from './types'

type DetailsStepProps = {
  details: VideoDetails
  onChange: (next: VideoDetails) => void
}

export function DetailsStep({ details, onChange }: DetailsStepProps) {
  function set<K extends keyof VideoDetails>(key: K, value: VideoDetails[K]) {
    onChange({ ...details, [key]: value })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className="text-xs text-muted">
        <span className="text-accent">*</span> Required
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">
          Title <span className="text-accent">*</span>
        </span>
        <input
          value={details.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          placeholder="Lecture title"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Description</span>
        <textarea
          value={details.description}
          onChange={(e) => set('description', e.target.value)}
          rows={5}
          className="w-full resize-y rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          placeholder="What will students learn from this video?"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">
          Topic / subject <span className="text-accent">*</span>
        </span>
        <select
          value={details.topic}
          onChange={(e) => set('topic', e.target.value)}
          className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        >
          <option value="">Select a topic</option>
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">
          Tags
          <span className="ml-1 text-muted">(comma separated)</span>
        </span>
        <input
          value={details.tagText}
          onChange={(e) => set('tagText', e.target.value)}
          className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          placeholder="neural networks, lecture, intro"
        />
      </label>
    </div>
  )
}
