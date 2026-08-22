import { useEffect, useState } from 'react'

type Channel = {
  id: string
  title: string
  thumbnail_url: string | null
  added_at: string
}

const API_BASE = '/api'

export function FetchFromYouTube() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState('')
  const [channelTitle, setChannelTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingVideos, setFetchingVideos] = useState(false)
  const [youtubeApiKey, setYoutubeApiKey] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadChannels = async () => {
    try {
      const res = await fetch(`${API_BASE}/channels`)
      if (res.ok) {
        const data = await res.json()
        setChannels(data)
      }
    } catch (err) {
      console.error('Failed to load channels', err)
    }
  }

  useEffect(() => {
    loadChannels()
  }, [])

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelId.trim() || !channelTitle.trim()) return

    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: channelId.trim(), title: channelTitle.trim() }),
      })
      if (res.ok) {
        setMessage(`Added "${channelTitle.trim()}" to whitelist`)
        setChannelId('')
        setChannelTitle('')
        await loadChannels()
      } else if (res.status === 409) {
        setMessage('Channel already exists in whitelist')
      } else {
        setMessage('Failed to add channel')
      }
    } catch {
      setMessage('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChannel = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/channels/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadChannels()
      }
    } catch (err) {
      console.error('Failed to delete channel', err)
    }
  }

  const handleFetchVideos = async () => {
    if (!youtubeApiKey.trim()) {
      setMessage('Please enter your YouTube API key.')
      return
    }
    setFetchingVideos(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_api_key: youtubeApiKey.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Fetched ${data.videos_added} new video(s), ${data.videos_skipped} already existed. ` +
          `${data.channels_processed} channel(s) processed.` +
          (data.channels_failed?.length ? ` Failed: ${data.channels_failed.join(', ')}` : '')
        )
      } else {
        setMessage(data.detail || 'Failed to fetch videos')
      }
    } catch {
      setMessage('Network error while fetching videos.')
    } finally {
      setFetchingVideos(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Fetch from YouTube</h1>
        <p className="text-sm text-gray-400">
          Add trusted channels and import their educational videos. CrackEd only
          fetches metadata — videos stay on YouTube and play via iframe.
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-gray-200">
          {message}
        </div>
      )}

      {/* Add Channel Form */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Add Channel to Whitelist</h2>
        <form onSubmit={handleAddChannel} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Channel ID (e.g. UCYO_jab_esuFRV4b17AJtAw)"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          <input
            type="text"
            placeholder="Channel name (e.g. 3Blue1Brown)"
            value={channelTitle}
            onChange={(e) => setChannelTitle(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={loading || !channelId.trim() || !channelTitle.trim()}
            className="self-start rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {loading ? 'Adding...' : 'Add to Whitelist'}
          </button>
        </form>
      </section>

      {/* Fetch Videos */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-2">Fetch Videos</h2>
        <p className="text-sm text-gray-400 mb-4">
          Pull the latest videos from all whitelisted channels. Your API key is only
          used for this request and is never stored on the server.
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="YouTube Data API key"
            value={youtubeApiKey}
            onChange={(e) => setYoutubeApiKey(e.target.value)}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
          <button
            onClick={handleFetchVideos}
            disabled={fetchingVideos || channels.length === 0 || !youtubeApiKey.trim()}
            className="self-start rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            {fetchingVideos ? 'Fetching...' : 'Refetch Videos'}
          </button>
        </div>
      </section>

      {/* Whitelisted Channels List */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">
          Whitelisted Channels ({channels.length})
        </h2>
        {channels.length === 0 ? (
          <p className="text-sm text-gray-500">No channels added yet.</p>
        ) : (
          <ul className="space-y-3">
            {channels.map((ch) => (
              <li
                key={ch.id}
                className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{ch.title}</p>
                  <p className="text-xs text-gray-500 font-mono">{ch.id}</p>
                </div>
                <button
                  onClick={() => handleDeleteChannel(ch.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
