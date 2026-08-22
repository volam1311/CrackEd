import { useEffect, useState } from 'react'
import { titleFromFilename } from '../lib/format'
import { readVideoMeta } from '../lib/videoMeta'
import { buildMockClips } from '../features/upload/clips'
import { DetailsStep } from '../features/upload/DetailsStep'
import { PreprocessStep } from '../features/upload/PreprocessStep'
import { PublishStep } from '../features/upload/PublishStep'
import { ReviewStep } from '../features/upload/ReviewStep'
import { Stepper } from '../features/upload/Stepper'
import { TipsRow } from '../features/upload/TipsRow'
import { UploadStep } from '../features/upload/UploadStep'
import {
  ACCEPTED_TYPES,
  MAX_BYTES,
  STEPS,
  type Clip,
  type PreprocessJob,
  type StepId,
  type UploadedVideo,
  type VideoDetails,
} from '../features/upload/types'

const emptyDetails: VideoDetails = {
  title: '',
  description: '',
  topic: '',
  tagText: '',
  removeFiller: false,
}

const idleJob: PreprocessJob = {
  running: false,
  complete: false,
  stageIndex: 0,
}

function stepIndex(id: StepId) {
  return STEPS.findIndex((s) => s.id === id)
}

function validateFile(file: File): string | null {
  const name = file.name.toLowerCase()
  if (!ACCEPTED_TYPES.some((ext) => name.endsWith(ext))) {
    return 'Please choose an MP4, MOV, or MKV file.'
  }
  if (file.size > MAX_BYTES) {
    return 'File is larger than 5GB.'
  }
  return null
}

export function UploadVideos() {
  const [step, setStep] = useState<StepId>('upload')
  const [maxReachable, setMaxReachable] = useState<StepId>('upload')
  const [video, setVideo] = useState<UploadedVideo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<VideoDetails>(emptyDetails)
  const [job, setJob] = useState<PreprocessJob>(idleJob)
  const [clips, setClips] = useState<Clip[]>([])
  const [published, setPublished] = useState(false)

  function unlock(next: StepId) {
    setMaxReachable((current) =>
      stepIndex(next) > stepIndex(current) ? next : current,
    )
  }

  async function handleFile(file: File) {
    const message = validateFile(file)
    if (message) {
      setError(message)
      return
    }

    const id = crypto.randomUUID()
    setError(null)
    setStep('upload')
    setMaxReachable('upload')
    setPublished(false)
    setClips([])
    setJob(idleJob)
    setVideo({
      id,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
      duration: 0,
      thumbnail: null,
    })
    setDetails((current) => ({
      ...current,
      title: current.title || titleFromFilename(file.name),
    }))

    const meta = await readVideoMeta(file)
    setVideo((current) => (current?.id === id ? { ...current, ...meta } : current))
  }

  useEffect(() => {
    if (!video || video.status !== 'uploading') return

    const timer = window.setInterval(() => {
      setVideo((current) => {
        if (!current || current.status !== 'uploading') return current
        const progress = Math.min(100, current.progress + 8)
        if (progress >= 100) {
          return { ...current, progress: 100, status: 'ready' }
        }
        return { ...current, progress }
      })
    }, 160)

    return () => window.clearInterval(timer)
  }, [video?.id, video?.status])

  useEffect(() => {
    if (!job.running) return

    const stageCount = details.removeFiller ? 4 : 3
    const timer = window.setInterval(() => {
      setJob((current) => {
        if (!current.running) return current
        const stageIndex = current.stageIndex + 1
        if (stageIndex >= stageCount) {
          return { running: false, complete: true, stageIndex: stageCount }
        }
        return { ...current, stageIndex }
      })
    }, 850)

    return () => window.clearInterval(timer)
  }, [job.running, details.removeFiller])

  useEffect(() => {
    if (!job.complete || clips.length > 0) return
    setClips(buildMockClips(video?.duration ?? 0, details.title))
  }, [job.complete, clips.length, video?.duration, details.title])

  function goTo(next: StepId) {
    if (stepIndex(next) <= stepIndex(maxReachable)) setStep(next)
  }

  function continueFromUpload() {
    if (video?.status !== 'ready') return
    setStep('details')
    unlock('details')
  }

  function continueFromDetails() {
    if (!details.title.trim() || !details.topic) {
      setError('Add a title and topic before preprocessing.')
      return
    }
    setError(null)
    setClips([])
    setPublished(false)
    setJob({ running: true, complete: false, stageIndex: 0 })
    setStep('preprocess')
    unlock('preprocess')
  }

  function continueFromPreprocess() {
    if (!job.complete) return
    setStep('review')
    unlock('review')
  }

  function continueFromReview() {
    if (!clips.some((clip) => clip.included)) {
      setError('Include at least one clip to publish.')
      return
    }
    setError(null)
    setStep('publish')
    unlock('publish')
  }

  const canContinue =
    (step === 'upload' && video?.status === 'ready') ||
    (step === 'details' && Boolean(details.title.trim() && details.topic)) ||
    (step === 'preprocess' && job.complete) ||
    (step === 'review' && clips.some((clip) => clip.included))

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Upload & Preprocess
        </h1>
        <Stepper current={step} maxReachable={maxReachable} onSelect={goTo} />
      </div>

      {step === 'upload' ? (
        <UploadStep video={video} error={error} onFile={handleFile} />
      ) : null}
      {step === 'details' ? (
        <DetailsStep details={details} onChange={setDetails} />
      ) : null}
      {step === 'preprocess' ? (
        <PreprocessStep
          job={job}
          details={details}
          onToggleFiller={(removeFiller) =>
            setDetails((current) => ({ ...current, removeFiller }))
          }
        />
      ) : null}
      {step === 'review' ? (
        <ReviewStep clips={clips} onChange={setClips} />
      ) : null}
      {step === 'publish' && video ? (
        <PublishStep
          video={video}
          details={details}
          clips={clips}
          published={published}
          onPublish={async () => {
            try {
              // 1. Upload the actual video file
              const formData = new FormData()
              formData.append('file', video.file)
              const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
              })
              if (!uploadRes.ok) {
                setError(
                  uploadRes.status === 413
                    ? 'The server rejected this file as too large. If you are on the Docker client, its upload size limit needs raising.'
                    : `Failed to upload video file (HTTP ${uploadRes.status}).`,
                )
                return
              }
              const { filename } = await uploadRes.json()

              // 2. Create the video metadata record
              const res = await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: video.id,
                  source: 'upload',
                  original_title: details.title,
                  display_title: details.title,
                  description: details.description || null,
                  duration_seconds: Math.round(video.duration),
                  published_at: new Date().toISOString(),
                  file_path: filename,
                }),
              })
              if (!res.ok && res.status !== 409) {
                setError('Failed to publish video to server.')
                return
              }
            } catch {
              setError('Network error while publishing.')
              return
            }
            setPublished(true)
          }}
        />
      ) : null}

      {step !== 'upload' && error ? (
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {step !== 'publish' ? (
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 'upload'}
            onClick={() => {
              const i = stepIndex(step)
              if (i > 0) setStep(STEPS[i - 1].id)
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-white/5 disabled:invisible"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => {
              if (step === 'upload') continueFromUpload()
              else if (step === 'details') continueFromDetails()
              else if (step === 'preprocess') continueFromPreprocess()
              else if (step === 'review') continueFromReview()
            }}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      ) : null}

      {step === 'upload' ? <TipsRow /> : null}
    </div>
  )
}
