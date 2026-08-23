const BRAIN_API = 'https://tabloid-brain-api.tail70b7f1.ts.net'
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
const relativeTime = (value) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}
const channelForPage = { news: 'ai', city: 'github', politics: 'jobs' }

export async function initializeLiveFeed(pageKey) {
  const channel = channelForPage[pageKey] || 'all'
  try {
    const response = await fetch(`${BRAIN_API}/api/v1/feed?channel=${channel}`, { cache: 'no-store' })
    const feed = await response.json()
    if (!response.ok || !feed.items?.length) throw new Error(feed.error || 'No current stories are available.')
    const [lead, ...rest] = feed.items
    const breaking = document.querySelector('#live-breaking')
    if (breaking) breaking.innerHTML = `<a href="${escapeHtml(lead.url)}" target="_blank" rel="noreferrer" class="hover:text-red-700">${escapeHtml(lead.title)}</a>`
    const front = document.querySelector('#live-front-stories')
    if (front) front.innerHTML = feed.items.slice(0, 6).map((item, index) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" class="group grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-center"><span class="font-display text-3xl font-black text-stone-400">${String(index + 1).padStart(2, '0')}</span><span><span class="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600">${escapeHtml(item.source)} · ${escapeHtml(item.category)}</span><span class="font-display text-2xl font-black leading-tight tracking-[-0.03em] transition group-hover:text-red-600 sm:text-3xl">${escapeHtml(item.title)}</span></span><span class="hidden text-sm font-bold text-stone-500 sm:block">${relativeTime(item.publishedAt)}</span></a>`).join('')
    const features = document.querySelector('#live-features')
    if (features) features.innerHTML = rest.slice(0, 6).map((item, index) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" class="group rounded-[1.5rem] border border-stone-200 bg-[#f3f1e8] p-6 ${index < 2 ? 'lg:col-span-2' : ''}"><div class="flex items-center justify-between gap-4"><p class="text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600">${escapeHtml(item.source)}</p><span class="text-xs font-bold text-stone-400">${relativeTime(item.publishedAt)}</span></div><h3 class="mt-4 font-display text-3xl font-black leading-[.98] tracking-[-.04em] transition group-hover:text-red-600">${escapeHtml(item.title)}</h3><p class="mt-4 line-clamp-3 text-sm leading-6 text-stone-600">${escapeHtml(item.summary)}</p><span class="mt-6 block text-xs font-black uppercase tracking-[.14em] text-red-700">Open original source ↗</span></a>`).join('')
    const liveTitle = document.querySelector('[data-live-title]')
    if (liveTitle) {
      liveTitle.textContent = lead.title
      document.querySelector('[data-live-deck]').textContent = lead.summary
      document.querySelector('[data-live-byline]').textContent = `${lead.source} · ${relativeTime(lead.publishedAt)} · Live feed`
      const source = document.querySelector('[data-live-source]')
      source.href = lead.url; source.hidden = false
      document.querySelector('[data-live-updates]').innerHTML = rest.slice(0, 4).map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" class="block border-t border-stone-200 py-4 first:border-0 first:pt-0"><p class="text-[.68rem] font-black uppercase tracking-[.18em] text-red-600">${escapeHtml(item.source)} · ${relativeTime(item.publishedAt)}</p><p class="mt-2 text-sm font-bold leading-6 text-stone-800">${escapeHtml(item.title)}</p></a>`).join('')
    }
    document.querySelectorAll('[data-feed-status]').forEach((element) => { element.textContent = `Live · refreshed ${new Date(feed.generatedAt).toLocaleTimeString()} · ${feed.sources.map((source) => `${source.name} ${source.status}`).join(' · ')}` })
  } catch (error) {
    document.querySelectorAll('[data-feed-status]').forEach((element) => { element.textContent = `Live feed temporarily unavailable · showing the last editorial fallback · ${error.message}` })
  }
}
