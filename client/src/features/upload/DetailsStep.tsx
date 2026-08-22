import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { TOPICS, type VideoDetails } from './types'

type DetailsStepProps = {
  details: VideoDetails
  onChange: (next: VideoDetails) => void
}

export function DetailsStep({ details, onChange }: DetailsStepProps) {
  const [showKey, setShowKey] = useState(false)

  function set<K extends keyof VideoDetails>(key: K, value: VideoDetails[K]) {
    onChange({ ...details, [key]: value })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Title</span>
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
        <span className="mb-1.5 block text-sm text-muted">Topic / subject</span>
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

      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-violet-200">
          <KeyRound className="size-4" />
          AI split & clip titles
        </div>
        <p className="mb-3 text-xs text-violet-100/70">
          Paste your LLM API key. Preprocess uses it to split the lecture and
          generate a title for each clip, instead of keeping one long title.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">API key</span>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={details.apiKey}
              onChange={(e) => set('apiKey', e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-elevated py-2.5 pr-11 pl-3 font-mono text-sm text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20"
              placeholder="sk-..."
            />
            <button
              type="button"
              onClick={() => setShowKey((open) => !open)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-text"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <p className="mt-2 text-xs text-muted">
          Kept in this browser session only. It is not shown again on Publish.
        </p>
      </div>
    </div>
  )
}
