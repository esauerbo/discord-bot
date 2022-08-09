import { Routes } from 'discord-api-types/v10'
import { api } from '$discord'
import { prisma } from '$lib/db'
import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = async () => {
  const configuration = await prisma.configuration.findFirst()
  // const guildId = configuration?.guild?.id
  const guildId = process.env.DISCORD_GUILD_ID
  const guildPreview = await api.get(Routes.guildPreview(guildId))

  return {
    status: 200,
    body: {
      name: guildPreview?.name,
      memberCount: guildPreview?.approximate_member_count,
      presenceCount: guildPreview?.approximate_presence_count,
    },
  }
}
