import { useCallback, useEffect, useState } from 'react'
import { useApiKeys } from '../lib/apiKeys'

type Channel = {
  id: string
  title: string
  thumbnail_url: string | null
  added_at: string
}

type VideoItem = {
  id: string
  original_title: string
  display_title: string | null
  channel_title: string | null
  thumbnail_url: string | null
  duration_seconds: number
  source: string
}

const API_BASE = '/api'
const PAGE_SIZE = 10

export function FetchFromYouTube() {
  const { keys, hasAiKey, hasYoutubeKey } = useApiKeys()
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState('')
  const [channelTitle, setChannelTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingVideos, setFetchingVideos] = useState(false)
  const [rewritingId, setRewritingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [videos, setVideos] = useState<VideoItem[]>([])
  const [videoPage, setVideoPage] = useState(0)
  const [totalVideos, setTotalVideos] = useState(0)
  const [filterChannel, setFilterChannel] = useState('')

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

  const loadVideos = useCallback(async (page: number, channelFilter = filterChannel) => {
    try {
      const skip = page * PAGE_SIZE
      const channelParam = channelFilter ? `&channel_id=${channelFilter}` : ''
      const distributeParam = channelFilter ? '' : '&distribute=true'
      const res = await fetch(
        `${API_BASE}/videos?source=youtube&order=recent&limit=${PAGE_SIZE}&skip=${skip}${distributeParam}${channelParam}`
      )
      if (res.ok) {
        setVideos(await res.json())
      }
    } catch (err) {
      console.error('Failed to load videos', err)
    }
  }, [filterChannel])

  const loadVideoCount = useCallback(async (channelFilter = filterChannel) => {
    try {
      const channelParam = channelFilter ? `&channel_id=${channelFilter}` : ''
      const res = await fetch(`${API_BASE}/videos/count?source=youtube${channelParam}`)
      if (res.ok) {
        const data = await res.json()
        setTotalVideos(data.total)
      }
    } catch (err) {
      console.error('Failed to load video count', err)
    }
  }, [filterChannel])

  useEffect(() => {
    loadChannels()
    loadVideoCount()
    loadVideos(0)
  }, [loadVideos, loadVideoCount])

  const handleFilterChange = (channelId: string) => {
    setFilterChannel(channelId)
    setVideoPage(0)
    loadVideos(0, channelId)
    loadVideoCount(channelId)
  }

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
    if (!hasYoutubeKey) {
      setMessage('Please set your YouTube API key on the Settings page.')
      return
    }
    setFetchingVideos(true)
    setMessage(null)
    try {
      const res = await fetch(`${API_BASE}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_api_key: keys.youtubeDataKey }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(
          `Fetched ${data.videos_added} new video(s), ${data.videos_skipped} already existed. ` +
          `${data.channels_processed} channel(s) processed.` +
          (data.channels_failed?.length ? ` Failed: ${data.channels_failed.join(', ')}` : '')
        )
        setVideoPage(0)
        await loadVideos(0)
        await loadVideoCount()
      } else {
        setMessage(data.detail || 'Failed to fetch videos')
      }
    } catch {
      setMessage('Network error while fetching videos.')
    } finally {
      setFetchingVideos(false)
    }
  }

  const handleRewriteTitle = async (videoId: string) => {
    if (!hasAiKey) {
      setMessage('Please set your AI API key on the Settings page.')
      return
    }
    setRewritingId(videoId)
    try {
      const res = await fetch(`${API_BASE}/videos/${videoId}/title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: keys.aiProvider, api_key: keys.aiApiKey }),
      })
      if (res.ok) {
        const data = await res.json()
        setVideos((prev: VideoItem[]) =>
          prev.map((v: VideoItem) => v.id === videoId ? { ...v, display_title: data.display_title } : v)
        )
      } else {
        const data = await res.json()
        setMessage(data.detail || 'Failed to rewrite title')
      }
    } catch {
      setMessage('Network error while rewriting title.')
    } finally {
      setRewritingId(null)
    }
  }

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const res = await fetch(`${API_BASE}/videos/${videoId}`, { method: 'DELETE' })
      if (res.ok) {
        await loadVideos(videoPage)
        await loadVideoCount()
      }
    } catch (err) {
      console.error('Failed to delete video', err)
    }
  }

  const handlePrevPage = () => {
    const prev = Math.max(0, videoPage - 1)
    setVideoPage(prev)
    loadVideos(prev)
  }

  const handleNextPage = () => {
    const next = videoPage + 1
    setVideoPage(next)
    loadVideos(next)
  }

  const totalPages = Math.ceil(totalVideos / PAGE_SIZE)

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
          Pull the latest videos from all whitelisted channels.
          {!hasYoutubeKey && ' Set your YouTube API key on the Settings page first.'}
        </p>
        <button
          onClick={handleFetchVideos}
          disabled={fetchingVideos || channels.length === 0 || !hasYoutubeKey}
          className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium text-white transition-colors"
        >
          {fetchingVideos ? 'Fetching...' : 'Refetch Videos'}
        </button>
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

      {/* Fetched Videos List */}
      <section className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Fetched Videos ({totalVideos})
          </h2>
          <select
            value={filterChannel}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
          >
            <option value="">All Channels</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.title}</option>
            ))}
          </select>
        </div>
        {videos.length === 0 ? (
          <p className="text-sm text-gray-500">No videos fetched yet.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {videos.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-3 rounded-lg bg-gray-800 px-4 py-3"
                >
                  {v.thumbnail_url && (
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      className="w-24 h-14 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {v.display_title || v.original_title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.channel_title || 'Unknown channel'} &middot;{' '}
                      {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, '0')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleRewriteTitle(v.id)}
                      disabled={rewritingId === v.id || !hasAiKey}
                      title={!hasAiKey ? 'Set AI key in Settings' : 'Rewrite title with AI'}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {rewritingId === v.id ? 'Rewriting...' : 'Rewrite'}
                    </button>
                    <button
                      onClick={() => handleDeleteVideo(v.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={handlePrevPage}
                  disabled={videoPage === 0}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">
                  Page {videoPage + 1} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={videoPage >= totalPages - 1}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
