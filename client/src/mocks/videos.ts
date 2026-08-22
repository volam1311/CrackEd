import type { Video, VideoWithProgress } from '../types'

/**
 * Placeholder feed data, standing in for Person 1's `/api/videos` endpoint.
 *
 * The YouTube IDs are real so the iframe genuinely plays and thumbnails resolve
 * from `i.ytimg.com`. Delete this file once the real API lands — `api.ts` is the
 * only consumer.
 */

/** YouTube serves a thumbnail per video ID, so the image always matches playback. */
function thumb(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
}

type Seed = Omit<Video, 'thumbnailUrl' | 'source'> & { thumbnailUrl?: string }

function toVideo(seed: Seed): Video {
  return {
    ...seed,
    thumbnailUrl: seed.thumbnailUrl ?? thumb(seed.youtubeId ?? ''),
    source: 'youtube',
  }
}

const seeds: Seed[] = [
  {
    id: 'v1',
    youtubeId: 'aircAruvnKk',
    title: 'How Machine Learning Actually Works',
    description:
      'A visual and intuitive explanation of the core concepts behind machine learning.',
    channel: '3Blue1Brown',
    channelVerified: true,
    durationSeconds: 1122,
    views: 2_100_000,
    publishedAt: '2026-08-08T00:00:00Z',
    category: 'AI',
  },
  {
    id: 'v2',
    youtubeId: 'fNk_zzaMoSs',
    title: 'Linear Algebra Visually Explained',
    description: 'Vectors, spans and transformations, built up from pictures rather than formulas.',
    channel: '3Blue1Brown',
    channelVerified: true,
    durationSeconds: 981,
    views: 2_600_000,
    publishedAt: '2026-07-22T00:00:00Z',
    category: 'Math',
  },
  {
    id: 'v3',
    youtubeId: 'rfscVS0vtbw',
    title: 'The Python Crash Course You Need',
    description: 'Everything you need to start writing real Python, in one sitting.',
    channel: 'freeCodeCamp.org',
    channelVerified: true,
    durationSeconds: 751,
    views: 3_800_000,
    publishedAt: '2026-07-25T00:00:00Z',
    category: 'Computer Science',
  },
  {
    id: 'v4',
    youtubeId: '8hly31xKli0',
    title: 'Data Structures You Actually Need to Know',
    description: 'The handful of data structures that show up in real interviews and real code.',
    channel: 'freeCodeCamp.org',
    channelVerified: true,
    durationSeconds: 1338,
    views: 2_100_000,
    publishedAt: '2026-08-01T00:00:00Z',
    category: 'Computer Science',
  },
  {
    id: 'v5',
    youtubeId: 'WUvTyaaNkzM',
    title: 'Calculus in Real Life',
    description: 'Where derivatives and integrals actually show up once you leave the classroom.',
    channel: '3Blue1Brown',
    channelVerified: true,
    durationSeconds: 824,
    views: 2_600_000,
    publishedAt: '2026-07-18T00:00:00Z',
    category: 'Math',
  },
  {
    id: 'v6',
    youtubeId: 'HXV3zeQKqGY',
    title: 'Databases Explained Simply',
    description: 'SQL, tables and joins explained without the jargon.',
    channel: 'freeCodeCamp.org',
    channelVerified: true,
    durationSeconds: 1005,
    views: 1_400_000,
    publishedAt: '2026-06-30T00:00:00Z',
    category: 'Data Science',
  },
  {
    id: 'v7',
    youtubeId: 'PkZNo7MFNFg',
    title: 'JavaScript, From Zero to Actually Useful',
    description: 'The language of the web, taught in the order you will actually use it.',
    channel: 'freeCodeCamp.org',
    channelVerified: true,
    durationSeconds: 1247,
    views: 3_200_000,
    publishedAt: '2026-07-05T00:00:00Z',
    category: 'Computer Science',
  },
  {
    id: 'v8',
    youtubeId: 'Gv9_4yMHFhI',
    title: 'Bias and Variance, Finally Explained',
    description: 'The trade-off at the heart of every model that overfits or underfits.',
    channel: 'StatQuest with Josh Starmer',
    channelVerified: true,
    durationSeconds: 930,
    views: 1_050_000,
    publishedAt: '2026-08-11T00:00:00Z',
    category: 'AI',
  },
  {
    id: 'v9',
    youtubeId: 'kqtD5dpn9C8',
    title: 'Python for Absolute Beginners',
    description: 'Start from nothing and write your first working program.',
    channel: 'Programming with Mosh',
    channelVerified: true,
    durationSeconds: 1440,
    views: 4_100_000,
    publishedAt: '2026-05-14T00:00:00Z',
    category: 'Computer Science',
  },
  {
    id: 'v10',
    youtubeId: 'bMknfKXIFA8',
    title: 'React, Explained Properly',
    description: 'Components, state and hooks, without the cargo cult.',
    channel: 'freeCodeCamp.org',
    channelVerified: true,
    durationSeconds: 1683,
    views: 1_900_000,
    publishedAt: '2026-06-12T00:00:00Z',
    category: 'Computer Science',
  },
  {
    id: 'v11',
    youtubeId: 'bHIhgxav9LY',
    title: 'Everything You Know About Electricity Is Wrong',
    description: 'Where the energy in a circuit actually flows, and why the textbook picture misleads.',
    channel: 'Veritasium',
    channelVerified: true,
    durationSeconds: 1102,
    views: 5_300_000,
    publishedAt: '2026-07-29T00:00:00Z',
    category: 'Physics',
  },
  {
    id: 'v12',
    youtubeId: 'ukLnPbIffxE',
    title: 'The Study System That Actually Works',
    description: 'Evidence-based revision techniques, and the popular ones that do nothing.',
    channel: 'Ali Abdaal',
    channelVerified: true,
    durationSeconds: 873,
    views: 1_300_000,
    publishedAt: '2026-07-20T00:00:00Z',
    category: 'Productivity',
  },
]

export const mockVideos: Video[] = seeds.map(toVideo)

/** The featured slot on Home. */
export const mockTodaysPick: Video = mockVideos[0]

/** Partially-watched videos. Real progress needs a backend nobody has scoped yet. */
export const mockContinueLearning: VideoWithProgress[] = [
  { ...mockVideos[3], watchedPct: 75 },
  { ...mockVideos[7], watchedPct: 40 },
  { ...mockVideos[5], watchedPct: 60 },
  { ...mockVideos[9], watchedPct: 30 },
  { ...mockVideos[11], watchedPct: 90 },
]

export const categories = [
  'All',
  'Computer Science',
  'Math',
  'Data Science',
  'AI',
  'Productivity',
  'Physics',
] as const
