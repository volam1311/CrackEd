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
  id: string
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

function mapApiVideoToVideo(api: ApiVideo): Video {
  const isYoutube = api.source === 'youtube'
  return {
    id: api.id,
    youtubeId: isYoutube ? api.id : null,
    title: api.display_title ?? api.original_title,
    description: api.description ?? '',
    channel: api.channel_title ?? (isYoutube ? 'YouTube' : 'User Upload'),
    channelVerified: true,
    thumbnailUrl: api.thumbnail_url ?? (isYoutube ? `https://i.ytimg.com/vi/${api.id}/maxresdefault.jpg` : ''),
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
    const res = await fetch('/api/videos?limit=50')
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
    const res = await fetch('/api/videos?limit=1')
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
