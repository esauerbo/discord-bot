import { Routes } from 'discord-api-types/v10'
import { api } from '$discord'
import { prisma } from '$lib/db'
import { guild } from '$lib/store'
import type { RequestHandler } from '@sveltejs/kit'
import type { APIGuildMember } from 'discord-api-types/v10'
import type { Question } from '@prisma/client'
import type { AnsweredQuestion } from './types'

export const GET: RequestHandler = async () => {
  /** @TODO replace with guild from lib  */
  const guildId = process.env.DISCORD_GUILD_ID
  const questions = await prisma.question.findMany({
    include: { answer: { select: { ownerId: true } } },
  })
  async function asyncFilter(arr: Question[], callback) {
    return (
      await Promise.all(
        arr.map(async (item) => ((await callback(item)) ? item : null))
      )
    ).filter((i) => i !== null)
  }

  const unanswered = questions.filter((question) => !question.isSolved)

  const answeredStaff = await asyncFilter(questions, async (question: AnsweredQuestion) => {
    return (
      question.isSolved &&
      question.answer &&
      (await isAdminOrStaff(guildId, question.answer?.ownerId))
    )
  })
  const answeredCommunity = questions.filter(
    (question) =>
      !unanswered.includes(question) && !answeredStaff.includes(question)
  )
  const allQuestions = {
    total: questions,
    unanswered: unanswered,
    staff: answeredStaff,
    community: answeredCommunity,
  }

  const guildPreview = await api.get(Routes.guildPreview(guildId))

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

async function isAdminOrStaff(guildId: string, guildMemberId: string) {
  const guildMember = (await api.get(
    Routes.guildMember(guildId, guildMemberId)
  )) as APIGuildMember | undefined
  const data = await prisma.configuration.findUnique({
    where: {
      id: guildId,
    },
    select: {
      roles: {
        where: {
          accessType: {
            in: ['ADMIN', 'STAFF'],
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