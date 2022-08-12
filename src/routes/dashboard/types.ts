import type { Question } from '@prisma/client'

export type AnsweredQuestion = Question & { answer: { ownerId: string } }
export type GenericQuestion = Question | AnsweredQuestion

export type QuestionCategories = {
    total: GenericQuestion[],
    unanswered: GenericQuestion[],
    staff: GenericQuestion[],
    community: GenericQuestion[]
  }

export type QuestionCategoriesCounts = {
  [total: string]: number,
  unanswered: number,
  staff: number,
  community: number,
}