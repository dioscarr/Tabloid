const LIVE_NEWS_ENDPOINT = 'https://hn.algolia.com/api/v1/search_by_date'
export const LIVE_NEWS_REFRESH_MS = 8 * 60 * 1000

export const LIVE_NEWS_TOPICS = {
  index: ['artificial intelligence', 'AI engineering', 'machine learning'],
  news: ['AI release', 'AI engineering', 'artificial intelligence'],
  city: ['open source AI', 'AI GitHub', 'machine learning open source'],
  politics: ['AI infrastructure', 'software architecture AI', 'distributed systems AI'],
  culture: ['LLM evaluation', 'AI agents', 'prompt engineering'],
  business: ['AI developer tools', 'coding agents', 'developer tools AI'],
  sports: ['open source AI project', 'indie hacker AI', 'local AI project'],
}

export const formatRelativeTime = (isoDate) => {
  if (!isoDate) return 'just now'
  const delta = Date.now() - new Date(isoDate).getTime()
  if (Number.isNaN(delta)) return 'just now'
  const minutes = Math.round(delta / 60000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}

const sourceMeta = (url) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    if (hostname.includes('news.ycombinator.com')) return { label: 'Hacker News', badge: 'HN', tone: 'bg-orange-100 text-orange-800 border-orange-200' }
    if (hostname.includes('github.com')) return { label: 'GitHub', badge: 'GH', tone: 'bg-slate-200 text-slate-800 border-slate-300' }
    if (hostname.includes('arxiv.org')) return { label: 'arXiv', badge: 'AX', tone: 'bg-sky-100 text-sky-800 border-sky-200' }
    if (hostname.includes('openai.com')) return { label: 'OpenAI', badge: 'OA', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    if (hostname.includes('anthropic.com')) return { label: 'Anthropic', badge: 'AN', tone: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
    return { label: hostname, badge: 'WEB', tone: 'bg-blue-100 text-blue-800 border-blue-200' }
  } catch {
    return { label: 'Web', badge: 'WEB', tone: 'bg-blue-100 text-blue-800 border-blue-200' }
  }
}

const normalizeStory = (item) => {
  const source = sourceMeta(item.url)
  return {
    title: item.title,
    summary: `From ${source.label}: ${item.title}`,
    source: item.author ? `${source.label} · @${item.author}` : source.label,
    sourceBadge: source.badge,
    sourceTone: source.tone,
    timeLabel: formatRelativeTime(item.created_at),
    category: 'AI update',
    url: item.url,
  }
}

const fetchTopic = async (topic) => {
  const cutoff = Math.floor(Date.now() / 1000) - (48 * 60 * 60)
  const endpoint = `${LIVE_NEWS_ENDPOINT}?query=${encodeURIComponent(topic)}&tags=story&numericFilters=created_at_i>${cutoff}&hitsPerPage=8`
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`Live news API returned ${response.status}`)
  const data = await response.json()
  return Array.isArray(data?.hits) ? data.hits.filter((item) => item?.title && item?.url) : []
}

export const fetchLiveNews = async (topics = LIVE_NEWS_TOPICS.index) => {
  const results = await Promise.allSettled(topics.map(fetchTopic))
  const stories = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)
  if (!stories.length) throw new Error('No live AI news sources are available')
  return stories
    .flat()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter((item, index, all) => all.findIndex((candidate) => candidate.objectID === item.objectID || candidate.url === item.url) === index)
    .slice(0, 12)
    .map(normalizeStory)
}
