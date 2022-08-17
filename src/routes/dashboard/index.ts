import type { RequestHandler } from '@sveltejs/kit'
import { Routes } from 'discord-api-types/v10'
import { api } from '$discord'
import { ACCESS_LEVELS } from '$lib/constants'
import { prisma } from '$lib/db'
import { isHelpChannel } from '$lib/discord/support'
import type {
  APIGuildMember,
  APIPartialChannel,
  APIGuildPreview,
} from 'discord-api-types/v10'
import type { TextChannel } from 'discord.js'
import { getGHUsername } from './queries'
import type { Answerer, DBQuestion } from './types'

const guildId = import.meta.env.VITE_DISCORD_GUILD_ID
const GUILD_TEXT_CHANNEL = 0

async function fetchHelpChannels() {
  try {
    const allChannels = (await api.get(
      Routes.guildChannels(guildId)
    )) as APIPartialChannel[]
    if(allChannels) {
      return allChannels
      .filter(
        (channel: APIPartialChannel) =>
          channel.type === GUILD_TEXT_CHANNEL &&
          isHelpChannel(channel as TextChannel)
      )
      .map((channel) => channel.name)
    }
  } catch (error) {
    console.error(`Error fetching guild channels ${guildId}: ${error.message}`)
  }
  return []
}

async function asyncFilter(arr: DBQuestion[], callback) {
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
          },
        },
      },
      select: {
        accounts: {
          where: {
            provider: 'github',
          },
        },
      },
    })
    if (data?.accounts[0]?.providerAccountId)
      return getGHUsername(data.accounts[0].providerAccountId)
  } catch (error) {
    console.error(
      `No GitHub account found for user ${discordUserId}: ${error.message}`
    )
  }
  return ''
}

async function isStaff(userId: string) {
  try {
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
              in: [ACCESS_LEVELS.STAFF],
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
  } catch (error) {
    console.error(`Failed to fetch roles: ${error.message}`)
  }
  return false
}

// async function isCommunity(guildMember: APIGuildMember) {
//   const data = await prisma.configuration.findUnique({
//     where: {
//       id: guildId,
//     },
//     select: {
//       roles: {
//         where: {
//           accessLevelId: {
//             in: [ACCESS_LEVELS.CONTRIBUTOR, ACCESS_LEVELS.ADMIN],
//           },
//         },
//         select: {
//           discordRoleId: true,
//         },
//       },
//     },
//   })

//   if (!data?.roles) return false

//   return data?.roles?.some(({ discordRoleId }) =>
//     guildMember?.roles?.includes(discordRoleId)
//   )
// }

async function getUser(userId: string) {
  const guildMember = (await api.get(Routes.guildMember(guildId, userId))) as
    | APIGuildMember
    | undefined

  const discordUsername = guildMember?.user?.username
    ? guildMember.user.username
    : 'unknown user'
  let githubUsername = ''
  let staff = false

  if (guildMember) staff = await isStaff(userId)
  if (staff) githubUsername = await getGithubUsername(userId)
  return {
    id: userId,
    isStaff: staff,
    discordUsername: discordUsername,
    githubUsername: githubUsername,
    questions: [],
  } as Answerer
}

async function getContributors(answered: DBQuestion[]) {
  const contributors = new Map<string, Answerer>()
  for (const question of answered) {
    if (!contributors.has(question.answer!.ownerId)) {
      const user = await getUser(question.answer!.ownerId)
      user.questions.push(question)
      contributors.set(question.answer!.ownerId, user)
    } else {
      contributors.set(question.answer!.ownerId, {
        ...contributors.get(question.answer!.ownerId),
        questions: [
          ...contributors.get(question.answer!.ownerId).questions,
          question,
        ],
      })
    }
  }
  return contributors
}

/** mutates questions with answers to include more data about the answerER */
// async function getAnswers(solvedQuestions: DBQuestion[]): Promise<AnsweredQuestion[]> {
//   return await Promise.all(
//     solvedQuestions.map(async (question) => {
//         return Object.assign(question, {
//           answer: { answeredBy: await getUser(question.answer.ownerId) },
//         })
//     })
//   )
// }

export const GET: RequestHandler = async () => {
  const channels = await fetchHelpChannels()
  
  const guildPreview = (await api.get(
    Routes.guildPreview(guildId)
  )) as APIGuildPreview

  const questions = await prisma.question.findMany({
    include: { answer: { select: { ownerId: true } }, participation: true },
  })
  // questions that are solved and have a selected answer
  const answered = questions.filter(
    (question) => question.isSolved && question.answer?.ownerId
  )
  // const answered: AnsweredQuestion[] = await getAnswers(questions.filter(
  //   (question) => question.isSolved && question.answer?.ownerId)
  // )

  /** @TODO include staff participation in question  */

  return {
    status: 200,
    body: {
      channels: channels,
      contributors:  await getContributors(answered),
      memberCount: guildPreview?.approximate_member_count,
      name: guildPreview?.name,
      presenceCount: guildPreview?.approximate_presence_count,
      allQuestions: {
        total: questions,
        unanswered: questions.filter((question) => !question.isSolved),
        staff: await asyncFilter(answered, async (question: DBQuestion) => await isStaff(question.answer!.ownerId)),
        community: await asyncFilter(answered, async (question: DBQuestion) => ! (await isStaff(question.answer!.ownerId))),
      },
    },
  }
}
