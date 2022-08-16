import type {
  QuestionCategories,
  QuestionCategoriesArray,
  QuestionCategoriesCounts,
 AnyQuestion ,
} from './types'

/** rounds start date UP to the next whole week, month, or year */
export function roundStartDate(unit: string, start: Date): boolean {
  switch (unit) {
    case 'days':
      return true
    case 'weeks': // start at the closest Monday 
      if (start.getDay() < 1) {
        start.setDate(start.getDate() + 1)
      } else if (start.getDay() !== 1) {
        start.setDate(start.getDate() + (7 - start.getDay()))
      }
      return true
    case 'months': // start at the first of the month
      if (start.getDate() !== 1) {
        start.setDate(1)
        start.setMonth(start.getMonth() + 1)
      }
      return true
    case 'years': // start on the first of January
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

/** counts the number of questions between two dates in each category */
function filterQuestionsByDate (
  datedQuestions: Map<string, QuestionCategories>,
  questions: QuestionCategories,
  dates: Date[]
): QuestionCategories {
  const filteredQuestions: QuestionCategoriesCounts = {
    total: 0,
    unanswered: 0,
    staff: 0,
    community: 0,
  }
  Object.entries(questions).forEach(([category, categoryQuestions]) => {
    const questionsBetweenDates: AnyQuestion[] = categoryQuestions.filter(
      (question: AnyQuestion) =>
        new Date(question.createdAt) >= dates[0] &&
        new Date(question.createdAt) < dates[1]
    )
    filteredQuestions[category] = questionsBetweenDates.length
    datedQuestions.get('aggregate')[category] =  datedQuestions.get('aggregate')[category].concat(questionsBetweenDates)
  })
  return filteredQuestions
}

/** maps a start date to the number of questions in each category, beginning at the start date
 * and ending at the next sequential date, or today for the last date 
 * also keeps track of total questions for the overall time period
  */
export function binDates(
  dates: Date[],
  questions: QuestionCategoriesArray
): Map<string, QuestionCategories> {
  const today = new Date()
  const datedQuestions = new Map<string, QuestionCategories>([
    ['aggregate', { total: [], unanswered: [], staff: [], community: [] }],
  ])
  if(!dates?.length) return datedQuestions

  for (let i = 0; i < dates?.length - 1; i++) {
    datedQuestions.set(
      dates[i].toString(),
      filterQuestionsByDate(datedQuestions, questions, [dates[i], dates[i + 1]])
    )
  }
  datedQuestions.set(
    dates[dates.length - 1].toString(),
    filterQuestionsByDate(datedQuestions, questions, [dates[dates.length - 1], today])
  )
  return datedQuestions
}

export function filterQuestionsByChannel(questions: QuestionCategoriesArray, channels: string[]): QuestionCategoriesArray {
  const filtered = Object.assign({}, questions)
  Object.entries(filtered).forEach(([category, categoryQuestions]) => {
    filtered[category] = categoryQuestions.filter((question) => channels.includes(question.channelName))
  })
  return filtered
}

export function filterQuestions(channels: string[], dates: Date[], questions: QuestionCategoriesArray,): Map<string, QuestionCategories> {
  const filteredBychannel = filterQuestionsByChannel(questions, channels)
  return binDates(dates, filteredBychannel)
} 