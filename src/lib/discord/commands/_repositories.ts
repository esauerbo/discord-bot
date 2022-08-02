import {  getReposWithDiscussions } from '../../github/queries'

async function fetchRepositories() {
    const repos = await getReposWithDiscussions()
    if (repos?.length) return repos?.reduce((obj, repo) => ({ ...obj, [repo.node.name]: repo.node}), {})   
    return false 
  }
  
  export const repositories = new Map<string, string>(
    Object.entries(await fetchRepositories())
  )