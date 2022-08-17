import type { Participation, Question } from '@prisma/client'

// question fetched from db with answer's ownerId and participation fields included
export type DBQuestion = Question & { answer: { ownerId: string} | null, participation: Participation[]}

// answered or unanswered question
// export type AnyQuestion = Question | DBQuestion

// object for user who answered a given question 
export type Answerer = {
  avatar: string,
  id: string,
  isStaff: boolean,
  discordUsername: string,
  githubUsername: string,
  questions: DBQuestion[],
}

// export type QuestionCategories = QuestionCategoriesCounts | QuestionCategoriesArray

// counts number of questions in each category
export type CategorizedQuestionCounts = {
  [total: string]: number,
  unanswered: number,
  staff: number,
  community: number,
}

// stores acutal questions in each category
export type CategorizedQuestions = {
  [total: string]: DBQuestion[],
  unanswered: DBQuestion[],
  staff: DBQuestion[],
  community: DBQuestion[],
}