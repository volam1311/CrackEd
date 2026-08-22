import type { QuizQuestion } from './types'

/**
 * Hand-written comprehension questions, keyed by **YouTube video id**.
 *
 * Keying on the YouTube id rather than an internal id is what lets the same
 * question set work against both the seeded mocks and real ingested videos --
 * the backend uses the YouTube id as the document id, so the two line up.
 *
 * These are written against the *actual content* of the real YouTube videos, not
 * against CrackEd's rewritten titles. That distinction matters: generating
 * questions from a title and description alone — which is all the YouTube Data
 * API gives us — produces confident, plausible, wrong questions. Until a
 * transcript source exists (caption tracks, or the upload pipeline), seeded
 * questions are the honest option. Videos with no entry here offer no quiz.
 */
export const quizzes: Record<string, QuizQuestion[]> = {
  // 3Blue1Brown — But what is a neural network?
  aircAruvnKk: [
    {
      prompt: 'What does each neuron in the first layer of the network hold?',
      options: [
        'The grayscale value of a single pixel',
        'A complete digit prediction',
        'One training example',
        'A randomly initialised weight',
      ],
      answerIndex: 0,
      explanation:
        'The input layer has one neuron per pixel of the 28x28 image — 784 in total — each holding that pixel’s brightness.',
    },
    {
      prompt: 'What is a neuron’s bias for?',
      options: [
        'Setting how high the weighted sum must be before the neuron activates',
        'Choosing which layer the neuron belongs to',
        'Preventing the network from training',
        'Storing the correct answer during training',
      ],
      answerIndex: 0,
      explanation:
        'Weights decide what pattern a neuron looks for; the bias shifts the threshold at which that pattern counts as detected.',
    },
    {
      prompt: 'What task is the network in the video trained to perform?',
      options: [
        'Recognising handwritten digits',
        'Translating between languages',
        'Generating images from text',
        'Predicting stock prices',
      ],
      answerIndex: 0,
      explanation:
        'The series is built around classifying handwritten digits from the MNIST dataset.',
    },
  ],

  // 3Blue1Brown — Vectors, Chapter 1 of Essence of Linear Algebra
  fNk_zzaMoSs: [
    {
      prompt: 'In the linear algebra convention, where does a vector’s tail sit?',
      options: [
        'At the origin',
        'Anywhere in space',
        'At the tip of the previous vector',
        'On the x-axis',
      ],
      answerIndex: 0,
      explanation:
        'Unlike the physics view where an arrow can sit anywhere, linear algebra roots every vector at the origin.',
    },
    {
      prompt: 'How is the sum of two vectors visualised?',
      options: [
        'Move the second vector’s tail to the first vector’s tip',
        'Multiply their lengths together',
        'Rotate the first vector by the second’s angle',
        'Take the area of the square they span',
      ],
      answerIndex: 0,
      explanation:
        'Tip-to-tail: the sum runs from the first vector’s tail to the second vector’s new tip.',
    },
    {
      prompt: 'What does multiplying a vector by 2 do to it?',
      options: [
        'Stretches it to twice its length, same direction',
        'Rotates it by 90 degrees',
        'Moves it two units to the right',
        'Adds 2 to each coordinate',
      ],
      answerIndex: 0,
      explanation:
        'Scalar multiplication scales length. A negative scalar also flips the direction.',
    },
  ],

  // 3Blue1Brown — The essence of calculus
  WUvTyaaNkzM: [
    {
      prompt: 'How does the video build up the area of a circle?',
      options: [
        'By slicing it into many thin concentric rings',
        'By counting squares on a grid',
        'By measuring the circumference and dividing',
        'By comparing it to a triangle of equal height',
      ],
      answerIndex: 0,
      explanation:
        'Unrolling each thin ring into a near-rectangle turns the area into a sum that becomes an integral.',
    },
    {
      prompt: 'What central relationship does the series build towards?',
      options: [
        'Integrals and derivatives are inverse operations',
        'Every curve has a constant slope',
        'Area and circumference are always equal',
        'Limits are unnecessary in calculus',
      ],
      answerIndex: 0,
      explanation:
        'That inverse relationship is the fundamental theorem of calculus, which the ring argument foreshadows.',
    },
    {
      prompt: 'Why break a hard problem into very small pieces?',
      options: [
        'Each piece is approximated easily, and the error vanishes as the pieces shrink',
        'Small numbers are faster to multiply',
        'It avoids needing any algebra',
        'It makes the answer wrong by a fixed, known amount',
      ],
      answerIndex: 0,
      explanation:
        'This is the recurring idea of the series: hard totals become sums of easy approximations in the limit.',
    },
  ],

  // freeCodeCamp — SQL / databases
  HXV3zeQKqGY: [
    {
      prompt: 'Which SQL clause filters which rows are returned?',
      options: ['WHERE', 'ORDER BY', 'GROUP BY', 'SELECT'],
      answerIndex: 0,
      explanation:
        'SELECT chooses columns, WHERE filters rows. ORDER BY sorts and GROUP BY aggregates.',
    },
    {
      prompt: 'What does a primary key guarantee?',
      options: [
        'Each row in the table is uniquely identifiable',
        'The column always holds a number',
        'The table can only hold one row',
        'The data is encrypted at rest',
      ],
      answerIndex: 0,
      explanation:
        'A primary key is unique and non-null, which is what lets other tables reference a specific row.',
    },
    {
      prompt: 'What does a JOIN do?',
      options: [
        'Combines rows from two tables using a related column',
        'Merges two databases into one file',
        'Deletes duplicate rows',
        'Renames a table',
      ],
      answerIndex: 0,
      explanation:
        'Joins are how normalised data gets recombined — matching a foreign key back to its primary key.',
    },
  ],

  // Veritasium — The Big Misconception About Electricity
  bHIhgxav9LY: [
    {
      prompt: 'Where does the electrical energy actually travel?',
      options: [
        'In the electromagnetic fields in the space around the wires',
        'Inside the wire, carried along by the electrons',
        'Through the air as radio waves',
        'In the heat generated by the filament',
      ],
      answerIndex: 0,
      explanation:
        'The wires guide the fields; the energy flows through the field around them, described by the Poynting vector.',
    },
    {
      prompt: 'How fast do individual electrons drift through a wire?',
      options: [
        'Very slowly — on the order of millimetres per second',
        'At the speed of light',
        'At about half the speed of light',
        'They do not move at all',
      ],
      answerIndex: 0,
      explanation:
        'Drift velocity is tiny, yet the energy arrives almost instantly. That mismatch is the whole puzzle.',
    },
    {
      prompt:
        'With light-second-long wires and a bulb 1 m from the battery, when does the bulb first receive energy?',
      options: [
        'After roughly 1/c seconds — about 3.3 nanoseconds',
        'After one second',
        'After two seconds',
        'Never, because the circuit is too long',
      ],
      answerIndex: 0,
      explanation:
        'Energy crosses the 1 m gap directly through the field, so the delay is set by that gap, not the wire length.',
    },
  ],

  // Ali Abdaal — Evidence-based revision tips
  ukLnPbIffxE: [
    {
      prompt: 'Which technique does the evidence most strongly support?',
      options: [
        'Active recall — testing yourself on the material',
        'Highlighting the important passages',
        'Re-reading your notes repeatedly',
        'Listening to the lecture again at 2x speed',
      ],
      answerIndex: 0,
      explanation:
        'Retrieving information strengthens memory far more than reviewing it passively — the testing effect.',
    },
    {
      prompt: 'Why are re-reading and highlighting considered weak study methods?',
      options: [
        'They feel productive but produce little retention',
        'They take too long to do',
        'They only work for maths subjects',
        'They damage long-term memory',
      ],
      answerIndex: 0,
      explanation:
        'Familiarity gets mistaken for knowledge — the fluency illusion. Recognising material is not recalling it.',
    },
    {
      prompt: 'What does spaced repetition take advantage of?',
      options: [
        'Reviewing just as you are about to forget strengthens memory most',
        'Studying one topic for many hours at a stretch',
        'Learning several subjects simultaneously',
        'Sleeping immediately after studying',
      ],
      answerIndex: 0,
      explanation:
        'Spacing reviews across increasing intervals beats massed practice for durable retention.',
    },
  ],
}

export function quizFor(videoId: string): QuizQuestion[] | null {
  return quizzes[videoId] ?? null
}
