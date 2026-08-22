import { useState } from 'react'
import type { QuizQuestion } from './types'
import { recordQuiz } from '../../lib/progress'
import { Icon } from '../../components/ui/Icon'

type QuizPanelProps = {
  videoId: string
  videoTitle: string
  questions: QuizQuestion[]
  onDone: () => void
}

/**
 * One question at a time with immediate feedback, rather than a graded form at
 * the end. Feedback per answer is what makes this feel like a game loop instead
 * of homework — and it is also what actually helps retention.
 *
 * Scoring deliberately ignores speed: rewarding fast answers would encourage
 * skimming, which is the behaviour CrackEd exists to push against.
 */
export function QuizPanel({ videoId, videoTitle, questions, onDone }: QuizPanelProps) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [earned, setEarned] = useState<number | null>(null)

  const question = questions[index]
  const isLast = index === questions.length - 1
  const answered = picked !== null

  function choose(optionIndex: number) {
    if (answered) return
    setPicked(optionIndex)
    if (optionIndex === question.answerIndex) {
      setCorrectCount((count) => count + 1)
    }
  }

  function next() {
    if (!isLast) {
      setIndex((i) => i + 1)
      setPicked(null)
      return
    }

    // Final tally includes the question just answered.
    const total = questions.length
    setEarned(recordQuiz(videoId, correctCount, total))
  }

  if (earned !== null) {
    return (
      <Results
        correct={correctCount}
        total={questions.length}
        earned={earned}
        onDone={onDone}
      />
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent uppercase">
            Check your understanding
          </p>
          <p className="mt-1 line-clamp-1 text-sm text-muted">{videoTitle}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-muted tabular-nums">
          {index + 1} / {questions.length}
        </span>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <h3 className="mt-6 text-lg leading-snug font-semibold text-text">
        {question.prompt}
      </h3>

      <ul className="mt-5 flex flex-col gap-2">
        {question.options.map((option, optionIndex) => (
          <li key={option}>
            <button
              type="button"
              onClick={() => choose(optionIndex)}
              disabled={answered}
              className={optionClass(optionIndex, picked, question.answerIndex)}
            >
              <span className="flex-1">{option}</span>
              {answered && optionIndex === question.answerIndex ? (
                <Icon name="verified" className="size-5 shrink-0 text-emerald-400" filled />
              ) : null}
              {answered && optionIndex === picked && optionIndex !== question.answerIndex ? (
                <Icon name="close" className="size-5 shrink-0 text-accent" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {answered ? (
        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-text">
            {picked === question.answerIndex ? 'Correct' : 'Not quite'}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{question.explanation}</p>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-4 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-text"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!answered}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  )
}

function optionClass(
  optionIndex: number,
  picked: number | null,
  answerIndex: number,
): string {
  const base =
    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors'

  if (picked === null) {
    return `${base} border-border bg-surface text-text hover:border-accent/60 hover:bg-elevated`
  }
  if (optionIndex === answerIndex) {
    return `${base} border-emerald-500/60 bg-emerald-500/10 text-text`
  }
  if (optionIndex === picked) {
    return `${base} border-accent/60 bg-accent/10 text-text`
  }
  return `${base} border-border bg-surface text-muted opacity-60`
}

function Results({
  correct,
  total,
  earned,
  onDone,
}: {
  correct: number
  total: number
  earned: number
  onDone: () => void
}) {
  const perfect = correct === total

  return (
    <div className="p-8 text-center">
      <p className="text-xs font-bold tracking-widest text-accent uppercase">
        {perfect ? 'Perfect run' : 'Quiz complete'}
      </p>

      <p className="mt-4 text-5xl font-bold text-text tabular-nums">
        {correct}
        <span className="text-2xl text-muted">/{total}</span>
      </p>

      <p className="mt-4 text-sm text-muted">
        {earned > 0 ? (
          <>
            <span className="font-semibold text-accent">+{earned} points</span>
            {perfect ? ' — including a 20 point bonus for a clean sweep.' : ' added to your total.'}
          </>
        ) : (
          'No new points — you had already scored at least this well on this video.'
        )}
      </p>

      <button
        type="button"
        onClick={onDone}
        className="mt-7 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Back to feed
      </button>
    </div>
  )
}
