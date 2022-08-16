import { Routes } from 'discord-api-types/v10'
import { api } from '$discord'
import { ACCESS_LEVELS } from '$lib/constants'
import { prisma } from '$lib/db'
import { getGHUsername } from '$lib/github/restQueries'
import type { APIGuildMember } from 'discord-api-types/v10'
import type { Question } from '@prisma/client'
import type { RequestHandler } from '@sveltejs/kit'
import type { AnsweredQuestion } from './types'

const guildId = import.meta.env.VITE_DISCORD_GUILD_ID

async function asyncFilter(arr: Question[], callback) {
  return (
    await Promise.all(
      arr.map(async (item) => ((await callback(item)) ? item : null))
    )
  ).filter((i) => i !== null)
}

async function getGithubUsername(discordUserId: string) {
  try {
    const data = await prisma.user.findFirst({
      where: {
       accounts: {
         some: {
           provider: 'discord',
           providerAccountId: discordUserId,
         }
       }
      }, 
      select: {
       accounts: {
         where: {
           provider: 'github'
         }
       }
      }
     })
     if(data?.accounts[0]?.providerAccountId) return getGHUsername(data.accounts[0].providerAccountId)
  } catch (error) {
    console.error(`No GitHub account found for user ${discordUserId}: ${error.message}`)
  }
  return "unknown GitHub username"
}


async function isAdminOrStaff(guildId: string, userId: string) {
  const guildMember = (await api.get(Routes.guildMember(guildId, userId))) as
  | APIGuildMember
  | undefined

  const data = await prisma.configuration.findUnique({
    where: {
      id: guildId,
    },
    select: {
      roles: {
        where: {
          accessLevelId: {
            in: [ACCESS_LEVELS.ADMIN, ACCESS_LEVELS.STAFF],
          },
        },
        select: {
          discordRoleId: true,
        },
      },
    },
  })

  if (!data?.roles) return false

  return data?.roles?.some(({ discordRoleId }) =>
    guildMember?.roles?.includes(discordRoleId)
  )
}

async function getUser(guildId: string, userId: string) {
  const guildMember = (await api.get(Routes.guildMember(guildId, userId))) as
    | APIGuildMember
    | undefined
  const discordUsername = guildMember?.user?.username
    ? guildMember.user.username
    : 'unknown user'
  let githubUsername = ""
  const adminOrStaff = await isAdminOrStaff(guildId, userId)
  if(adminOrStaff) githubUsername = await getGithubUsername(userId)

  return {
    id: userId,
    isAdminOrStaff: adminOrStaff,
    discordUsername: discordUsername,
    githubUsername: githubUsername,
  }
}

export const GET: RequestHandler = async () => {
  const questions = await prisma.question.findMany({
    include: { answer: { select: { ownerId: true } } },
  })
  // add data about the answerer to answered questions
  const questionsWithAnswers = await Promise.all(questions.map(async (question) => {
    if(question.answer?.ownerId) {
      const newQuestion = Object.assign({}, question)
      const answerer = await getUser(guildId, question.answer.ownerId)
      newQuestion.answer = {
        answeredBy: answerer
      }
      return newQuestion
    }
    return question
  }))

    /** @TODO include staff participation in question  */
  // filter out unanswered questions
  const unanswered = questionsWithAnswers.filter((question) => !question.isSolved)

  const answeredStaff = await asyncFilter(
    questionsWithAnswers,
    async (question: AnsweredQuestion ) => {
      return (
        question.isSolved &&
        question?.answer?.answeredBy?.isAdminOrStaff
      )
    }
  )

  const answeredCommunity = questionsWithAnswers.filter(
    (question) =>
      !unanswered.includes(question) && !answeredStaff.includes(question)
  )
  const allQuestions = {
    total: questionsWithAnswers,
    unanswered: unanswered,
    staff: answeredStaff,
    community: answeredCommunity,
  }

  const guildPreview = await api.get(Routes.guildPreview(guildId))
  console.log(guildPreview)

  return {
    status: 200,
    body: {
      questions: allQuestions,
      name: guildPreview?.name,
      memberCount: guildPreview?.approximate_member_count,
      presenceCount: guildPreview?.approximate_presence_count,
    },
  }
}
