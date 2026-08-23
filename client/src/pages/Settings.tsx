import { useState } from 'react'
import { type AiProvider, type ApiKeys, useApiKeys } from '../lib/apiKeys'

const AI_PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
]

const AI_PROVIDER_KEY_HELP: Record<AiProvider, string> = {
  openai: 'Get a key from platform.openai.com under your account\'s API keys page.',
  anthropic: 'Get a key from console.anthropic.com under Settings → API Keys.',
  gemini: 'Get a free key from Google AI Studio at aistudio.google.com/apikey.',
}

export function Settings() {
  const { keys, setKeys } = useApiKeys()
  const [draft, setDraft] = useState<ApiKeys>(keys)
  const [saved, setSaved] = useState(false)

  function update<K extends keyof ApiKeys>(key: K, value: ApiKeys[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    setKeys(draft)
    setSaved(true)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-sm text-gray-400">
          Configure API keys for YouTube fetching and AI features. Keys are stored
          locally in your browser and sent directly to providers — never saved on our server.
        </p>
      </div>

      {saved && (
        <div className="rounded-lg bg-green-900/30 border border-green-700 px-4 py-3 text-sm text-green-300">
          Settings saved successfully.
        </div>
      )}

      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-white">YouTube Data API</h2>
        <p className="text-xs text-gray-400">
          Get a free key from the Google Cloud Console under APIs &amp; Services → Credentials, after enabling the YouTube Data API v3.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm text-gray-300">API Key</span>
          <input
            type="password"
            value={draft.youtubeDataKey}
            onChange={(e) => update('youtubeDataKey', e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Used to fetch videos from whitelisted YouTube channels.
          </p>
        </label>
      </section>

      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-white">AI Provider <span className="text-sm font-normal text-gray-500">(Optional)</span></h2>
        <p className="text-xs text-gray-400">
          {AI_PROVIDER_KEY_HELP[draft.aiProvider]}
        </p>
        <p className="text-xs text-gray-400">
          Used for title rewriting and video segmentation, using your own account's tokens.
        </p>

        <label className="block">
          <span className="mb-1.5 block text-sm text-gray-300">Provider</span>
          <select
            value={draft.aiProvider}
            onChange={(e) => update('aiProvider', e.target.value as AiProvider)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-red-500"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-gray-300">API Key</span>
          <input
            type="password"
            value={draft.aiApiKey}
            onChange={(e) => update('aiApiKey', e.target.value)}
            placeholder={draft.aiProvider === 'openai' ? 'sk-...' : draft.aiProvider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
          />
        </label>
      </section>

      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
        <h2 className="text-lg font-semibold text-white">Groq (Transcription) <span className="text-sm font-normal text-gray-500">(Optional)</span></h2>
        <p className="text-xs text-gray-400">
          Get a free key from console.groq.com under API Keys — no credit card required.
        </p>
        <label className="block">
          <span className="mb-1.5 block text-sm text-gray-300">API Key</span>
          <input
            type="password"
            value={draft.groqApiKey}
            onChange={(e) => update('groqApiKey', e.target.value)}
            placeholder="gsk_..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-red-500"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Used for audio transcription during video preprocessing.
          </p>
        </label>
      </section>

      <button
        onClick={handleSave}
        className="rounded-lg bg-red-600 hover:bg-red-700 px-6 py-2.5 text-sm font-medium text-white transition-colors"
      >
        Save Settings
      </button>
    </div>
  )
}
