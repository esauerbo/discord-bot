import type {
  Answerer,
  CategorizedQuestions,
  DBQuestion,
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

/** increments date based on unit of time by mutating the date */
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
function filterQuestionsByDate(
  datedQuestions: Map<string, CategorizedQuestions>,
  questions: CategorizedQuestions,
  dates: Date[]
): CategorizedQuestions {
  const filteredQs = {
    total: [],
    unanswered: [],
    staff: [],
    community: [],
  } as CategorizedQuestions

  Object.entries(questions).forEach(([category, categoryQuestions]) => {
    const questionsBetweenDates =
      categoryQuestions.filter(
        (question: DBQuestion) =>
          new Date(question.createdAt) >= dates[0] &&
          new Date(question.createdAt) < dates[1]
      ) ?? []
    filteredQs[category] = questionsBetweenDates
    datedQuestions.get('aggregate')![category] =
    datedQuestions.get('aggregate')![category] =  datedQuestions.get('aggregate')![category].concat(questionsBetweenDates)
  })
  return filteredQs
}

/** maps a start date to the number of questions in each category, beginning at the start date
 * and ending at the next sequential date, or today for the last date
 * also keeps track of total number of questions for the overall time period
 */
export function binDates(
  dates: Date[],
  questions: CategorizedQuestions
): Map<string, CategorizedQuestions> {
  const today = new Date()
  const datedQuestions = new Map<string, CategorizedQuestions>([
    ['aggregate', { total: [], unanswered: [], staff: [], community: [] }],
  ])
  if (!dates?.length) return datedQuestions
  /** @TODO check logic for missing first date */
  for (let i = 0; i < dates?.length - 1; i++) {
    datedQuestions.set(
      dates[i].toString(),
      filterQuestionsByDate(datedQuestions, questions, [dates[i], dates[i + 1]])
    )
  }
  datedQuestions.set(
    dates[dates.length - 1].toString(),
    filterQuestionsByDate(datedQuestions, questions, [
      dates[dates.length - 1],
      today,
    ])
  )
  return datedQuestions
}

/** filters categorized questions by channel */
// export function filterQuestionsByChannel(questions: CategorizedQuestions, channels: string[]): CategorizedQuestions {
//   const filtered = Object.assign({}, questions)
//   Object.entries(filtered).forEach(([category, categoryQuestions]) => {
//     filtered[category] = filterByChannel(channels, categoryQuestions)
//   })
//   return filtered
// }

function filterByChannel(channels: string[], questions: DBQuestion[]) {
  return questions.filter((question) => channels.includes(question.channelName))
}

/** filters categorized questions by channel and date */
export function filterQuestions(
  channels: string[],
  dates: Date[],
  questions: CategorizedQuestions
): Map<string, CategorizedQuestions> {
  const filtered = Object.assign({}, questions)
  Object.entries(filtered).forEach(([category, categoryQuestions]) => {
    filtered[category] = filterByChannel(channels, categoryQuestions)
  })
  return binDates(dates, filtered)
}

export function filterAnswers(
  channels: string[],
  dates: Date[],
  contributors: Map<string, Answerer>
) {
  const filtered: Map<string, Answerer> = new Map(
    JSON.parse(JSON.stringify(Array.from(contributors)))
  )
  filtered.forEach((answerer) => {
    answerer.questions = filterByChannel(channels, answerer.questions)
  })
  filtered.forEach((answerer) => {
    answerer.questions = answerer.questions.filter(
      (question) =>
        new Date(question.createdAt) >= dates[0] &&
        new Date(question.createdAt) < dates[1]
    )
  })
  return filtered
}

export function sortChannels(questions: DBQuestion[]) {
  const counts = questions
      .reduce((count, question) => {
        const key = question.channelName
        return count[key] ? ++count[key] : (count[key] = 1), count
      }, {})

    return Object.entries(counts)
      .map(([channelName, count]) => {return {group: channelName, count}})
}

export function getTopContributors (
  answers: Map<string, Answerer>,
  staff: boolean
): { id: string; name: string; answers: number }[] {
  let counts = Array.from(answers)
  if (staff) counts = counts.filter(([id, user]) => user.isStaff)
  counts = counts
    .map(([id, user]) => [
      id,
      `${user.discordUsername}${user.githubUsername}`,
      user.questions.length,
    ])
    .sort((prev, next) => next[1] - prev[1])
    .slice(0, 9)
    .map((contributor) => {
      return {
        id: contributor[0],
        name: contributor[1],
        answers: contributor[2],
      }
    })

  if (counts) return counts
  return []
}
