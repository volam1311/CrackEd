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

/*
 * Feed data. These resolve from `mocks/videos.ts` until Person 1's endpoints
 * exist; swapping to the real API means replacing the bodies here and nothing
 * else, provided the server matches the `Video` shape in `types.ts`.
 */

/** Simulates network latency so loading states are exercised in dev. */
function resolve<T>(value: T, ms = 250): Promise<T> {
  return new Promise((done) => setTimeout(() => done(value), ms))
}

export async function fetchFeed(): Promise<Video[]> {
  return resolve(mockVideos)
}

export async function fetchTodaysPick(): Promise<Video> {
  return resolve(mockTodaysPick)
}

export async function fetchContinueLearning(): Promise<VideoWithProgress[]> {
  return resolve(mockContinueLearning)
}
