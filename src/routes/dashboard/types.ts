import type { Question } from '@prisma/client'

export type AnsweredQuestion = Question & { answer: { answeredBy: Answerer } }
export type AnyQuestion = Question | AnsweredQuestion

export type Answerer = {
  id: string,
  isAdminOrStaff: boolean,
  discordUsername: string,
  githubUsername?: string,
}

export type QuestionCategories = QuestionCategoriesCounts | QuestionCategoriesArray

export type QuestionCategoriesCounts = {
  [total: string]: number,
  unanswered: number,
  staff: number,
  community: number,
}

export type QuestionCategoriesArray = {
  [total: string]: AnyQuestion[],
  unanswered: AnyQuestion[],
  staff: AnyQuestion[],
  community: AnyQuestion[],
}