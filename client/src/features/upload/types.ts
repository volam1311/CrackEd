export const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'details', label: 'Details' },
  { id: 'preprocess', label: 'Preprocess' },
  { id: 'review', label: 'Review' },
  { id: 'publish', label: 'Publish' },
] as const

export type StepId = (typeof STEPS)[number]['id']

export type FileStatus = 'uploading' | 'ready' | 'error'

export type UploadedVideo = {
  id: string
  file: File
  name: string
  size: number
  progress: number
  status: FileStatus
  duration: number
  thumbnail: string | null
}

export type VideoDetails = {
  title: string
  description: string
  topic: string
  tagText: string
  removeFiller: boolean
}

export function parseTags(tagText: string): string[] {
  return tagText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export type Clip = {
  id: string
  title: string
  start: number
  end: number
  included: boolean
}

export type PreprocessJob = {
  running: boolean
  complete: boolean
  stageIndex: number
}

export const PREPROCESS_STAGES = [
  'Extract audio & generate transcript',
  'Find the best split points',
  'Create titles for each clip',
  'Optional: remove pauses and filler',
] as const

export const TOPICS = [
  'Machine Learning',
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'History',
  'Other',
] as const

export const ACCEPTED_TYPES = ['.mp4', '.mov', '.mkv']
export const MAX_BYTES = 5 * 1024 * 1024 * 1024
