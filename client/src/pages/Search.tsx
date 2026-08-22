import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchVideos } from '../api'
import type { Video } from '../types'
import { PlayerModal } from '../components/video/PlayerModal'
import { VideoRow } from '../components/video/VideoRow'

/** Results are stored with the term they belong to, so "loading" is derived
 *  rather than reset inside the effect. */
type Result = { term: string; videos: Video[]; error: string | null }

export function Search() {
  const [params] = useSearchParams()
  const term = params.get('q') ?? ''

  const [result, setResult] = useState<Result | null>(null)
  const [playing, setPlaying] = useState<Video | null>(null)

  useEffect(() => {
    let cancelled = false

    searchVideos(term)
      .then((videos) => {
        if (!cancelled) setResult({ term, videos, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({
            term,
            videos: [],
            error: err instanceof Error ? err.message : 'Search failed',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [term])

  if (!term) {
    return (
      <p className="py-20 text-center text-sm text-muted">
        Type something in the search bar to find videos.
      </p>
    )
  }

  // Stale results belong to a previous term, so treat them as still loading.
  if (result?.term !== term) {
    return <p className="py-20 text-center text-sm text-muted">Searching…</p>
  }

  if (result.error) {
    return <p className="py-20 text-center text-sm text-accent">{result.error}</p>
  }

  return (
    <>
      <div className="mt-2">
        <h1 className="text-xl font-bold text-text">
          {result.videos.length} result{result.videos.length === 1 ? '' : 's'} for “{term}”
        </h1>
        {result.videos.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nothing matched. Try a shorter phrase, or a channel name.
          </p>
        ) : null}
      </div>

      <VideoRow title="Videos" videos={result.videos} onPlay={setPlaying} />

      <PlayerModal video={playing} onClose={() => setPlaying(null)} />
    </>
  )
}
