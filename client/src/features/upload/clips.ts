import type { Clip } from './types'

const PART_TITLES = [
  'Introduction and overview',
  'Core concepts',
  'Worked examples',
  'Common pitfalls',
  'Practice and recap',
  'Advanced notes',
  'Summary',
]

export function buildMockClips(duration: number, lectureTitle: string): Clip[] {
  const total = duration > 0 ? duration : 50 * 60
  const target = total > 20 * 60 ? 8 * 60 : Math.max(90, total / 4)
  const clips: Clip[] = []
  let start = 0
  let i = 0

  while (start < total - 15) {
    const end = Math.min(total, start + target)
    const part = PART_TITLES[i % PART_TITLES.length]
    clips.push({
      id: `clip-${i + 1}`,
      title: `${lectureTitle || 'Lesson'} — ${part}`,
      start,
      end,
      included: true,
    })
    start = end
    i += 1
    if (i > 12) break
  }

  return clips
}
