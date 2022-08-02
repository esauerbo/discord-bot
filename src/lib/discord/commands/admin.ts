import { MessageEmbed } from 'discord.js'
import type { InteractionReplyOptions, ThreadChannel } from 'discord.js'
import { createCommand, createOption } from '$discord'
import { getUserAccess } from '$discord/get-user-access'
import { prisma } from '$lib/db'
import { postDiscussion } from '../../github/queries'
import { repositories } from './_repositories'

async function handler(interaction): Promise<InteractionReplyOptions | string> {
  const channel = interaction.channel as ThreadChannel

  if (!channel.isThread()) {
    const embed = new MessageEmbed()
    embed.setColor('#ff9900')
    embed.setDescription(
      'This command only works in public threads within help channels.'
    )
    return { embeds: [embed] }
  }

 // console.log(interaction)

  // check if user is admin
  let access
  if (interaction.user.id) {
    try {
      access = await getUserAccess(interaction.user.id)
    } catch (error) {
      console.error('Error getting access', error)
    }
  }
  if (!access?.isAdmin) {
    const embed = new MessageEmbed()
    embed.setColor('#ff9900')
    embed.setDescription('This command can only be used by admins.')
    return { embeds: [embed] }
  }

  const [{ value: repository }] = interaction.options._hoistedOptions
  const id = await getRepoId(repository)
  console.log([...repositories.keys()].map((r) => ({ name: r, value: r })))
  if (id) postDiscussion(id)
  // post discussion to repository
}

async function getRepoId(name: string) {
  try {
    return Array.from(repositories.values()).filter((repo) => repo?.name === name)[0].id
  } catch (err) {
    console.error(err)
  }
  return false
}

// TODO: add error handling if there are no repos
const repository = createOption({
  name: 'repository',
  description: 'The AWS Amplify repository',
  required: true,
  type: 3,
  choices: [...repositories.keys()].map((r) => ({ name: r, value: r })),
})

const command = createCommand({
  name: 'admin',
  description: 'Admin commands',
  enabledByDefault: true,
  options: [
    createOption({
      name: 'thread-create',
      description: 'Post a thread to GitHub Discussions',
      type: 1,
      options: [repository],
    }),
  ],
  handler,
})

export default command

if (import.meta.vitest) {
  const { test } = import.meta.vitest
  test.todo('/admin')
}
