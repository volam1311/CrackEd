import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { titleFromFilename } from '../lib/format'
import { useApiKeys } from '../lib/apiKeys'
import { readVideoMeta } from '../lib/videoMeta'
import { buildMockClips } from '../features/upload/clips'
import { DetailsStep } from '../features/upload/DetailsStep'
import { PreprocessStep } from '../features/upload/PreprocessStep'
import { PublishStep } from '../features/upload/PublishStep'
import { ReviewStep } from '../features/upload/ReviewStep'
import { Stepper } from '../features/upload/Stepper'
import { TipsRow } from '../features/upload/TipsRow'
import { UploadStep } from '../features/upload/UploadStep'
import type { PreprocessOptions } from '../features/upload/UploadStep'
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
  const { keys, hasAiKey, hasGroqKey } = useApiKeys()
  const [step, setStep] = useState<StepId>('upload')
  const [maxReachable, setMaxReachable] = useState<StepId>('upload')
  const [video, setVideo] = useState<UploadedVideo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<VideoDetails>(emptyDetails)
  const [job, setJob] = useState<PreprocessJob>(idleJob)
  const [clips, setClips] = useState<Clip[]>([])
  const [published, setPublished] = useState(false)
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null)
  const [preprocessOptions, setPreprocessOptions] = useState<PreprocessOptions>({ clip: false, renameTitles: false })
  // Actual visited steps, not the full step list - the no-AI path jumps
  // upload -> publish directly, so "the previous step in STEPS" is wrong.
  const [, setHistory] = useState<StepId[]>([])

  function goForward(from: StepId, to: StepId) {
    setHistory((h) => [...h, from])
    setStep(to)
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h
      setStep(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  function unlock(next: StepId) {
    setMaxReachable((current) =>
      stepIndex(next) > stepIndex(current) ? next : current,
    )
  }

  function handleRemoveFile() {
    setVideo(null)
    setError(null)
    setStep('upload')
    setMaxReachable('upload')
    setPublished(false)
    setClips([])
    setJob(idleJob)
    setUploadedFilename(null)
    setHistory([])
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
    setHistory([])
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
    if (!job.running || !uploadedFilename) return

    const canUseRealPreprocess = hasGroqKey && hasAiKey

    if (canUseRealPreprocess) {
      let cancelled = false
      ;(async () => {
        try {
          setJob((c) => ({ ...c, stageIndex: 1 }))
          const res = await fetch('/api/uploads/preprocess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: uploadedFilename,
              transcript_api_key: keys.groqApiKey,
              title_provider: keys.aiProvider,
              title_api_key: keys.aiApiKey,
            }),
          })
          if (cancelled) return
          if (!res.ok) {
            const data = await res.json().catch(() => ({ detail: 'Preprocessing failed' }))
            setError(data.detail || 'Preprocessing failed')
            setJob({ running: false, complete: false, stageIndex: 0 })
            return
          }
          const data = await res.json()
          const realClips = (data.clips || []).map((c: { title: string; start_seconds: number; end_seconds: number; filename: string }, i: number) => ({
            id: `clip-${i}`,
            title: c.title,
            start: c.start_seconds,
            end: c.end_seconds,
            included: true,
            filename: c.filename,
          })) as (Clip & { filename: string })[]
          setClips(realClips)
          setJob({ running: false, complete: true, stageIndex: 3 })
        } catch {
          if (!cancelled) {
            setError('Network error during preprocessing.')
            setJob({ running: false, complete: false, stageIndex: 0 })
          }
        }
      })()
      return () => { cancelled = true }
    }

    // Fallback: mock timer when keys are not configured
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
  }, [job.running, details.removeFiller, uploadedFilename, hasGroqKey, hasAiKey, keys])

  useEffect(() => {
    if (!job.complete || clips.length > 0) return
    if (!hasGroqKey || !hasAiKey) {
      setClips(buildMockClips(video?.duration ?? 0, details.title))
    }
  }, [job.complete, clips.length, video?.duration, details.title, hasGroqKey, hasAiKey])

  function goTo(next: StepId) {
    if (stepIndex(next) <= stepIndex(maxReachable)) goForward(step, next)
  }

  async function continueFromUpload() {
    if (video?.status !== 'ready') return

    const wantsAI = preprocessOptions.clip || preprocessOptions.renameTitles

    if (!wantsAI) {
      // No AI features selected — upload and publish directly
      setError(null)
      goForward('upload', 'publish')
      unlock('publish')
      setDetails((d) => ({ ...d, title: d.title || titleFromFilename(video.name) }))
      return
    }

    // Check keys are set
    if (preprocessOptions.clip && (!hasGroqKey || !hasAiKey)) {
      setError('Set your Groq and AI API keys on the Settings page to use clipping.')
      return
    }
    if (preprocessOptions.renameTitles && !hasAiKey) {
      setError('Set your AI API key on the Settings page to use title rewriting.')
      return
    }

    setError(null)
    goForward('upload', 'details')
    unlock('details')
  }

  async function continueFromDetails() {
    if (!details.title.trim() || !details.topic) {
      setError('Add a title and topic before preprocessing.')
      return
    }
    if (hasGroqKey && hasAiKey && !uploadedFilename && video) {
      setError(null)
      setJob({ running: false, complete: false, stageIndex: 0 })
      goForward('details', 'preprocess')
      unlock('preprocess')

      // Upload file first so the preprocess endpoint can access it
      const formData = new FormData()
      formData.append('file', video.file)
      try {
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) {
          setError('Failed to upload video file for preprocessing.')
          return
        }
        const { filename } = await uploadRes.json()
        setUploadedFilename(filename)
      } catch {
        setError('Network error uploading video.')
        return
      }
      setClips([])
      setPublished(false)
      setJob({ running: true, complete: false, stageIndex: 0 })
      return
    }
    if (!hasGroqKey || !hasAiKey) {
      setError(
        'Set your Groq and AI API keys on the Settings page to enable preprocessing. Continuing with mock clips.'
      )
    }
    setClips([])
    setPublished(false)
    setJob({ running: true, complete: false, stageIndex: 0 })
    goForward('details', 'preprocess')
    unlock('preprocess')
  }

  function continueFromPreprocess() {
    if (!job.complete) return
    goForward('preprocess', 'review')
    unlock('review')
  }

  function continueFromReview() {
    if (!clips.some((clip) => clip.included)) {
      setError('Include at least one clip to publish.')
      return
    }
    setError(null)
    goForward('review', 'publish')
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Upload & Preprocess
          </h1>
          {step !== 'upload' ? (
            <button
              type="button"
              onClick={goBack}
              className="mt-2 flex w-fit items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-text hover:bg-white/20"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          ) : null}
        </div>
        <Stepper current={step} maxReachable={maxReachable} onSelect={goTo} />
      </div>

      {step === 'upload' ? (
        <UploadStep
          video={video}
          error={error}
          onFile={handleFile}
          onRemove={handleRemoveFile}
          preprocessOptions={preprocessOptions}
          onOptionsChange={setPreprocessOptions}
          hasGroqKey={hasGroqKey}
          hasAiKey={hasAiKey}
        />
      ) : null}
      {step === 'details' ? (
        <DetailsStep details={details} onChange={setDetails} />
      ) : null}
      {step === 'preprocess' ? (
        <PreprocessStep job={job} />
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
              let filename = uploadedFilename

              // Upload if not already done during preprocessing
              if (!filename) {
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
                const data = await uploadRes.json()
                filename = data.filename
              }

              // If we have real preprocessed clips, publish them individually
              const realClips = clips.filter((c) => c.included && 'filename' in c)
              if (realClips.length > 0) {
                const res = await fetch('/api/uploads/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    clips: realClips.map((c) => ({
                      title: c.title,
                      start_seconds: c.start,
                      end_seconds: c.end,
                      filename: (c as Clip & { filename: string }).filename,
                    })),
                  }),
                })
                if (!res.ok) {
                  setError('Failed to publish clips to server.')
                  return
                }
              } else {
                // Fallback: publish as single video
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
        <div className="mt-8 flex items-center justify-end">
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
            {step === 'upload' && !preprocessOptions.clip && !preprocessOptions.renameTitles
              ? 'Publish'
              : 'Continue'}
          </button>
        </div>
      ) : null}

      {step === 'upload' ? <TipsRow /> : null}
    </div>
  )
}
