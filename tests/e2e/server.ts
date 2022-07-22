import { resolve } from 'node:path'
import { EOL } from 'node:os'
import { installPolyfills } from '@sveltejs/kit/node/polyfills'
import glob from 'fast-glob'
import request from 'supertest'
import { beforeAll } from 'vitest'
import { seed } from '../seed'
import type { Server } from 'node:http'
import type { Session } from 'next-auth'
import { describe } from 'vitest'
import { it } from 'vitest'

try {
  // seed database
  await seed()
} catch (error) {
  console.log(error)
}

let app: Express.Application
const session: Session = {
  expires: '1',
  user: { email: 'hello@fake.com', name: 'Bob', image: 'llama.jpg' },
}

beforeAll(async () => {
  installPolyfills() // we're in Node, so we need to polyfill `fetch` and `Request` etc
  try {
    const build = await import('../../build/server')
    // instead of adding a condition to open the server in the source code, we'll just close it here.
    // TODO: instead of "supertest", should we make actual requests to the server?
    ;(build.server as Server).close()
    app = build.app
  } catch (error) {
    throw new Error(
      `Unable to import server application, has it been built?${EOL}${EOL}Run "pnpm build"`
    )
  }
})

const ROUTES_PATH = resolve('src/routes')

const routes = await glob('**/*.(js|ts)', {
  absolute: true,
  cwd: ROUTES_PATH,
  ignore: ['**/_*'],
})

function routify(path: string) {
  return `${path
    .replace(ROUTES_PATH, '')
    .replace(/\.(js|ts)/, '')
    .replace(/index$/, '')}`
}

function isDynamicRoute(route: string) {
  return /\[.*?\]/.test(route)
}

// TODO: do we _need_ this?
describe('Routes defined in Svelte-Kit app', async () => {
  for await (const [route, mod] of routes.map(
    (r) => <[string, Promise<any>]>[routify(r), import(r)]
  )) {
    if (!isDynamicRoute(route)) {
      it(`should respond ${route}`, async () => {
        const response = await request(app).get(route)
        expect(response.status).toBeTruthy()
        expect(response.status).not.toBe(404)
      })
      // TODO: `await mod()` to check for exposed methods, test exposed methods
    }
  }
})

describe('GET /healthcheck', () => {
  it('should return 200', async () => {
    const response = await request(app).get('/healthcheck')
    expect(response.status).toBe(200)
  })
})

describe('Admin Routes', () => {
  describe('GET /admin', () => {
    it('should redirect to /restricted', async () => {
      const response = await request(app).get('/admin')
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/restricted')
    })
  })
  describe('GET /admin/configure', () => {
    it('should redirect to /restricted', async () => {
      const response = await request(app)
        .get('/admin/configure')
        .query('guildId=123')
      expect(response.status).toBe(302)
      expect(response.headers.location).toBe('/restricted')
    })
  })
  describe('POST /api/admin/commands/sync', () => {
    it('should return 401', async () => {
      const response = await request(app).post('/api/admin/commands/sync')
      expect(response.status).toBe(401)
    })
  })
})

describe('webhooks', () => {
  describe('POST /api/webhooks/github-release', () => {
    const mocked = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=df80b1d8f9348825f3edd5df44258cb6cfb822f7de73088372c5b54bdd970ce0',
        'X-GitHub-Event': 'release',
        'Content-Type': 'application/json',
      },
      body: {
        action: 'published',
        release: {
          url: 'https://api.github.com/repos/aws-amplify/discord-bot/releases/71514916',
          assets_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/releases/71514916/assets',
          upload_url:
            'https://uploads.github.com/repos/aws-amplify/discord-bot/releases/71514916/assets{?name,label}',
          html_url:
            'https://github.com/aws-amplify/discord-bot/releases/tag/v0.5.2',
          id: 71514916,
          author: {
            login: 'josefaidt',
            id: 5033303,
            node_id: 'MDQ6VXNlcjUwMzMzMDM=',
            avatar_url: 'https://avatars.githubusercontent.com/u/5033303?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/josefaidt',
            html_url: 'https://github.com/josefaidt',
            followers_url: 'https://api.github.com/users/josefaidt/followers',
            following_url:
              'https://api.github.com/users/josefaidt/following{/other_user}',
            gists_url: 'https://api.github.com/users/josefaidt/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/josefaidt/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/josefaidt/subscriptions',
            organizations_url: 'https://api.github.com/users/josefaidt/orgs',
            repos_url: 'https://api.github.com/users/josefaidt/repos',
            events_url: 'https://api.github.com/users/josefaidt/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/josefaidt/received_events',
            type: 'User',
            site_admin: false,
          },
          node_id: 'RE_kwDOFmU2Nc4EQzsk',
          tag_name: 'v0.5.2',
          target_commitish: 'main',
          name: 'v0.5.2',
          draft: false,
          prerelease: false,
          created_at: '2022-07-07T20:43:14Z',
          published_at: '2022-07-07T20:43:37Z',
          assets: [],
          tarball_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/tarball/v0.5.2',
          zipball_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/zipball/v0.5.2',
          body: "## What's Changed\n* fix: cloudfront should talk to origin over HTTP by @josefaidt in https://github.com/aws-amplify/discord-bot/pull/111\n* docs: add architecture diagram to contributing guide by @josefaidt in https://github.com/aws-amplify/discord-bot/pull/113\n* fix: URL.pathname -> url.fileURLToPath by @josefaidt in https://github.com/aws-amplify/discord-bot/pull/112\n* docs: improve language for creating local dotenv file by @josefaidt in https://github.com/aws-amplify/discord-bot/pull/114\n* chore: type interaction handler responses by @josefaidt in https://github.com/aws-amplify/discord-bot/pull/116\n\n\n**Full Changelog**: https://github.com/aws-amplify/discord-bot/compare/v0.5.1...v0.5.2",
          mentions_count: 1,
        },
        repository: {
          id: 375731765,
          node_id: 'MDEwOlJlcG9zaXRvcnkzNzU3MzE3NjU=',
          name: 'discord-bot',
          full_name: 'aws-amplify/discord-bot',
          private: false,
          owner: {
            login: 'aws-amplify',
            id: 41077760,
            node_id: 'MDEyOk9yZ2FuaXphdGlvbjQxMDc3NzYw',
            avatar_url: 'https://avatars.githubusercontent.com/u/41077760?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/aws-amplify',
            html_url: 'https://github.com/aws-amplify',
            followers_url: 'https://api.github.com/users/aws-amplify/followers',
            following_url:
              'https://api.github.com/users/aws-amplify/following{/other_user}',
            gists_url: 'https://api.github.com/users/aws-amplify/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/aws-amplify/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/aws-amplify/subscriptions',
            organizations_url: 'https://api.github.com/users/aws-amplify/orgs',
            repos_url: 'https://api.github.com/users/aws-amplify/repos',
            events_url:
              'https://api.github.com/users/aws-amplify/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/aws-amplify/received_events',
            type: 'Organization',
            site_admin: false,
          },
          html_url: 'https://github.com/aws-amplify/discord-bot',
          description: 'Discord bot for the AWS Amplify Discord Server',
          fork: false,
          url: 'https://api.github.com/repos/aws-amplify/discord-bot',
          forks_url: 'https://api.github.com/repos/aws-amplify/discord-bot/forks',
          keys_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/keys{/key_id}',
          collaborators_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/collaborators{/collaborator}',
          teams_url: 'https://api.github.com/repos/aws-amplify/discord-bot/teams',
          hooks_url: 'https://api.github.com/repos/aws-amplify/discord-bot/hooks',
          issue_events_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/issues/events{/number}',
          events_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/events',
          assignees_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/assignees{/user}',
          branches_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/branches{/branch}',
          tags_url: 'https://api.github.com/repos/aws-amplify/discord-bot/tags',
          blobs_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/git/blobs{/sha}',
          git_tags_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/git/tags{/sha}',
          git_refs_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/git/refs{/sha}',
          trees_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/git/trees{/sha}',
          statuses_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/statuses/{sha}',
          languages_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/languages',
          stargazers_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/stargazers',
          contributors_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/contributors',
          subscribers_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/subscribers',
          subscription_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/subscription',
          commits_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/commits{/sha}',
          git_commits_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/git/commits{/sha}',
          comments_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/comments{/number}',
          issue_comment_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/issues/comments{/number}',
          contents_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/contents/{+path}',
          compare_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/compare/{base}...{head}',
          merges_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/merges',
          archive_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/{archive_format}{/ref}',
          downloads_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/downloads',
          issues_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/issues{/number}',
          pulls_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/pulls{/number}',
          milestones_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/milestones{/number}',
          notifications_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/notifications{?since,all,participating}',
          labels_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/labels{/name}',
          releases_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/releases{/id}',
          deployments_url:
            'https://api.github.com/repos/aws-amplify/discord-bot/deployments',
          created_at: '2021-06-10T14:46:42Z',
          updated_at: '2022-06-27T22:59:29Z',
          pushed_at: '2022-07-07T20:43:37Z',
          git_url: 'git://github.com/aws-amplify/discord-bot.git',
          ssh_url: 'git@github.com:aws-amplify/discord-bot.git',
          clone_url: 'https://github.com/aws-amplify/discord-bot.git',
          svn_url: 'https://github.com/aws-amplify/discord-bot',
          homepage: '',
          size: 1851,
          stargazers_count: 11,
          watchers_count: 11,
          language: 'TypeScript',
          has_issues: true,
          has_projects: true,
          has_downloads: true,
          has_wiki: false,
          has_pages: false,
          forks_count: 5,
          mirror_url: null,
          archived: false,
          disabled: false,
          open_issues_count: 32,
          license: {
            key: 'apache-2.0',
            name: 'Apache License 2.0',
            spdx_id: 'Apache-2.0',
            url: 'https://api.github.com/licenses/apache-2.0',
            node_id: 'MDc6TGljZW5zZTI=',
          },
          allow_forking: true,
          is_template: false,
          web_commit_signoff_required: false,
          topics: ['aws-amplify', 'discord'],
          visibility: 'public',
          forks: 5,
          open_issues: 32,
          watchers: 11,
          default_branch: 'main',
        },
        organization: {
          login: 'aws-amplify',
          id: 41077760,
          node_id: 'MDEyOk9yZ2FuaXphdGlvbjQxMDc3NzYw',
          url: 'https://api.github.com/orgs/aws-amplify',
          repos_url: 'https://api.github.com/orgs/aws-amplify/repos',
          events_url: 'https://api.github.com/orgs/aws-amplify/events',
          hooks_url: 'https://api.github.com/orgs/aws-amplify/hooks',
          issues_url: 'https://api.github.com/orgs/aws-amplify/issues',
          members_url: 'https://api.github.com/orgs/aws-amplify/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/aws-amplify/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/41077760?v=4',
          description: '',
        },
        enterprise: {
          id: 1290,
          slug: 'amazon',
          name: 'Amazon',
          node_id: 'MDEwOkVudGVycHJpc2UxMjkw',
          avatar_url: 'https://avatars.githubusercontent.com/b/1290?v=4',
          description: '',
          website_url: 'https://www.amazon.com/',
          html_url: 'https://github.com/enterprises/amazon',
          created_at: '2019-11-13T18:05:41Z',
          updated_at: '2022-03-18T18:37:08Z',
        },
        sender: {
          login: 'josefaidt',
          id: 5033303,
          node_id: 'MDQ6VXNlcjUwMzMzMDM=',
          avatar_url: 'https://avatars.githubusercontent.com/u/5033303?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/josefaidt',
          html_url: 'https://github.com/josefaidt',
          followers_url: 'https://api.github.com/users/josefaidt/followers',
          following_url:
            'https://api.github.com/users/josefaidt/following{/other_user}',
          gists_url: 'https://api.github.com/users/josefaidt/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/josefaidt/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/josefaidt/subscriptions',
          organizations_url: 'https://api.github.com/users/josefaidt/orgs',
          repos_url: 'https://api.github.com/users/josefaidt/repos',
          events_url: 'https://api.github.com/users/josefaidt/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/josefaidt/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }
    it('should not return 401', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-release')
        .send({})
      expect(response.status).not.toBe(401)
    })
    it('should return 403 without auth header', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-release')
        .send({})
      expect(response.status).toBe(403)
    })

    it('bad url: should return 400', async () => {
      const url = process.env.DISCORD_WEBHOOK_URL_RELEASES
      process.env.DISCORD_WEBHOOK_URL_RELEASES =
        'https://discordapp.com/api/webhooks/bad'
      const response = await request(app)
        .post('/api/webhooks/github-release')
        .send(mocked.body)
        .set(mocked.headers)
      expect(response.status).toBe(400)
      process.env.DISCORD_WEBHOOK_URL_RELEASES = url
    })

    it('should return 200', async () => {
      const response = await request(app)
      .post('/api/webhooks/github-release')
      .send(mocked.body)
      .set(mocked.headers)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/webhooks/github-org-membership', () => {
    const removedPayload1 = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=493d810e4b395d478fdc685a865308101ad4df12bb59bd8b64c0dfc22e44909c',
        'content-type': 'application/json',
      },
      body: {
        action: 'member_removed',
        membership: {
          url: 'https://api.github.com/orgs/discord-bot-org/memberships/esauerbo1',
          state: 'inactive',
          role: 'unaffiliated',
          organization_url: 'https://api.github.com/orgs/discord-bot-org',
          user: {
            login: 'esauerbo1',
            id: 107655607,
            node_id: 'U_kgDOBmqxtw',
            avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/esauerbo1',
            html_url: 'https://github.com/esauerbo1',
            followers_url: 'https://api.github.com/users/esauerbo1/followers',
            following_url:
              'https://api.github.com/users/esauerbo1/following{/other_user}',
            gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/esauerbo1/subscriptions',
            organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
            repos_url: 'https://api.github.com/users/esauerbo1/repos',
            events_url:
              'https://api.github.com/users/esauerbo1/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/esauerbo1/received_events',
            type: 'User',
            site_admin: false,
          },
        },
        organization: {
          login: 'discord-bot-org',
          id: 109253565,
          node_id: 'O_kgDOBoMTvQ',
          url: 'https://api.github.com/orgs/discord-bot-org',
          repos_url: 'https://api.github.com/orgs/discord-bot-org/repos',
          events_url: 'https://api.github.com/orgs/discord-bot-org/events',
          hooks_url: 'https://api.github.com/orgs/discord-bot-org/hooks',
          issues_url: 'https://api.github.com/orgs/discord-bot-org/issues',
          members_url:
            'https://api.github.com/orgs/discord-bot-org/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/discord-bot-org/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/109253565?v=4',
          description: null,
        },
        sender: {
          login: 'esauerbo1',
          id: 107655607,
          node_id: 'U_kgDOBmqxtw',
          avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/esauerbo1',
          html_url: 'https://github.com/esauerbo1',
          followers_url: 'https://api.github.com/users/esauerbo1/followers',
          following_url:
            'https://api.github.com/users/esauerbo1/following{/other_user}',
          gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/esauerbo1/subscriptions',
          organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
          repos_url: 'https://api.github.com/users/esauerbo1/repos',
          events_url: 'https://api.github.com/users/esauerbo1/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/esauerbo1/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }
    const addedPayload1 = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=455b15690ee84763d7ad833c2ff0aee7fcf25304650185e179903a6e01231256',
        'content-type': 'application/json',
      },
      body: {
        action: 'member_added',
        membership: {
          url: 'https://api.github.com/orgs/discord-bot-org/memberships/esauerbo1',
          state: 'active',
          role: 'admin',
          organization_url: 'https://api.github.com/orgs/discord-bot-org',
          user: {
            login: 'esauerbo1',
            id: 107655607,
            node_id: 'U_kgDOBmqxtw',
            avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/esauerbo1',
            html_url: 'https://github.com/esauerbo1',
            followers_url: 'https://api.github.com/users/esauerbo1/followers',
            following_url:
              'https://api.github.com/users/esauerbo1/following{/other_user}',
            gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/esauerbo1/subscriptions',
            organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
            repos_url: 'https://api.github.com/users/esauerbo1/repos',
            events_url:
              'https://api.github.com/users/esauerbo1/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/esauerbo1/received_events',
            type: 'User',
            site_admin: false,
          },
        },
        organization: {
          login: 'discord-bot-org',
          id: 109253565,
          node_id: 'O_kgDOBoMTvQ',
          url: 'https://api.github.com/orgs/discord-bot-org',
          repos_url: 'https://api.github.com/orgs/discord-bot-org/repos',
          events_url: 'https://api.github.com/orgs/discord-bot-org/events',
          hooks_url: 'https://api.github.com/orgs/discord-bot-org/hooks',
          issues_url: 'https://api.github.com/orgs/discord-bot-org/issues',
          members_url:
            'https://api.github.com/orgs/discord-bot-org/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/discord-bot-org/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/109253565?v=4',
          description: null,
        },
        sender: {
          login: 'josefaidt',
          id: 5033303,
          node_id: 'MDQ6VXNlcjUwMzMzMDM=',
          avatar_url: 'https://avatars.githubusercontent.com/u/5033303?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/josefaidt',
          html_url: 'https://github.com/josefaidt',
          followers_url: 'https://api.github.com/users/josefaidt/followers',
          following_url:
            'https://api.github.com/users/josefaidt/following{/other_user}',
          gists_url: 'https://api.github.com/users/josefaidt/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/josefaidt/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/josefaidt/subscriptions',
          organizations_url: 'https://api.github.com/users/josefaidt/orgs',
          repos_url: 'https://api.github.com/users/josefaidt/repos',
          events_url: 'https://api.github.com/users/josefaidt/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/josefaidt/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }
    const removedPayload2 = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=2f7b3f2420ab1a19183ae87b5486e3c0f0adc68d3c75f6a2be45c80cdfbd6502',
        'content-type': 'application/json',
      },
      body: {
        action: 'member_removed',
        membership: {
          url: 'https://api.github.com/orgs/discord-bot-org/memberships/josefaidt',
          state: 'inactive',
          role: 'unaffiliated',
          organization_url: 'https://api.github.com/orgs/discord-bot-org',
          user: {
            login: 'josefaidt',
            id: 5033303,
            node_id: 'MDQ6VXNlcjUwMzMzMDM=',
            avatar_url: 'https://avatars.githubusercontent.com/u/5033303?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/josefaidt',
            html_url: 'https://github.com/josefaidt',
            followers_url: 'https://api.github.com/users/josefaidt/followers',
            following_url:
              'https://api.github.com/users/josefaidt/following{/other_user}',
            gists_url: 'https://api.github.com/users/josefaidt/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/josefaidt/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/josefaidt/subscriptions',
            organizations_url: 'https://api.github.com/users/josefaidt/orgs',
            repos_url: 'https://api.github.com/users/josefaidt/repos',
            events_url:
              'https://api.github.com/users/josefaidt/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/josefaidt/received_events',
            type: 'User',
            site_admin: false,
          },
        },
        organization: {
          login: 'discord-bot-org',
          id: 109253565,
          node_id: 'O_kgDOBoMTvQ',
          url: 'https://api.github.com/orgs/discord-bot-org',
          repos_url: 'https://api.github.com/orgs/discord-bot-org/repos',
          events_url: 'https://api.github.com/orgs/discord-bot-org/events',
          hooks_url: 'https://api.github.com/orgs/discord-bot-org/hooks',
          issues_url: 'https://api.github.com/orgs/discord-bot-org/issues',
          members_url:
            'https://api.github.com/orgs/discord-bot-org/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/discord-bot-org/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/109253565?v=4',
          description: null,
        },
        sender: {
          login: 'esauerbo1',
          id: 107655607,
          node_id: 'U_kgDOBmqxtw',
          avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/esauerbo1',
          html_url: 'https://github.com/esauerbo1',
          followers_url: 'https://api.github.com/users/esauerbo1/followers',
          following_url:
            'https://api.github.com/users/esauerbo1/following{/other_user}',
          gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/esauerbo1/subscriptions',
          organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
          repos_url: 'https://api.github.com/users/esauerbo1/repos',
          events_url: 'https://api.github.com/users/esauerbo1/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/esauerbo1/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }
    const addedPayload2 = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=6ef3394bbe1b63c1b47643079c05f4fbbf685335818edbe9fcc7a310aabe7a47',
        'content-type': 'application/json',
      },
      body: {
        action: 'member_added',
        membership: {
          url: 'https://api.github.com/orgs/discord-bot-org/memberships/josefaidt',
          state: 'active',
          role: 'admin',
          organization_url: 'https://api.github.com/orgs/discord-bot-org',
          user: {
            login: 'josefaidt',
            id: 5033303,
            node_id: 'MDQ6VXNlcjUwMzMzMDM=',
            avatar_url: 'https://avatars.githubusercontent.com/u/5033303?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/josefaidt',
            html_url: 'https://github.com/josefaidt',
            followers_url: 'https://api.github.com/users/josefaidt/followers',
            following_url:
              'https://api.github.com/users/josefaidt/following{/other_user}',
            gists_url: 'https://api.github.com/users/josefaidt/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/josefaidt/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/josefaidt/subscriptions',
            organizations_url: 'https://api.github.com/users/josefaidt/orgs',
            repos_url: 'https://api.github.com/users/josefaidt/repos',
            events_url:
              'https://api.github.com/users/josefaidt/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/josefaidt/received_events',
            type: 'User',
            site_admin: false,
          },
        },
        organization: {
          login: 'discord-bot-org',
          id: 109253565,
          node_id: 'O_kgDOBoMTvQ',
          url: 'https://api.github.com/orgs/discord-bot-org',
          repos_url: 'https://api.github.com/orgs/discord-bot-org/repos',
          events_url: 'https://api.github.com/orgs/discord-bot-org/events',
          hooks_url: 'https://api.github.com/orgs/discord-bot-org/hooks',
          issues_url: 'https://api.github.com/orgs/discord-bot-org/issues',
          members_url:
            'https://api.github.com/orgs/discord-bot-org/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/discord-bot-org/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/109253565?v=4',
          description: null,
        },
        sender: {
          login: 'esauerbo1',
          id: 107655607,
          node_id: 'U_kgDOBmqxtw',
          avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/esauerbo1',
          html_url: 'https://github.com/esauerbo1',
          followers_url: 'https://api.github.com/users/esauerbo1/followers',
          following_url:
            'https://api.github.com/users/esauerbo1/following{/other_user}',
          gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/esauerbo1/subscriptions',
          organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
          repos_url: 'https://api.github.com/users/esauerbo1/repos',
          events_url: 'https://api.github.com/users/esauerbo1/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/esauerbo1/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }
    const removedPayloadUserDNE = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=1258fa36640638e4f6a9805b3a94e21c697b249425415e98aa0eef5336b7b759',
        'content-type': 'application/json',
      },
      body: {
        action: 'member_removed',
        membership: {
          url: 'https://api.github.com/orgs/discord-bot-org/memberships/esauerbo',
          state: 'inactive',
          role: 'unaffiliated',
          organization_url: 'https://api.github.com/orgs/discord-bot-org',
          user: {
            login: 'esauerbo',
            id: 70536670,
            node_id: 'MDQ6VXNlcjcwNTM2Njcw',
            avatar_url: 'https://avatars.githubusercontent.com/u/70536670?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/esauerbo',
            html_url: 'https://github.com/esauerbo',
            followers_url: 'https://api.github.com/users/esauerbo/followers',
            following_url:
              'https://api.github.com/users/esauerbo/following{/other_user}',
            gists_url: 'https://api.github.com/users/esauerbo/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/esauerbo/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/esauerbo/subscriptions',
            organizations_url: 'https://api.github.com/users/esauerbo/orgs',
            repos_url: 'https://api.github.com/users/esauerbo/repos',
            events_url:
              'https://api.github.com/users/esauerbo/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/esauerbo/received_events',
            type: 'User',
            site_admin: false,
          },
        },
        organization: {
          login: 'discord-bot-org',
          id: 109253565,
          node_id: 'O_kgDOBoMTvQ',
          url: 'https://api.github.com/orgs/discord-bot-org',
          repos_url: 'https://api.github.com/orgs/discord-bot-org/repos',
          events_url: 'https://api.github.com/orgs/discord-bot-org/events',
          hooks_url: 'https://api.github.com/orgs/discord-bot-org/hooks',
          issues_url: 'https://api.github.com/orgs/discord-bot-org/issues',
          members_url:
            'https://api.github.com/orgs/discord-bot-org/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/discord-bot-org/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/109253565?v=4',
          description: null,
        },
        sender: {
          login: 'esauerbo1',
          id: 107655607,
          node_id: 'U_kgDOBmqxtw',
          avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/esauerbo1',
          html_url: 'https://github.com/esauerbo1',
          followers_url: 'https://api.github.com/users/esauerbo1/followers',
          following_url:
            'https://api.github.com/users/esauerbo1/following{/other_user}',
          gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/esauerbo1/subscriptions',
          organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
          repos_url: 'https://api.github.com/users/esauerbo1/repos',
          events_url: 'https://api.github.com/users/esauerbo1/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/esauerbo1/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }
    const addedPayloadUserDNE = {
      headers: {
        'X-Hub-Signature-256':
          'sha256=68a14e23fae69a948265e6a6d21e6661243eac094d5e731d147423c93a37836a',
        'content-type': 'application/json',
      },
      body: {
        action: 'member_added',
        membership: {
          url: 'https://api.github.com/orgs/discord-bot-org/memberships/esauerbo',
          state: 'active',
          role: 'member',
          organization_url: 'https://api.github.com/orgs/discord-bot-org',
          user: {
            login: 'esauerbo',
            id: 70536670,
            node_id: 'MDQ6VXNlcjcwNTM2Njcw',
            avatar_url: 'https://avatars.githubusercontent.com/u/70536670?v=4',
            gravatar_id: '',
            url: 'https://api.github.com/users/esauerbo',
            html_url: 'https://github.com/esauerbo',
            followers_url: 'https://api.github.com/users/esauerbo/followers',
            following_url:
              'https://api.github.com/users/esauerbo/following{/other_user}',
            gists_url: 'https://api.github.com/users/esauerbo/gists{/gist_id}',
            starred_url:
              'https://api.github.com/users/esauerbo/starred{/owner}{/repo}',
            subscriptions_url:
              'https://api.github.com/users/esauerbo/subscriptions',
            organizations_url: 'https://api.github.com/users/esauerbo/orgs',
            repos_url: 'https://api.github.com/users/esauerbo/repos',
            events_url:
              'https://api.github.com/users/esauerbo/events{/privacy}',
            received_events_url:
              'https://api.github.com/users/esauerbo/received_events',
            type: 'User',
            site_admin: false,
          },
        },
        organization: {
          login: 'discord-bot-org',
          id: 109253565,
          node_id: 'O_kgDOBoMTvQ',
          url: 'https://api.github.com/orgs/discord-bot-org',
          repos_url: 'https://api.github.com/orgs/discord-bot-org/repos',
          events_url: 'https://api.github.com/orgs/discord-bot-org/events',
          hooks_url: 'https://api.github.com/orgs/discord-bot-org/hooks',
          issues_url: 'https://api.github.com/orgs/discord-bot-org/issues',
          members_url:
            'https://api.github.com/orgs/discord-bot-org/members{/member}',
          public_members_url:
            'https://api.github.com/orgs/discord-bot-org/public_members{/member}',
          avatar_url: 'https://avatars.githubusercontent.com/u/109253565?v=4',
          description: null,
        },
        sender: {
          login: 'esauerbo1',
          id: 107655607,
          node_id: 'U_kgDOBmqxtw',
          avatar_url: 'https://avatars.githubusercontent.com/u/107655607?v=4',
          gravatar_id: '',
          url: 'https://api.github.com/users/esauerbo1',
          html_url: 'https://github.com/esauerbo1',
          followers_url: 'https://api.github.com/users/esauerbo1/followers',
          following_url:
            'https://api.github.com/users/esauerbo1/following{/other_user}',
          gists_url: 'https://api.github.com/users/esauerbo1/gists{/gist_id}',
          starred_url:
            'https://api.github.com/users/esauerbo1/starred{/owner}{/repo}',
          subscriptions_url:
            'https://api.github.com/users/esauerbo1/subscriptions',
          organizations_url: 'https://api.github.com/users/esauerbo1/orgs',
          repos_url: 'https://api.github.com/users/esauerbo1/repos',
          events_url: 'https://api.github.com/users/esauerbo1/events{/privacy}',
          received_events_url:
            'https://api.github.com/users/esauerbo1/received_events',
          type: 'User',
          site_admin: false,
        },
      },
    }

    it('should return 403 without auth header', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-release')
        .send({})
      expect(response.status).toBe(403)
    })
    it('should return 200', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(addedPayload1.body)
        .set(addedPayload1.headers)
      expect(response.status).toBe(200)
    })
    it('should return 200', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(addedPayload2.body)
        .set(addedPayload2.headers)
      expect(response.status).toBe(200)
    })
    it('should return 200', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(removedPayload2.body)
        .set(removedPayload2.headers)
      expect(response.status).toBe(200)
    })
    it('should return 200', async () => {
      const response = await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(removedPayload1.body)
        .set(removedPayload1.headers)
      expect(response.status).toBe(200)
    })

    it('should return 403', async () => {
      const response = await await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(removedPayloadUserDNE.body)
        .set(removedPayloadUserDNE.headers)
      expect(response.status).toBe(403)
    })


    it('should return 403', async () => {
      const response = await await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(addedPayloadUserDNE.body)
        .set(addedPayloadUserDNE.headers)
      expect(response.status).toBe(403)
    })

    it('should return 400', async () => {
      const staffRoleId = process.env.DISCORD_STAFF_ROLE_ID
      process.env.DISCORD_STAFF_ROLE_ID = 'badid'
      const response = await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(addedPayload2.body)
        .set(addedPayload2.headers)
      expect(response.status).toBe(400)
      process.env.DISCORD_STAFF_ROLE_ID = staffRoleId
    })

    it('should return 400', async () => {
      const guildId = process.env.DISCORD_GUILD_ID
      process.env.DISCORD_GUILD_ID = 'badid'
      const response = await request(app)
        .post('/api/webhooks/github-org-membership')
        .send(addedPayload2.body)
        .set(addedPayload2.headers)
      expect(response.status).toBe(400)
      process.env.DISCORD_GUILD_ID = guildId
    })
  })
})
