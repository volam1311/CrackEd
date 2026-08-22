import type { Video, VideoWithProgress } from './types'
import { mockContinueLearning, mockTodaysPick, mockVideos } from './mocks/videos'

export type HealthResponse = {
  status: string
  service: string
}

export type HelloResponse = {
  message: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return res.json()
}

export async function fetchHello(name: string): Promise<HelloResponse> {
  const params = new URLSearchParams({ name })
  const res = await fetch(`/api/hello?${params}`)
  if (!res.ok) {
    throw new Error(`Hello request failed (${res.status})`)
  }
  return res.json()
}

type ApiVideo = {
  /** FastAPI serialises the Pydantic alias, so the wire field is `_id`. */
  _id?: string
  id?: string
  source: 'youtube' | 'upload'
  original_title: string
  display_title: string | null
  description: string | null
  channel_id: string | null
  channel_title: string | null
  thumbnail_url: string | null
  duration_seconds: number
  published_at: string | null
  embeddable: boolean
  file_path: string | null
  created_at: string
}

/*
 * Feed requests fall back to mocks when the API is unavailable, but a *hanging*
 * backend never rejects — so without a deadline the fallback never runs and the
 * feed spins forever. An unhealthy server is worse than an absent one, hence the
 * explicit timeout.
 */
const API_TIMEOUT_MS = 3000

function withTimeout(): RequestInit {
  return { signal: AbortSignal.timeout(API_TIMEOUT_MS) }
}

function mapApiVideoToVideo(api: ApiVideo): Video {
  const isYoutube = api.source === 'youtube'
  // Accept either spelling: `_id` is what the API actually sends today.
  const id = api._id ?? api.id ?? ''
  return {
    id,
    youtubeId: isYoutube ? id : null,
    title: api.display_title ?? api.original_title,
    originalTitle: api.original_title,
    description: api.description ?? '',
    channel: api.channel_title ?? (isYoutube ? 'YouTube' : 'User Upload'),
    channelVerified: true,
    thumbnailUrl: api.thumbnail_url ?? (isYoutube ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : ''),
    durationSeconds: api.duration_seconds,
    views: 0,
    publishedAt: api.published_at ?? api.created_at,
    source: api.source,
    category: isYoutube ? 'Education' : 'Uploaded',
    filePath: api.file_path ?? null,
  }
}

export async function fetchFeed(): Promise<Video[]> {
  try {
    const res = await fetch('/api/videos?limit=50&distribute=true', withTimeout())
    if (res.ok) {
      const data: ApiVideo[] = await res.json()
      if (data.length > 0) {
        return data.map(mapApiVideoToVideo)
      }
    }
  } catch {
    // Fall back to mocks
  }
  return mockVideos
}

export async function fetchTodaysPick(): Promise<Video> {
  try {
    const res = await fetch('/api/videos?limit=1&order=random', withTimeout())
    if (res.ok) {
      const data: ApiVideo[] = await res.json()
      if (data.length > 0) {
        return mapApiVideoToVideo(data[0])
      }
    }
  } catch {
    // Fall back to mock
  }
  return mockTodaysPick
}

export async function fetchContinueLearning(): Promise<VideoWithProgress[]> {
  return mockContinueLearning
}

export async function searchVideos(term: string): Promise<Video[]> {
  const query = term.trim()
  if (!query) return []

  try {
    const res = await fetch(
      `/api/videos?q=${encodeURIComponent(query)}&limit=50`,
      withTimeout(),
    )
    if (res.ok) {
      const data: ApiVideo[] = await res.json()
      return data.map(mapApiVideoToVideo)
    }
  } catch {
    // Fall through to the local mock search below.
  }

  const needle = query.toLowerCase()
  return mockVideos.filter(
    (video) =>
      video.title.toLowerCase().includes(needle) ||
      video.channel.toLowerCase().includes(needle),
  )
}
