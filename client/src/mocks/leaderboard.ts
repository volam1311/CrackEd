export type Rival = {
  id: string
  nickname: string
  points: number
  streakDays: number
}

/**
 * Seeded rivals so the leaderboard is populated on a fresh browser.
 *
 * There is no user model on the server yet, so these are the only other
 * "players". Scores are spread either side of a typical first session, which
 * puts a new learner mid-table with someone visible to overtake.
 */
export const rivals: Rival[] = [
  { id: 'r1', nickname: 'quantum_kate', points: 640, streakDays: 12 },
  { id: 'r2', nickname: 'devon.builds', points: 520, streakDays: 9 },
  { id: 'r3', nickname: 'mina', points: 410, streakDays: 7 },
  { id: 'r4', nickname: 'the_lurker', points: 300, streakDays: 4 },
  { id: 'r5', nickname: 'sam_studies', points: 210, streakDays: 5 },
  { id: 'r6', nickname: 'oscar', points: 150, streakDays: 2 },
  { id: 'r7', nickname: 'pixel_priya', points: 90, streakDays: 3 },
  { id: 'r8', nickname: 'nine_lives', points: 40, streakDays: 1 },
  { id: 'r9', nickname: 'brandnew', points: 10, streakDays: 1 },
]
