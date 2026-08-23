const cache = new Map()
const CACHE_MS = 5 * 60 * 1000
const AI_TERMS = /\b(ai|artificial intelligence|llm|model|agent|machine learning|openai|anthropic|gemini|copilot)\b/i

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers: { 'user-agent': 'Tabloid-Brain/1.0', accept: 'application/json', ...headers }, signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`)
  return response.json()
}

const hackerNews = async () => {
  const [storyIds, jobIds] = await Promise.all([
    fetchJson('https://hacker-news.firebaseio.com/v0/beststories.json'),
    fetchJson('https://hacker-news.firebaseio.com/v0/jobstories.json')
  ])
  const [stories, jobs] = await Promise.all([
    Promise.all(storyIds.slice(0, 28).map((id) => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))),
    Promise.all(jobIds.slice(0, 10).map((id) => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)))
  ])
  const normalize = (item, category) => ({
    id: `hn-${item.id}`, title: item.title, url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    discussionUrl: `https://news.ycombinator.com/item?id=${item.id}`, source: 'Hacker News', category,
    publishedAt: new Date(item.time * 1000).toISOString(), score: item.score || 0,
    summary: category === 'jobs' ? 'A current technology role from the Hacker News jobs feed.' : `${item.score || 0} points · ${item.descendants || 0} comments`
  })
  return [...stories.filter(Boolean).map((item) => normalize(item, AI_TERMS.test(item.title) ? 'ai' : 'tech')), ...jobs.filter(Boolean).map((item) => normalize(item, 'jobs'))]
}

const github = async () => {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const payload = await fetchJson(`https://api.github.com/search/repositories?q=created:%3E${since}&sort=stars&order=desc&per_page=12`, { 'x-github-api-version': '2022-11-28' })
  return payload.items.map((repo) => ({
    id: `github-${repo.id}`, title: repo.full_name, url: repo.html_url, source: 'GitHub', category: 'github',
    publishedAt: repo.created_at, score: repo.stargazers_count,
    summary: repo.description || `${repo.language || 'Open-source'} project gaining developer attention.`,
    meta: `${repo.stargazers_count.toLocaleString()} stars · ${repo.language || 'Multi-language'}`
  }))
}

export async function getLiveFeed(channel = 'all') {
  const cacheKey = channel.toLowerCase()
  const saved = cache.get(cacheKey)
  if (saved && Date.now() - saved.cachedAt < CACHE_MS) return saved.value
  const results = await Promise.allSettled([hackerNews(), github()])
  const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
  if (!items.length) throw new Error('Every live feed provider is currently unavailable.')
  const filtered = cacheKey === 'all' ? items : items.filter((item) => item.category === cacheKey)
  const value = { channel: cacheKey, generatedAt: new Date().toISOString(), staleAfter: new Date(Date.now() + CACHE_MS).toISOString(), sources: results.map((result, index) => ({ name: index === 0 ? 'Hacker News' : 'GitHub', status: result.status === 'fulfilled' ? 'healthy' : 'degraded' })), items: filtered.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 24) }
  cache.set(cacheKey, { cachedAt: Date.now(), value })
  return value
}
