import { useRef, useState, type DragEvent } from 'react'
import { CloudUpload, MoreHorizontal } from 'lucide-react'
import { formatBytes, formatDuration } from '../../lib/format'
import { ACCEPTED_TYPES, type UploadedVideo } from './types'

export type PreprocessOptions = {
  clip: boolean
  renameTitles: boolean
}

type UploadStepProps = {
  video: UploadedVideo | null
  error: string | null
  onFile: (file: File) => void
  preprocessOptions: PreprocessOptions
  onOptionsChange: (options: PreprocessOptions) => void
}

export function UploadStep({ video, error, onFile, preprocessOptions, onOptionsChange }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function takeFile(file: File | undefined) {
    if (!file) return
    onFile(file)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    takeFile(event.dataTransfer.files[0])
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragOver
            ? 'border-accent bg-accent/10'
            : 'border-border bg-surface/40',
        ].join(' ')}
      >
        <div className="mb-4 grid size-14 place-items-center rounded-full bg-elevated text-text">
          <CloudUpload className="size-7" />
        </div>
        <p className="text-lg text-text">
          Drag & drop your video here or
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Choose File
        </button>
        <p className="mt-4 text-sm text-muted">
          MP4, MOV, MKV up to 5GB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            takeFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-medium text-text">
            Uploaded videos
          </h2>
          {video ? (
            <article className="flex gap-3 rounded-xl bg-elevated p-3">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="h-16 w-24 shrink-0 rounded-md bg-elevated" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">
                    {video.name}
                  </p>
                  <button
                    type="button"
                    className="rounded p-1 text-muted hover:text-text"
                    aria-label="More"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {formatBytes(video.size)}
                  {video.duration > 0 ? ` • ${formatDuration(video.duration)}` : ''}
                </p>
                {video.status === 'uploading' ? (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Uploading {video.progress}%
                    </p>
                  </div>
                ) : video.status === 'error' ? (
                  <span className="mt-2 inline-block rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                    Failed
                  </span>
                ) : (
                  <span className="mt-2 inline-block rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                    Ready to process
                  </span>
                )}
              </div>
            </article>
          ) : (
            <p className="rounded-xl bg-elevated px-3 py-8 text-center text-sm text-muted">
              No files yet
            </p>
          )}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-violet-200">
            Optional AI features
          </h2>
          <p className="mb-3 text-xs text-violet-300/70">
            Requires API keys configured in Settings.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preprocessOptions.clip}
                onChange={(e) => onOptionsChange({ ...preprocessOptions, clip: e.target.checked })}
                disabled={!video || video.status !== 'ready'}
                className="size-4 rounded border-violet-400 bg-transparent text-accent focus:ring-accent/30"
              />
              <div>
                <span className="text-sm text-violet-100">Clip into segments</span>
                <p className="text-xs text-violet-300/70">Split long video into shorter clips using AI transcription</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preprocessOptions.renameTitles}
                onChange={(e) => onOptionsChange({ ...preprocessOptions, renameTitles: e.target.checked })}
                disabled={!video || video.status !== 'ready'}
                className="size-4 rounded border-violet-400 bg-transparent text-accent focus:ring-accent/30"
              />
              <div>
                <span className="text-sm text-violet-100">AI rename titles</span>
                <p className="text-xs text-violet-300/70">Generate engaging titles for each clip</p>
              </div>
            </label>
          </div>
          {video?.status === 'ready' && !preprocessOptions.clip && !preprocessOptions.renameTitles && (
            <p className="mt-3 text-xs text-violet-300/60 italic">
              No options selected — video will be published as-is.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
