/**
 * Domain model shared with the backend.
 *
 * `api.ts` mirrors the FastAPI responses by hand — nothing generates or checks
 * them — so this file is the agreed contract. Change it in step with the server.
 */

export type VideoSource = 'youtube' | 'upload'

export type Video = {
  id: string
  /** YouTube video ID, used for iframe playback. Null for uploaded videos. */
  youtubeId: string | null
  /** Title as shown in CrackEd — may be the AI-rewritten one, not YouTube's. */
  title: string
  description: string
  channel: string
  channelVerified: boolean
  thumbnailUrl: string
  durationSeconds: number
  views: number
  /** ISO 8601 date string. */
  publishedAt: string
  source: VideoSource
  category: string
  /** Server filename for uploaded videos, used for playback via /api/uploads/{filePath}. */
  filePath: string | null
}

export type WatchProgress = {
  videoId: string
  /** 0–100. */
  watchedPct: number
}

/** A feed entry with the viewer's progress attached, for "Continue learning". */
export type VideoWithProgress = Video & { watchedPct: number }
