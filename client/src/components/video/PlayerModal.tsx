import { useEffect, useRef } from 'react'
import type { Video } from '../../types'
import { formatAge, formatViews } from '../../lib/format'
import { Icon } from '../ui/Icon'

type PlayerModalProps = {
  video: Video | null
  onClose: () => void
}

/**
 * Native <dialog> for the top layer and backdrop, but `video` state is the only
 * source of truth for whether the player is open.
 *
 * Every dismissal path calls `onClose` directly rather than relying on the
 * dialog's own `close` event, which does not bubble and cannot be trusted to
 * fire. That matters because unmounting the iframe is the only thing that stops
 * playback — a dialog that closes visually while the iframe lives on keeps
 * playing audio over the feed.
 */
export function PlayerModal({ video, onClose }: PlayerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Keep the dialog's open state in sync with `video`.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (video && !dialog.open) {
      dialog.showModal()
    } else if (!video && dialog.open) {
      dialog.close()
    }
  }, [video])

  // Esc: intercept before the browser closes the dialog behind React's back.
  useEffect(() => {
    if (!video) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [video, onClose])

  if (!video) return null

  const canEmbed = video.youtubeId !== null
  const isUpload = video.source === 'upload' && video.filePath

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (event.target === dialogRef.current) onClose()
      }}
      className="m-auto w-[min(1000px,92vw)] overflow-visible rounded-2xl border border-border bg-elevated p-0 text-text backdrop:bg-black/75"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close player"
        className="absolute -top-11 right-0 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white transition-colors hover:bg-white/20"
      >
        <Icon name="close" className="size-4" />
        Close
      </button>

      <div className="aspect-video w-full overflow-hidden rounded-t-2xl bg-black">
        {isUpload ? (
          <video
            src={`/api/uploads/${video.filePath}`}
            controls
            autoPlay
            className="size-full"
          />
        ) : canEmbed ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full border-0"
          />
        ) : (
          <div className="flex size-full items-center justify-center px-6 text-center text-sm text-muted">
            No playback available for this video.
          </div>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-lg font-bold text-text">{video.title}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <span>{video.channel}</span>
          {video.channelVerified ? (
            <Icon name="verified" className="size-4 shrink-0" filled />
          ) : null}
          <span>•</span>
          <span>{formatViews(video.views)}</span>
          <span>•</span>
          <span>{formatAge(video.publishedAt)}</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{video.description}</p>
      </div>
    </dialog>
  )
}
