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
  console.time('help channels')
  try {
    const allChannels = (await api.get(
      Routes.guildChannels(guildId)
    )) as APIPartialChannel[]
    if(allChannels) {
      const filtered = allChannels
      .filter(
        (channel: APIPartialChannel) =>
          channel.type === GUILD_TEXT_CHANNEL &&
          isHelpChannel(channel as TextChannel)
      )
      .map((channel) => channel.name)
      console.timeEnd('help channels')
      return filtered
    }
  } catch (error) {
    console.error(`Error fetching guild channels ${guildId}: ${error.message}`)
  }
  console.timeEnd('help channels')
  return []
}

async function asyncFilter(arr: DBQuestion[], callback) {
  console.time('async filter')
  const val =  (
    await Promise.all(
      arr.map(async (item) => ((await callback(item)) ? item : null))
    )
  ).filter((i) => i !== null)
  console.timeEnd('async filter')
  return val
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

async function getUser(userId: string) {
  const guildMember = (await api.get(Routes.guildMember(guildId, userId))) as
    | APIGuildMember
    | undefined

  const discordUsername = guildMember?.user?.username
    ? guildMember.user.username
    : 'unknown user'
  let githubUsername = ''
  let staff = false
  const avatar = guildMember?.user?.avatar ?? `https://cdn.discordapp.com/embed/avatars/${parseInt(guildMember?.user?.discriminator) % 5}.png` 
  if (guildMember) staff = await isStaff(userId)
  if (staff) githubUsername = await getGithubUsername(userId)
  if(githubUsername) githubUsername = ` (GitHub ${githubUsername})`
  return {
    avatar: avatar,
    id: userId,
    isStaff: staff,
    discordUsername:  discordUsername,
    githubUsername: githubUsername,
    questions: [],
  } as Answerer
}

async function getContributors(answered: DBQuestion[]) {
  console.time('get contributors')
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
  console.timeEnd('get contributors')
  return contributors
}

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

  /** @TODO include staff participation in question  */

  return {
    status: 200,
    body: {
      allContributors: JSON.stringify(Array.from(await getContributors(answered))),
      allQuestions: {
        total: questions,
        unanswered: questions.filter((question) => !question.isSolved),
        staff: await asyncFilter(answered, async (question: DBQuestion) => await isStaff(question.answer!.ownerId)),
        community: await asyncFilter(answered, async (question: DBQuestion) => ! (await isStaff(question.answer!.ownerId))),
      },
      channels: channels,
      memberCount: guildPreview?.approximate_member_count,
      name: guildPreview?.name,
      presenceCount: guildPreview?.approximate_presence_count,
    },
  }
}
