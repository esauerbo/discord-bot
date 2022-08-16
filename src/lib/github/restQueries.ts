import { createAppAuth } from '@octokit/auth-app'
import { Octokit } from '@octokit/rest'

/**
 * returns true if the user is a member of that org
 * false otherwise or if error
 * (uses access token to determine current user)
 */
export async function isOrgMember(accessToken: string, ghUserId: string) {
  const octokit = new Octokit({
    auth: `token ${accessToken}`,
  })
  try {
    const { data } = await octokit.request('GET /orgs/{org}/members', {
      org: process.env.GITHUB_ORG_LOGIN,
    })
    const isOrgMember = data.some(
      (contributor) => contributor.id === Number(ghUserId)
    )
    //if (isOrgMember) return true
    return isOrgMember
  } catch (err) {
    console.error(
      `Failed to find org member in ${process.env.GITHUB_ORG_LOGIN}: ${err.response.data.message}`
    )
  }
  return false
}

/**
 * returns a list of the given organization's repositories,
 * false if error
 *  also this will only work if repos are public
 */
export async function fetchOrgRepos(accessToken: string) {
  const octokit = new Octokit({
    auth: `token ${accessToken}`,
  })
  try {
    const { data } = await octokit.request('GET /orgs/{org}/repos', {
      org: process.env.GITHUB_ORG_LOGIN,
    })
    return data
  } catch (err) {
    console.error(
      `Failed to fetch repos for ${process.env.GITHUB_ORG_LOGIN}: ${err.response.data.message}`
    )
    return false
  }
}

/**
 *  for each repository belonging to the org, retrieves a list of
 * contributors. returns true if the user with a given id is
 * a contributor in at least one repository,
 * false otherwise or if error
 */
export async function isContributor(
  accessToken: string,
  repos: [],
  userId: string
) {
  const octokit = new Octokit({
    auth: `token ${accessToken}`,
  })

  for (let i = 0; i < repos.length; i++) {
    const amplifyRepo = repos[i]?.name

    try {
      const { data } = await octokit.request(
        'GET /repos/{owner}/{repo}/contributors',
        {
          owner: process.env.GITHUB_ORG_LOGIN,
          repo: amplifyRepo,
        }
      )

      const isContributor = data.some(
        (contributor) => contributor.id === Number(userId)
      )
      if (isContributor) return true
    } catch (err) {
      console.error(
        `Error searching for user in repository ${amplifyRepo}: ${err.response.data.message}`
      )
    }
  }
  return false
}

export async function getGHUsername(userId: string) {
  const token = await authenticate()
  const octokit = new Octokit({
    auth: `token ${token}`,
  })
  try {
    const { data } = await octokit.request('GET /orgs/{org}/members', {
      org: process.env.GITHUB_ORG_LOGIN,
    })
    const user = data[data.findIndex(user => user.id === Number(userId))]
    if(user?.login) return ` ${user.login}`
  } catch (error) {
    console.error(`Error getting github username ${userId}: ${error.message}`)
  }
  return ""
}

async function authenticate() {
  const { privateKey } = JSON.parse(process.env.GITHUB_PRIVATE_KEY)
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID,
    privateKey: privateKey,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  })
  try {
    const { token } = await auth({
      type: 'installation',
      installationId: process.env.GITHUB_INSTALLATION_ID,
    })
    return token
  } catch (err) {
    console.error(`Error fetching installation token: ${err}`)
  }
  return null
}
