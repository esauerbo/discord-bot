import { prisma } from '$lib/db'
import { faker } from '@faker-js/faker'
import type { Prisma } from '@prisma/client'

function createFakeQuestions(): Prisma.QuestionCreateInput[] {
  return Array.from({ length: 57 }).map((_, i) => ({
    threadId: `999770${faker.random.numeric(12)}`,
    ownerId: '143912968529117185',
    channelName: 'cli-help',
    title: faker.random.words(15),
    isSolved: true,
    url: 'https://discord.com/channels/976838371383083068/976838372205137982/999770893356122152',
    createdAt: faker.date.recent(100),
    guild: {
      connectOrCreate: {
        where: {
          id: import.meta.env.VITE_DISCORD_GUILD_ID,
        },
        create: {
          id: import.meta.env.VITE_DISCORD_GUILD_ID,
        },
      },
    },
    answer: {
      create: {
        id: `999770${faker.random.numeric(12)}`,
        selectedBy: '143912968529117185',
        selectedAt: faker.date.recent(100),
        createdAt: faker.date.recent(100),
        updatedAt: faker.date.recent(100),
        ownerId: `143912968529117185`,
        content: faker.random.words(15),
      },
    },
  }))
}

// function createFakeUsers(): Prisma.UserCreateInput[] {
//   return Array.from({ length: 50 }).map((_, i) => ({
//     id: `143912968529117185${i}`,
//     name: faker.internet.userName(),
//     accounts: {
//       create: [
//         {
//           id:  `c16e6ji${faker.random.numeric(12)}`,
//           type: 'oauth',
//           provider: 'discord',
//           providerAccountId: `985985131271585833${i}`,
//         }
//       ]
//     }
//   }))
// }

/**
 * general seed function for local database
 */
export async function seed() {
  for (const fakeQuestion of createFakeQuestions()) {
    await prisma.question.create({
      data: fakeQuestion,
    })
  }
  // for (const fakeUser of createFakeUsers()) {
  //   await prisma.user.create({
  //     data: fakeUser,
  //   })
  // }
}

try {
  await seed()
} catch (error) {
  throw new Error(`Unable to seed database: ${error.message}`)
}
