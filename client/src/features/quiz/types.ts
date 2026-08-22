export type QuizQuestion = {
  prompt: string
  options: string[]
  /** Index into `options`. */
  answerIndex: number
  /** Shown after answering, whether right or wrong. */
  explanation: string
}
