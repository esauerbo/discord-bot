import type {
  QuestionCategories,
  QuestionCategoriesCounts,
  GenericQuestion,
} from './types'
import type { Question } from '@prisma/client'

/** rounds start date UP to the next whole week, month, or year */
export function roundStartDate(unit: string, start: Date): boolean {
  switch (unit) {
    case 'days':
      return true
    case 'weeks':
      if (start.getDay() < 1) {
        start.setDate(start.getDate() + 1)
      } else if (start.getDay() !== 1) {
        start.setDate(start.getDate() + (7 - start.getDay()))
      }
      return true
    case 'months':
      if (start.getDate() !== 1) {
        start.setDate(1)
        start.setMonth(start.getMonth() + 1)
      }
      return true
    case 'years':
      if (start.getMonth() !== 0 || start.getDate() !== 1) {
        start.setDate(1)
        start.setMonth(0)
        start.setFullYear(start.getFullYear() + 1)
      }
      return true
    default:
      return false
  }
}

export function incrementDate(unit: string, start: Date): boolean {
  switch (unit) {
    case 'days':
      start.setDate(start.getDate() + 1)
      return true
    case 'weeks':
      start.setDate(start.getDate() + 7)
      return true
    case 'months':
      start.setMonth(start.getMonth() + 1)
      return true
    case 'years':
      start.setFullYear(start.getFullYear() + 1)
      return true
    default:
      return false
  }
}

/** creates a list of dates representing each chunk of
 * time between start and end
 */
export const timeBetweenDates = function (unit: string, dateRange: Date[]) {
  const dates = []
  const start = new Date(dateRange[0])
  roundStartDate(unit, start)
  while (start <= dateRange[1]) {
    dates.push(new Date(start))
    if (!incrementDate(unit, start)) return dates
  }
  return dates
}

// export function binDates(dates: Date[], questions: QuestionCategories) {
//   const today = new Date()
//   const datedQuestions = new Map<string, QuestionCategories>()

//   const filterQuestionsByDate = (
//     questions: QuestionCategories,
//     startDate: Date,
//     endDate: Date
//   ) => {
//     const filteredQuestions = Object.assign({}, questions)
//     console.log(startDate)
//     console.log(endDate)
//     Object.entries(questions).forEach(([category, categoryQuestions]) => {
//       filteredQuestions[category] = categoryQuestions.filter(
//         (question: GenericQuestion) =>
//           question.createdAt >= startDate && question.createdAt < endDate
//       )
//       console.log(startDate)
//       console.log(endDate)
//     })
//     return filteredQuestions
//   }
//   for (let i = 0; i < dates.length - 1; i++) {
//     datedQuestions.set(
//       dates[i].toString(),
//       filterQuestionsByDate(questions, dates[i], dates[i + 1])
//     )
//   }
//   datedQuestions.set(
//     dates[dates.length - 1].toString(),
//     filterQuestionsByDate(questions, dates[dates.length - 1], today)
//   )
//   console.log(datedQuestions.get("Sun May 01 2022 00:00:00 GMT-0700 (Pacific Daylight Time)"))
//   return datedQuestions
// }

export function binDates(
  dates: Date[],
  questions: QuestionCategories
): Map<string, QuestionCategoriesCounts> {
  const today = new Date()
  const datedQuestions = new Map<string, QuestionCategoriesCounts>([
    ['aggregate', { total: 0, unanswered: 0, staff: 0, community: 0 }],
  ])

  const filterQuestionsByDate = (
    questions: QuestionCategories,
    startDate: Date,
    endDate: Date
  ): QuestionCategoriesCounts => {
    const filteredQuestions: QuestionCategoriesCounts = {
      total: 0,
      unanswered: 0,
      staff: 0,
      community: 0,
    }
    Object.entries(questions).forEach(([category, categoryQuestions]) => {
      let count = categoryQuestions.filter((question: GenericQuestion) => 
          (new Date(question.createdAt) >= startDate &&
          new Date(question.createdAt) < endDate
        )
      )?.length
      filteredQuestions[category] = count
      datedQuestions.get('aggregate')[category] += count
    })
    return filteredQuestions
  }
  for (let i = 0; i < dates.length - 1; i++) {
    datedQuestions.set(
      dates[i].toString(),
      filterQuestionsByDate(questions, dates[i], dates[i + 1])
    )
  }
  datedQuestions.set(
    dates[dates.length - 1].toString(),
    filterQuestionsByDate(questions, dates[dates.length - 1], today)
  )
  return datedQuestions
}
