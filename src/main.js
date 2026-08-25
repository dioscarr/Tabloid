import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'
import { fetchLiveNews, formatRelativeTime, LIVE_NEWS_REFRESH_MS, LIVE_NEWS_TOPICS } from './live-news.js'

const YOUTUBE_REFRESH_MS = 10 * 60 * 1000
const GITHUB_REFRESH_MS = 10 * 60 * 1000
const RSS2JSON_ENDPOINT = 'https://api.rss2json.com/v1/api.json?rss_url='
const GITHUB_PROJECTS_ENDPOINT = 'https://api.github.com/search/repositories?q=topic:artificial-intelligence+archived:false&sort=updated&order=desc&per_page=6'
const BRAIN_API = 'https://tabloid-brain-api.tail70b7f1.ts.net'
const BOOKMARKS_STORAGE_KEY = 'ai-news:bookmarked-projects'
const VISITOR_STORAGE_KEY = 'ai-news:visitor-id'
const YOUTUBE_CHANNELS = [
  { id: 'UCXZCJLdBC09xxGZ6gcdrc6A', label: 'OpenAI', topics: ['AI Tech'] },
  { id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', label: 'Google for Developers', topics: ['Programming', 'Developer Tools'] },
  { id: 'UCbfYPyITQ-7l4upoX8nvctg', label: 'Two Minute Papers', topics: ['AI Research'] },
  { id: 'UCP7jMXSY2xbc3KCAE0MHQ-A', label: 'Google DeepMind', topics: ['AI Research', 'AI Tech'] },
]
const arrowIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>`
const appsIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-5" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="10" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>`

const navigation = [
  ['news', 'Briefing', 'news.html'],
  ['city', 'GitHub Radar', 'city.html'],
  ['politics', 'Architecture', 'politics.html'],
  ['culture', 'AI Engineering', 'culture.html'],
  ['business', 'Dev Tools', 'business.html'],
  ['sports', 'Showcase', 'sports.html'],
]

const frontStories = [
  ['city.html', 'GitHub Radar', 'Five repositories gaining contributors—not just stars—this week.', '4 min'],
  ['politics.html', 'Architecture', 'Why small teams are returning to boring infrastructure that scales.', '3 min'],
  ['sports.html', 'Showcase', 'An open-source local agent built by one developer solves a real daily problem.', '4 min'],
]

const initialLiveStories = [
  ['https://news.ycombinator.com/', 'Live', 'Loading live AI headlines...', 'now'],
  ['https://news.ycombinator.com/', 'Live', 'Curating top engineering and research coverage.', 'now'],
  ['https://news.ycombinator.com/', 'Live', 'If feeds are unavailable, editorial stories stay in place.', 'now'],
]

const fallbackVideos = [
  {
    title: 'GPT-5 Demo and Use Cases',
    url: 'https://www.youtube.com/watch?v=ceBruD6v5Bk',
    channel: 'OpenAI',
    publishedAt: new Date().toISOString(),
    thumbnail: 'https://i4.ytimg.com/vi/ceBruD6v5Bk/hqdefault.jpg',
  },
  {
    title: 'Live AI research and developer workflows',
    url: 'https://www.youtube.com/@GoogleDevelopers/videos',
    channel: 'Google for Developers',
    publishedAt: new Date().toISOString(),
    thumbnail: 'https://i4.ytimg.com/vi/ceBruD6v5Bk/hqdefault.jpg',
  },
]

const heroVisuals = [
  {
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=90',
    alt: 'Detailed technology circuit board',
    caption: 'Every project is linked to source code, maintainers, and real implementation details.',
    desk: 'Tech Engineering Desk',
  },
  {
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=90',
    alt: 'Satellite view of Earth at night with illuminated networks',
    caption: 'Live coverage tracks systems, tooling, and open-source momentum across the ecosystem.',
    desk: 'AI News Live Desk',
  },
  {
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1800&q=90',
    alt: 'Developers collaborating around laptops in a studio',
    caption: 'Signals are selected for practical engineering impact, not launch-day noise.',
    desk: 'Developer Briefing Desk',
  },
  {
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1800&q=90',
    alt: 'Laptop with code on screen in a modern workspace',
    caption: 'Each cycle highlights what changed and what is worth testing in your own stack.',
    desk: 'Systems Desk',
  },
]

const features = [
  ['sports.html', 'Project Showcase', 'How a solo developer designed a fast, local-first knowledge engine.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85', 'lg:col-span-2'],
  ['culture.html', 'AI Engineering', 'The practical evaluation stack behind dependable AI features.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=85', ''],
  ['business.html', 'Developer Tools', 'A focused toolkit for shipping faster without adding platform sprawl.', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85', ''],
]

const fallbackProjects = features.map(([href, category, title, image, size]) => ({ href, category, title, image, size, description: 'Editorial project pick from the AI News desk.' }))

const getStoredJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

const getBookmarks = () => new Set(getStoredJson(BOOKMARKS_STORAGE_KEY, []))

const getVisitorId = () => {
  let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY)
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    localStorage.setItem(VISITOR_STORAGE_KEY, visitorId)
  }
  return visitorId
}

const sendBrainSignal = (type, project) => {
  const payload = JSON.stringify({
    type,
    visitorId: getVisitorId(),
    appId: 'ai-news',
    project: { name: project.fullName || project.url, url: project.url, topics: project.topics || [] },
    occurredAt: new Date().toISOString(),
  })
  fetch(`${BRAIN_API}/api/v1/engagement/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}

const sectionPages = {
  news: {
    title: 'Developer Briefing',
    kicker: 'What changed in engineering',
    headline: 'The tools, releases, and engineering decisions worth understanding today.',
    deck: 'A concise technical briefing filters announcements and hype into architecture, implementation details, tradeoffs, and ideas you can use in your next build.',
    byline: 'Tech Engineering Desk · Updated 11:05 AM',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Release', 'A compact runtime cuts local development startup time significantly.'],
      ['Pattern', 'Typed boundaries are replacing fragile prompt-only agent workflows.'],
      ['Try it', 'Benchmark one new tool against a real repository before adopting it.'],
    ],
  },
  city: {
    title: 'GitHub Radar',
    kicker: 'Open source signal',
    headline: 'Developer tools are converging around local agents, structured context, and faster feedback.',
    deck: 'We filtered today’s repository activity for projects with real documentation, active maintainers, and a clear benefit to the way you build.',
    byline: 'Tech Open Source Desk · Updated 10:22 AM',
    image: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Trending', 'Local-first agent frameworks are attracting sustained contributor growth.'],
      ['Maintainers', 'The strongest projects pair frequent releases with clear migration notes.'],
      ['Your move', 'Star less. Trial one tool against a real task for thirty minutes.'],
    ],
  },
  politics: {
    title: 'Architecture',
    kicker: 'Systems that hold up',
    headline: 'Small teams are choosing simpler infrastructure—and shipping more reliably.',
    deck: 'The strongest engineering decisions balance operational cost, failure modes, observability, team experience, and the option to change direction later.',
    byline: 'Tech Architecture Desk · Updated 9:48 AM',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Design', 'Clear service boundaries matter more than the number of services.'],
      ['Operations', 'Observability and recovery paths belong in the initial design.'],
      ['Your move', 'Write the failure modes before selecting another dependency.'],
    ],
  },
  culture: {
    title: 'AI Engineering',
    kicker: 'Beyond the demo',
    headline: 'Evaluation, context design, and observability are becoming the real AI stack.',
    deck: 'Production AI work is moving beyond prompt experimentation toward repeatable tests, source-aware context, cost controls, security, and visible failure handling.',
    byline: 'Tech AI Engineering Desk · Updated 8:57 AM',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Evaluate', 'Test representative tasks and failure cases, not a polished example.'],
      ['Observe', 'Record latency, cost, retrieval quality, and user corrections.'],
      ['Your move', 'Create a small regression set before changing models or prompts.'],
    ],
  },
  business: {
    title: 'Developer Tools',
    kicker: 'Sharper workflows',
    headline: 'The best new tools remove feedback delay without hiding how your system works.',
    deck: 'We examine editors, runtimes, debuggers, databases, deployment tools, and automation through practical workflows instead of launch-day claims.',
    byline: 'Tech Tools Desk · Updated 10:41 AM',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Workflow', 'Shorter feedback loops beat elaborate code-generation demos.'],
      ['Adoption', 'Prefer tools with clear export paths and active maintainers.'],
      ['Your move', 'Replace one recurring manual check with a visible automation.'],
    ],
  },
  sports: {
    title: 'Project Showcase',
    kicker: 'Built by developers',
    headline: 'See how other engineers turn small ideas into useful, maintainable projects.',
    deck: 'Project showcases focus on the problem, architecture, difficult tradeoffs, source code, lessons learned, and the people who did the work.',
    byline: 'Tech Community Desk · Updated 11:16 AM',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Problem', 'The maintainer began with a repetitive workflow worth eliminating.'],
      ['Build', 'A small local-first architecture kept hosting and privacy simple.'],
      ['Learn', 'The project’s clearest lesson is documented alongside the source.'],
    ],
  },
}

const fileName = window.location.pathname.split('/').pop() || 'index.html'
const pageKey = fileName.replace('.html', '')
const liveTopics = LIVE_NEWS_TOPICS[pageKey] || LIVE_NEWS_TOPICS.index
const isLivePage = pageKey !== 'subscribe'

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const navMarkup = (active) => navigation.map(([key, label, href]) => `<a href="${href}" class="text-sm font-semibold transition hover:text-emerald-200 ${key === active ? 'text-emerald-300' : 'text-emerald-50/80'}">${label}</a>`).join('')

const mobileNavMarkup = () => navigation.map(([, label, href]) => `<a href="${href}" class="rounded-xl px-4 py-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-800">${label}</a>`).join('')

const header = (active) => `
  <header class="sticky top-0 z-50 border-b border-emerald-800 bg-emerald-950/95 text-white shadow-lg shadow-emerald-950/10 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <a href="index.html" class="font-display text-xl font-black tracking-tight sm:text-2xl" aria-label="AI News home">AI News<span class="text-emerald-300">.</span></a>
      <nav class="hidden items-center gap-7 md:flex" aria-label="Main navigation">${navMarkup(active)}</nav>
      <div class="flex items-center gap-2">
        <div class="relative">
          <button id="apps-button" class="inline-grid size-10 place-items-center rounded-full text-emerald-50 transition hover:bg-emerald-800" type="button" aria-label="Open app switcher" aria-expanded="false" aria-controls="apps-menu">${appsIcon}</button>
          <div id="apps-menu" class="absolute right-0 top-12 hidden w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-emerald-800 bg-emerald-950 text-white shadow-2xl shadow-black/30">
            <div class="border-b border-emerald-800 px-5 py-4"><p class="text-[0.65rem] font-black uppercase tracking-[0.18em] text-emerald-300">Tabloid apps</p><p class="mt-1 text-sm text-emerald-100/70">Switch between live editions</p></div>
            <div id="apps-list" class="max-h-80 overflow-y-auto p-2" role="menu"><p class="px-3 py-4 text-sm text-emerald-100/60">Loading live branches…</p></div>
            <a href="https://github.com/dioscarr/Tabloid/branches" class="flex items-center justify-between border-t border-emerald-800 px-5 py-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-900 hover:text-white">View repository branches ${arrowIcon}</a>
          </div>
        </div>
        <a href="subscribe.html" class="hidden rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-white sm:inline-flex">My Stack</a>
        <button id="menu-button" class="inline-grid size-10 place-items-center rounded-full text-emerald-50 transition hover:bg-emerald-800 md:hidden" type="button" aria-label="Open navigation" aria-expanded="false"><svg aria-hidden="true" viewBox="0 0 24 24" class="size-5" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
      </div>
    </div>
    <nav id="mobile-nav" class="hidden border-t border-emerald-800 px-5 py-4 md:hidden" aria-label="Mobile navigation"><div class="mx-auto grid max-w-7xl grid-cols-2 gap-2">${mobileNavMarkup()}</div></nav>
  </header>
`

const footer = `
  <footer class="border-t border-stone-200 bg-white">
    <div class="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="font-display text-2xl font-black">AI News<span class="text-red-600">.</span></p>
        <p class="mt-1 text-sm text-stone-500">Know what changed. Understand how it works. Build what matters.</p>
      </div>
      <form class="flex w-full max-w-md gap-2" aria-label="Newsletter subscription">
        <label class="sr-only" for="email">Email address</label>
        <input id="email" type="email" placeholder="you@example.com" class="min-w-0 flex-1 rounded-full border border-stone-300 bg-stone-50 px-5 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100" />
        <button type="submit" class="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">Join the briefing</button>
      </form>
    </div>
  </footer>
`

const homePage = `
  <main class="bg-[#f3f1e8]">
    <section class="overflow-hidden bg-stone-950 text-white">
      <div class="mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-8 sm:pb-14">
        <div class="flex items-center justify-between border-y border-stone-700 py-3 text-[0.65rem] font-black uppercase tracking-[0.22em] text-stone-300"><span id="edition-label">Daily Edition</span><span id="edition-date">Loading date</span></div>
        <div class="border-b border-stone-700 py-5 sm:py-7">
          <p class="text-center text-[clamp(4.3rem,18vw,13rem)] font-black leading-[0.72] tracking-[-0.085em] text-red-500">AI NEWS</p>
        </div>
        <div class="grid gap-8 pt-8 lg:grid-cols-[1.05fr_1.45fr] lg:items-stretch">
          <article class="flex flex-col justify-between">
            <div>
              <p class="inline-flex rounded-full bg-red-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white">Engineering intelligence</p>
              <h1 id="live-hero-title" class="mt-6 max-w-2xl font-display text-[clamp(3.2rem,7vw,6.6rem)] font-black leading-[0.86] tracking-[-0.065em]">Everything worth knowing before your next build.</h1>
              <p id="live-hero-deck" class="mt-6 max-w-xl text-lg leading-8 text-stone-300">New technology, open-source projects, architecture, AI engineering, and the people building exciting things-explained for working developers.</p>
            </div>
            <div class="mt-8 flex flex-wrap items-center gap-4 border-t border-stone-700 pt-5 text-sm"><span id="live-hero-source" class="font-bold text-white">Curated for developers</span><span id="live-hero-time" class="text-stone-400">8 minutes</span><a id="live-hero-link" href="news.html" class="ml-auto inline-flex items-center gap-2 font-bold text-red-400">Open the briefing ${arrowIcon}</a></div>
          </article>
          <figure class="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-stone-900 sm:min-h-[560px]">
            <img id="live-hero-image" src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=90" alt="Detailed technology circuit board" class="absolute inset-0 h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/5 to-transparent"></div>
            <figcaption class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-6 sm:p-8"><p id="live-hero-image-caption" class="max-w-lg text-sm leading-6 text-stone-100">Every project is linked to source code, maintainers, and real implementation details.</p><span id="live-hero-image-desk" class="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.17em] text-stone-300">Tech Engineering Desk</span></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="border-y border-red-200 bg-red-50 text-stone-950" aria-label="Engineering update"><div class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-8"><span class="w-fit rounded-full bg-red-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white">Live now</span><p id="live-banner-story" class="font-display text-lg font-black leading-tight sm:text-xl">A new open-source runtime makes local agent workflows faster and easier to inspect.</p><a id="live-banner-link" href="city.html" class="inline-flex shrink-0 items-center gap-2 text-sm font-black text-red-700 sm:ml-auto">Read live update ${arrowIcon}</a><span id="live-last-updated" class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-500">Updating...</span></div></section>

    <section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
        <div class="flex flex-col justify-between rounded-[2rem] bg-red-600 p-7 text-white sm:p-9">
          <div><p class="text-xs font-black uppercase tracking-[0.2em] text-red-100">Today’s engineering brief</p><h2 class="mt-4 font-display text-5xl font-black leading-[0.9] tracking-[-0.055em]">Three signals worth opening your editor for.</h2></div>
          <p class="mt-12 max-w-sm leading-7 text-red-50">Implementation details, real tradeoffs, and projects you can inspect yourself.</p>
        </div>
        <div id="live-front-stories" class="divide-y divide-stone-300 border-y border-stone-400">
          ${initialLiveStories.map(([href, category, title, time], index) => `<a href="${href}" class="group grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-center"><span class="font-display text-3xl font-black text-stone-400">0${index + 1}</span><span><span class="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600">${category}</span><span class="font-display text-2xl font-black leading-tight tracking-[-0.03em] transition group-hover:text-red-600 sm:text-3xl">${title}</span></span><span class="hidden text-sm font-bold text-stone-500 sm:block">${time}</span></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="border-y border-stone-300 bg-white">
      <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div class="mb-8 flex items-end justify-between"><div><p class="text-xs font-black uppercase tracking-[0.2em] text-red-600">Built in public</p><h2 class="mt-2 font-display text-5xl font-black tracking-[-0.055em] sm:text-6xl">Projects worth studying.</h2></div><a href="sports.html" class="hidden items-center gap-2 text-sm font-black text-red-700 sm:flex">Explore the showcase ${arrowIcon}</a></div>
        <div id="github-projects-grid" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          ${fallbackProjects.map((project) => `<a href="${project.href}" class="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f3f1e8]"><div class="flex min-h-40 items-end bg-blue-950 p-6 text-white"><p class="text-2xl font-black">Loading GitHub projects...</p></div><div class="p-6"><p class="text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600">${project.category}</p><h3 class="mt-3 font-display text-3xl font-black leading-[0.95] tracking-[-0.04em]">${project.title}</h3></div></a>`).join('')}
        </div>
        <p id="github-projects-updated" class="mt-5 text-xs font-semibold text-stone-500">Updating from GitHub...</p>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-18">
      <div class="overflow-hidden rounded-[2rem] border border-stone-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-6 py-4 sm:px-8">
          <div>
            <p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-600">Trending YouTube</p>
            <h2 class="mt-1 font-display text-3xl font-black tracking-[-0.04em] text-stone-950 sm:text-4xl">Live AI video pulse.</h2>
          </div>
          <p id="youtube-last-updated" class="text-xs font-semibold text-stone-500">Updating video feed...</p>
        </div>
        <div class="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div id="youtube-topic-filters" class="flex flex-wrap gap-2" aria-label="Filter videos by topic">
            ${['All topics', 'AI Tech', 'Programming', 'AI Research', 'Developer Tools'].map((topic, index) => `<button type="button" data-video-topic="${topic}" class="rounded-full border px-4 py-2 text-xs font-bold transition ${index === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-stone-300 text-stone-600 hover:border-blue-400 hover:text-blue-700'}">${topic}</button>`).join('')}
          </div>
          <label class="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-500" for="youtube-creator-filter">
            Creator
            <select id="youtube-creator-filter" class="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold normal-case tracking-normal text-stone-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
              <option value="all">All creators</option>
            </select>
          </label>
        </div>
        <div id="youtube-trending-grid" class="grid gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
          <article class="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p class="text-sm font-semibold text-stone-700">Loading trending videos...</p></article>
          <article class="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p class="text-sm font-semibold text-stone-700">Collecting recent uploads from top AI channels...</p></article>
          <article class="rounded-2xl border border-stone-200 bg-stone-50 p-4"><p class="text-sm font-semibold text-stone-700">Fallback stories will appear if live feed is unavailable.</p></article>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20"><div class="grid overflow-hidden rounded-[2rem] bg-amber-100 lg:grid-cols-[1.2fr_.8fr]"><blockquote class="p-8 sm:p-12 lg:p-16"><p class="text-xs font-black uppercase tracking-[0.2em] text-red-700">The engineering standard</p><p class="mt-5 font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] text-stone-950 sm:text-6xl">“Show the code. Explain the tradeoff. Credit the builder.”</p><footer class="mt-7 max-w-xl leading-7 text-stone-600">Tech showcases work from other developers with direct source links, maintainer attribution, architecture notes, and honest lessons—not copied launch announcements.</footer></blockquote><div class="flex min-h-72 items-end bg-red-700 p-8 text-white sm:p-12"><div><p class="text-sm font-bold text-red-200">Share your work</p><a href="sports.html" class="mt-3 inline-flex items-center gap-2 font-display text-3xl font-black">Submit a project ${arrowIcon}</a></div></div></div></section>
  </main>
`

const sectionTemplate = (key) => {
  const page = sectionPages[key]
  if (!page) {
    return `
      <main class="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8">
        <p class="eyebrow">Not found</p>
        <h1 class="mt-4 font-display text-5xl font-black tracking-[-0.05em]">This page is missing.</h1>
        <p class="mt-5 text-stone-600">Go back to the AI News briefing.</p>
        <a href="index.html" class="mt-8 inline-flex rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white hover:bg-red-600">Back home</a>
      </main>
    `
  }

  return `
    <main>
      <section class="mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14">
        <div class="mb-7 flex flex-wrap items-center justify-between gap-3 border-y border-stone-300 py-3 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-stone-500"><span>${page.title}</span><span>Source-linked intelligence</span></div>
        <div class="grid gap-9 lg:grid-cols-[1.5fr_minmax(280px,.8fr)] lg:gap-10">
          <article>
            <p class="eyebrow">${page.kicker}</p>
            <h1 id="section-live-headline" class="mt-4 max-w-4xl font-display text-[clamp(2.7rem,6vw,5.6rem)] font-black leading-[0.92] tracking-[-0.055em]">${page.headline}</h1>
            <p id="section-live-deck" class="mt-6 max-w-3xl text-lg leading-8 text-stone-600">${page.deck}</p>
            <p id="section-live-byline" class="mt-5 text-sm font-semibold text-stone-500">${page.byline}</p>
            <figure class="mt-8 overflow-hidden rounded-3xl border border-stone-200">
              <img src="${page.image}" alt="${page.title} feature image" class="h-[380px] w-full object-cover sm:h-[500px]" />
            </figure>
          </article>
          <aside class="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 class="font-display text-3xl font-black tracking-[-0.04em]">What to know</h2>
            <div class="mt-6 divide-y divide-stone-200">${page.updates.map(([tag, story]) => `<article class="py-4 first:pt-0"><p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-600">${tag}</p><p class="mt-2 text-sm leading-6 text-stone-700">${story}</p></article>`).join('')}</div>
          </aside>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-6 px-5 pb-16 sm:px-8 lg:grid-cols-3 lg:pb-24">
        <article class="rounded-3xl border border-stone-200 bg-white p-6 lg:col-span-2">
          <p class="eyebrow">Analysis</p>
          <h2 class="mt-3 font-display text-4xl font-black leading-[0.95] tracking-[-0.04em]">Why this story matters right now.</h2>
          <p class="mt-4 leading-7 text-stone-600">AI News connects each development to implementation details, architecture choices, and working source code. Popularity alone is not enough; the project must teach or solve something useful.</p>
          <p class="mt-4 leading-7 text-stone-600">Every briefing is designed to end with a practical next step and a clear stopping point, so staying informed does not consume the time you are trying to protect.</p>
        </article>
        <aside class="rounded-3xl border border-stone-200 bg-stone-950 p-6 text-white">
          <p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-300">Read Next</p>
          <div class="mt-4 space-y-4">${navigation.filter(([navKey]) => navKey !== key).slice(0, 3).map(([, label, href]) => `<a href="${href}" class="group block rounded-2xl border border-stone-800 p-4 transition hover:border-red-500"><p class="text-xs font-black uppercase tracking-[0.17em] text-red-300">${label}</p><p class="mt-2 font-display text-xl font-bold leading-tight">More from ${label}</p><p class="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-stone-300 group-hover:text-white">Open ${arrowIcon}</p></a>`).join('')}</div>
        </aside>
      </section>

      <section class="mx-auto max-w-7xl px-5 pb-18 sm:px-8 lg:pb-24">
        <div class="overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-6 py-4 sm:px-8">
            <p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-600">Live Wire</p>
            <p id="section-live-updated" class="text-xs font-semibold text-stone-500">Fresh signals for ${page.title}</p>
          </div>
          <div id="section-live-feed" class="divide-y divide-stone-200" aria-live="polite">
            <article class="px-6 py-5 sm:px-8">
              <p class="text-sm font-semibold text-stone-900">Loading live stories...</p>
              <p class="mt-1 text-sm text-stone-500">Pulling the latest coverage now.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  `
}

const subscribePage = `
  <main class="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
    <div class="mb-8 border-y border-stone-300 py-4 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-stone-500">Membership</div>
    <div class="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
      <section>
        <p class="eyebrow">Make the signal yours</p>
        <h1 class="mt-4 font-display text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.9] tracking-[-0.055em]">Build your AI News briefing.</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Tell us what you build, the languages and platforms in your stack, and which engineering problems you want to understand better.</p>
        <ul class="mt-8 space-y-3 text-sm text-stone-700">
          <li>One focused daily engineering briefing</li>
          <li>Open source, architecture, AI, and developer-tool signals</li>
          <li>Source code, implementation notes, and maintainer credit</li>
        </ul>
      </section>
      <section class="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 class="font-display text-3xl font-black tracking-[-0.04em]">Choose your focus</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <article class="rounded-2xl border border-stone-200 p-4">
            <p class="text-sm font-bold">Explore what’s new</p>
            <p class="mt-2 font-display text-3xl font-black">Radar</p>
            <p class="text-xs text-stone-500">releases, tools, and projects</p>
          </article>
          <article class="rounded-2xl border-2 border-red-500 bg-red-50 p-4">
            <p class="text-sm font-bold text-red-700">Go deeper</p>
            <p class="mt-2 font-display text-3xl font-black text-red-700">Systems</p>
            <p class="text-xs text-red-700">architecture and AI engineering</p>
          </article>
        </div>
        <form class="mt-6 space-y-3" aria-label="Subscription form">
          <label class="block text-sm font-semibold" for="subscriber-email">Email address</label>
          <input id="subscriber-email" type="email" placeholder="you@example.com" class="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
          <button type="submit" class="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600">Create my briefing</button>
        </form>
      </section>
    </div>
  </main>
`

let mainContent = homePage
let activeSection = 'news'

if (pageKey === 'subscribe') {
  mainContent = subscribePage
  activeSection = ''
} else if (pageKey !== 'index') {
  mainContent = sectionTemplate(pageKey)
  activeSection = pageKey
}

const titleMap = {
  index: 'AI News | Engineering intelligence for developers',
  subscribe: 'My Stack | AI News',
  news: 'Developer Briefing | AI News',
  city: 'GitHub Radar | AI News',
  politics: 'Architecture | AI News',
  culture: 'AI Engineering | AI News',
  business: 'Developer Tools | AI News',
  sports: 'Project Showcase | AI News',
}

document.title = titleMap[pageKey] || 'AI News'

document.querySelector('#app').innerHTML = `
  <div class="min-h-screen bg-stone-50 text-stone-950 selection:bg-red-200">
    ${header(activeSection)}
    ${mainContent}
    ${footer}
  </div>
`

const updateEditionDate = () => {
  const label = document.querySelector('#edition-label')
  const date = document.querySelector('#edition-date')
  if (!label || !date) return
  const now = new Date()
  label.textContent = `${now.toLocaleDateString('en-US', { weekday: 'long' })} Edition`
  date.textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const updateLiveTimestamp = (timestamp = new Date()) => {
  const readable = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const homeStamp = document.querySelector('#live-last-updated')
  const sectionStamp = document.querySelector('#section-live-updated')
  if (homeStamp) homeStamp.textContent = `Updated ${readable}`
  if (sectionStamp && sectionPages[pageKey]) sectionStamp.textContent = `Fresh signals for ${sectionPages[pageKey].title} · Updated ${readable}`
}

const updateYoutubeTimestamp = (timestamp = new Date(), failed = false) => {
  const target = document.querySelector('#youtube-last-updated')
  if (!target) return
  const readable = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  target.textContent = failed ? `Video feed fallback · Updated ${readable}` : `Updated ${readable}`
}

const pickLeadStory = (stories) => {
  const pool = stories.slice(0, Math.min(5, stories.length))
  return pool[Math.floor(Math.random() * pool.length)]
}

const hashString = (value) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

const pickHeroVisual = (lead) => {
  const cycle = Math.floor(Date.now() / LIVE_NEWS_REFRESH_MS)
  const seed = `${lead?.title || ''}|${lead?.url || ''}|${cycle}`
  return heroVisuals[hashString(seed) % heroVisuals.length]
}

const applyLiveNews = (stories, lead) => {
  if (!stories.length) return
  const rest = stories.filter((story) => story !== lead)
  const heroTitle = document.querySelector('#live-hero-title')
  const heroDeck = document.querySelector('#live-hero-deck')
  const heroSource = document.querySelector('#live-hero-source')
  const heroTime = document.querySelector('#live-hero-time')
  const heroLink = document.querySelector('#live-hero-link')
  const heroImage = document.querySelector('#live-hero-image')
  const heroImageCaption = document.querySelector('#live-hero-image-caption')
  const heroImageDesk = document.querySelector('#live-hero-image-desk')
  const bannerStory = document.querySelector('#live-banner-story')
  const bannerLink = document.querySelector('#live-banner-link')
  const frontList = document.querySelector('#live-front-stories')

  if (heroTitle) heroTitle.textContent = lead.title
  if (heroDeck) heroDeck.textContent = lead.summary
  if (heroSource) heroSource.textContent = lead.source
  if (heroTime) heroTime.textContent = lead.timeLabel
  if (heroLink) heroLink.href = lead.url
  const heroVisual = pickHeroVisual(lead)
  if (heroImage) {
    heroImage.src = heroVisual.image
    heroImage.alt = heroVisual.alt
  }
  if (heroImageCaption) heroImageCaption.textContent = heroVisual.caption
  if (heroImageDesk) heroImageDesk.textContent = heroVisual.desk
  if (bannerStory) bannerStory.textContent = lead.title
  if (bannerLink) bannerLink.href = lead.url

  if (frontList) {
    const cards = [lead, ...rest].slice(0, 3)
    frontList.innerHTML = cards.map((story, index) => `
      <a href="${escapeHtml(story.url)}" class="group grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
        <span class="font-display text-3xl font-black text-stone-400">0${index + 1}</span>
        <span>
          <span class="mb-2 inline-flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600"><span class="rounded-md border px-1.5 py-0.5 text-[0.58rem] ${story.sourceTone}">${escapeHtml(story.sourceBadge)}</span>${escapeHtml(story.category)}</span>
          <span class="font-display text-2xl font-black leading-tight tracking-[-0.03em] transition group-hover:text-red-600 sm:text-3xl">${escapeHtml(story.title)}</span>
        </span>
        <span class="hidden text-sm font-bold text-stone-500 sm:block">${escapeHtml(story.timeLabel)}</span>
      </a>
    `).join('')
  }
}

const renderSectionLiveFeed = (stories, state = 'ready') => {
  const container = document.querySelector('#section-live-feed')
  if (!container) return

  if (state === 'error') {
    container.innerHTML = `
      <article class="px-6 py-5 sm:px-8">
        <p class="text-sm font-semibold text-stone-900">Live feed unavailable.</p>
        <p class="mt-1 text-sm text-stone-500">Editorial coverage is still available above.</p>
      </article>
    `
    return
  }

  if (!stories.length) {
    container.innerHTML = `
      <article class="px-6 py-5 sm:px-8">
        <p class="text-sm font-semibold text-stone-900">No live stories found right now.</p>
        <p class="mt-1 text-sm text-stone-500">Try again shortly for new updates.</p>
      </article>
    `
    return
  }

  container.innerHTML = stories.slice(0, 5).map((story, index) => `
    <a href="${escapeHtml(story.url)}" class="group block px-6 py-5 transition hover:bg-blue-50 sm:px-8">
      <p class="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-600"><span class="rounded-md border px-1.5 py-0.5 text-[0.58rem] ${story.sourceTone}">${escapeHtml(story.sourceBadge)}</span>${escapeHtml(story.category)} ${index + 1}</p>
      <h3 class="mt-2 font-display text-2xl font-black leading-tight tracking-[-0.03em] transition group-hover:text-red-700">${escapeHtml(story.title)}</h3>
      <p class="mt-1 text-xs font-semibold text-stone-500">${escapeHtml(story.source)} · ${escapeHtml(story.timeLabel)}</p>
    </a>
  `).join('')
}

const applySectionLeadStory = (story) => {
  if (!story || pageKey === 'index' || pageKey === 'subscribe') return
  const headline = document.querySelector('#section-live-headline')
  const deck = document.querySelector('#section-live-deck')
  const byline = document.querySelector('#section-live-byline')
  if (headline) headline.textContent = story.title
  if (deck) deck.textContent = story.summary
  if (byline) byline.textContent = `${story.source} · Updated ${story.timeLabel}`
}

const fallbackStoriesForPage = () => {
  if (pageKey === 'index') {
    return frontStories.map(([url, category, title, time]) => ({
      title,
      summary: title,
      source: 'AI News editorial desk',
      sourceBadge: 'ED',
      sourceTone: 'bg-blue-100 text-blue-800 border-blue-200',
      timeLabel: time,
      category,
      url,
    }))
  }

  if (sectionPages[pageKey]) {
    return sectionPages[pageKey].updates.map(([category, title], index) => ({
      title,
      summary: title,
      source: 'AI News editorial desk',
      sourceBadge: 'ED',
      sourceTone: 'bg-blue-100 text-blue-800 border-blue-200',
      timeLabel: `${index + 1}h ago`,
      category,
      url: `${pageKey}.html`,
    }))
  }

  return []
}

const normalizeYoutubeVideo = (item, fallbackChannel) => ({
  title: item?.title || 'Untitled video',
  url: item?.link || '#',
  channel: item?.author || fallbackChannel,
  publishedAt: item?.pubDate || new Date().toISOString(),
  thumbnail: item?.thumbnail || item?.enclosure?.thumbnail || '',
})

const fetchTrendingYoutubeVideos = async () => {
  const feeds = await Promise.all(YOUTUBE_CHANNELS.map(async ({ id, label, topics }) => {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`
    const response = await fetch(`${RSS2JSON_ENDPOINT}${encodeURIComponent(feedUrl)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`YouTube feed API returned ${response.status}`)
    const data = await response.json()
    const items = Array.isArray(data?.items) ? data.items : []
    return items.slice(0, 4).map((item) => ({ ...normalizeYoutubeVideo(item, label), topics }))
  }))

  return feeds
    .flat()
    .filter((video) => video.url && video.url !== '#')
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((video, index, all) => all.findIndex((item) => item.url === video.url) === index)
    .slice(0, 6)
}

const renderTrendingYoutubeVideos = (videos) => {
  const grid = document.querySelector('#youtube-trending-grid')
  if (!grid) return
  if (!videos.length) {
    grid.innerHTML = `<article class="rounded-2xl border border-stone-200 bg-stone-50 p-5"><p class="text-sm font-semibold text-stone-900">No videos available right now.</p><p class="mt-1 text-sm text-stone-500">Try again shortly.</p></article>`
    return
  }

  grid.innerHTML = videos.map((video) => `
    <a href="${escapeHtml(video.url)}" class="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100/70">
      <div class="aspect-video overflow-hidden bg-stone-100">
        <img src="${escapeHtml(video.thumbnail)}" alt="${escapeHtml(video.title)} thumbnail" class="h-full w-full object-cover transition duration-400 group-hover:scale-105" loading="lazy" />
      </div>
      <div class="p-4">
        <p class="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-600"><span class="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[0.58rem]">YT</span>${escapeHtml(video.channel)}</p>
        <h3 class="mt-2 font-display text-2xl font-black leading-tight tracking-[-0.03em] text-stone-950 transition group-hover:text-red-700">${escapeHtml(video.title)}</h3>
        <p class="mt-2 text-xs font-semibold text-stone-500">${escapeHtml(formatRelativeTime(video.publishedAt))}</p>
      </div>
    </a>
  `).join('')
}

const normalizeGithubProject = (repository) => ({
  title: repository.name,
  fullName: repository.full_name,
  description: repository.description || 'An actively maintained AI project worth exploring.',
  url: repository.html_url,
  owner: repository.owner?.login || 'GitHub creator',
  avatar: repository.owner?.avatar_url || '',
  language: repository.language || 'Open source',
  stars: repository.stargazers_count || 0,
  updatedAt: repository.updated_at,
  topics: repository.topics || [],
})

const fetchGithubProjects = async () => {
  const response = await fetch(GITHUB_PROJECTS_ENDPOINT, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`)
  const data = await response.json()
  return Array.isArray(data?.items) ? data.items.map(normalizeGithubProject) : []
}

const formatCount = (value) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

const renderGithubProjects = (projects) => {
  const grid = document.querySelector('#github-projects-grid')
  if (!grid) return
  if (!projects.length) {
    grid.innerHTML = `<article class="rounded-[1.75rem] border border-stone-200 bg-blue-50 p-6"><p class="font-display text-2xl font-black text-stone-950">No live projects found.</p><p class="mt-2 text-sm text-stone-600">GitHub may be rate-limiting requests. Try again shortly.</p></article>`
    return
  }

  const bookmarks = getBookmarks()
  grid.innerHTML = projects.map((project) => `
    <article class="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f3f1e8] transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/70">
      <div class="relative flex min-h-40 items-end overflow-hidden bg-blue-950 p-6 text-white">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-950 to-slate-950 opacity-90"></div>
        ${project.avatar ? `<img src="${escapeHtml(project.avatar)}" alt="" class="absolute right-5 top-5 size-12 rounded-full border-2 border-white/30 opacity-80" loading="lazy" />` : ''}
        <div class="relative">
          <p class="text-[0.65rem] font-black uppercase tracking-[0.18em] text-blue-200">Live GitHub project</p>
          <p class="mt-2 font-display text-3xl font-black leading-none">${escapeHtml(project.title)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="flex items-start justify-between gap-3"><p class="text-[0.68rem] font-black uppercase tracking-[0.16em] text-red-600">${escapeHtml(project.owner)} · ${escapeHtml(project.language)}</p><button type="button" data-bookmark-project="${escapeHtml(project.url)}" aria-label="${bookmarks.has(project.url) ? 'Remove bookmark' : 'Bookmark project'}" aria-pressed="${bookmarks.has(project.url)}" title="${bookmarks.has(project.url) ? 'Remove bookmark' : 'Bookmark project'}" class="shrink-0 rounded-lg p-1 text-stone-500 transition hover:bg-stone-200 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"><svg aria-hidden="true" viewBox="0 0 24 24" class="size-5" fill="${bookmarks.has(project.url) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><path d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V21l-6-3.5L6 21V4.75Z" /></svg></button></div>
        <p class="mt-3 min-h-12 text-sm leading-6 text-stone-600">${escapeHtml(project.description)}</p>
        <div class="mt-5 flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-bold text-stone-500"><a data-project-link="${escapeHtml(project.url)}" href="${escapeHtml(project.url)}" target="_blank" rel="noreferrer" class="text-red-700 hover:underline">Open project</a><span>${formatCount(project.stars)} stars</span><span>Updated ${escapeHtml(formatRelativeTime(project.updatedAt))}</span></div>
      </div>
    </article>
  `).join('')

  grid.querySelectorAll('[data-bookmark-project]').forEach((button) => {
    button.addEventListener('click', () => {
      const project = projects.find(({ url }) => url === button.dataset.bookmarkProject)
      if (!project) return
      const next = getBookmarks()
      const bookmarked = !next.has(project.url)
      if (bookmarked) next.add(project.url)
      else next.delete(project.url)
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify([...next]))
      button.setAttribute('aria-pressed', String(bookmarked))
      button.setAttribute('aria-label', bookmarked ? 'Remove bookmark' : 'Bookmark project')
      button.title = bookmarked ? 'Remove bookmark' : 'Bookmark project'
      button.querySelector('svg').setAttribute('fill', bookmarked ? 'currentColor' : 'none')
      sendBrainSignal(bookmarked ? 'project_bookmark' : 'project_unbookmark', project)
    })
  })
  grid.querySelectorAll('[data-project-link]').forEach((link) => {
    link.addEventListener('click', () => {
      const project = projects.find(({ url }) => url === link.dataset.projectLink)
      if (project) sendBrainSignal('project_click', project)
    })
  })
}

const updateGithubTimestamp = (timestamp = new Date(), failed = false) => {
  const target = document.querySelector('#github-projects-updated')
  if (!target) return
  const readable = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  target.textContent = failed ? `GitHub fallback · Updated ${readable}` : `Live from GitHub · Updated ${readable}`
}

let liveRefreshTimer
let youtubeRefreshTimer
let githubRefreshTimer
let refreshingLive = false

const refreshLiveContent = async () => {
  if (!isLivePage || refreshingLive) return
  refreshingLive = true
  try {
    const stories = await fetchLiveNews(liveTopics)
    const lead = pickLeadStory(stories)
    applyLiveNews(stories, lead)
    applySectionLeadStory(lead)
    renderSectionLiveFeed(stories)
    updateLiveTimestamp(new Date())
  } catch {
    const fallbackStories = fallbackStoriesForPage()
    const lead = pickLeadStory(fallbackStories)
    applyLiveNews(fallbackStories, lead)
    applySectionLeadStory(lead)
    renderSectionLiveFeed(fallbackStories, 'error')
    updateLiveTimestamp(new Date())
  } finally {
    refreshingLive = false
  }
}

let refreshingYoutube = false
let latestYoutubeVideos = []
let selectedYoutubeTopic = 'All topics'
let selectedYoutubeCreator = 'all'

const setupYoutubeFilters = (videos) => {
  const creatorFilter = document.querySelector('#youtube-creator-filter')
  const topicFilters = document.querySelectorAll('[data-video-topic]')
  if (!creatorFilter) return

  const creators = [...new Set(videos.map((video) => video.channel))].sort()
  creatorFilter.innerHTML = '<option value="all">All creators</option>' + creators.map((creator) => `<option value="${escapeHtml(creator)}">${escapeHtml(creator)}</option>`).join('')
  creatorFilter.value = selectedYoutubeCreator
  creatorFilter.onchange = () => {
    selectedYoutubeCreator = creatorFilter.value
    renderFilteredYoutubeVideos()
  }
  topicFilters.forEach((button) => {
    button.onclick = () => {
      selectedYoutubeTopic = button.dataset.videoTopic
      topicFilters.forEach((item) => {
        const active = item === button
        item.classList.toggle('border-blue-600', active)
        item.classList.toggle('bg-blue-600', active)
        item.classList.toggle('text-white', active)
        item.classList.toggle('border-stone-300', !active)
        item.classList.toggle('text-stone-600', !active)
      })
      renderFilteredYoutubeVideos()
    }
  })
}

const renderFilteredYoutubeVideos = () => {
  const videos = latestYoutubeVideos.filter((video) => {
    const matchesTopic = selectedYoutubeTopic === 'All topics' || video.topics.includes(selectedYoutubeTopic)
    const matchesCreator = selectedYoutubeCreator === 'all' || video.channel === selectedYoutubeCreator
    return matchesTopic && matchesCreator
  })
  renderTrendingYoutubeVideos(videos)
}

const refreshYoutubeContent = async () => {
  if (pageKey !== 'index' || refreshingYoutube) return
  refreshingYoutube = true
  try {
    const videos = await fetchTrendingYoutubeVideos()
    latestYoutubeVideos = videos
    setupYoutubeFilters(videos)
    renderFilteredYoutubeVideos()
    updateYoutubeTimestamp(new Date())
  } catch {
    latestYoutubeVideos = fallbackVideos.map((video) => ({ ...video, topics: ['AI Tech'] }))
    setupYoutubeFilters(latestYoutubeVideos)
    renderFilteredYoutubeVideos()
    updateYoutubeTimestamp(new Date(), true)
  } finally {
    refreshingYoutube = false
  }
}

let refreshingGithub = false
const refreshGithubContent = async () => {
  if (pageKey !== 'index' || refreshingGithub) return
  refreshingGithub = true
  try {
    const projects = await fetchGithubProjects()
    renderGithubProjects(projects)
    updateGithubTimestamp(new Date())
  } catch {
    renderGithubProjects(fallbackProjects.map((project) => ({
      title: project.title,
      fullName: 'AI News editorial pick',
      description: project.description,
      url: project.href,
      owner: 'AI News',
      avatar: '',
      language: project.category,
      stars: 0,
      updatedAt: new Date().toISOString(),
      topics: [],
    })))
    updateGithubTimestamp(new Date(), true)
  } finally {
    refreshingGithub = false
  }
}

mountSharedNav()
initializeContentAdapter('ai-news').finally(async () => {
  updateEditionDate()
  await refreshLiveContent()
  await refreshYoutubeContent()
  await refreshGithubContent()
  if (!isLivePage) return
  liveRefreshTimer = window.setInterval(() => {
    if (document.hidden) return
    refreshLiveContent()
  }, LIVE_NEWS_REFRESH_MS)
  youtubeRefreshTimer = window.setInterval(() => {
    if (document.hidden) return
    refreshYoutubeContent()
  }, YOUTUBE_REFRESH_MS)
  githubRefreshTimer = window.setInterval(() => {
    if (document.hidden) return
    refreshGithubContent()
  }, GITHUB_REFRESH_MS)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      refreshLiveContent()
      refreshYoutubeContent()
      refreshGithubContent()
    }
  })
})
const menuButton = document.querySelector('#menu-button')
const mobileNav = document.querySelector('#mobile-nav')
const appsButton = document.querySelector('#apps-button')
const appsMenu = document.querySelector('#apps-menu')
const appsList = document.querySelector('#apps-list')

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true'
    menuButton.setAttribute('aria-expanded', String(!isOpen))
    menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation')
    mobileNav.classList.toggle('hidden', isOpen)
  })
}

const previewId = async (branch) => {
  let slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'branch'
  slug = slug.slice(0, 38).replace(/-$/, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(branch))
  const hash = Array.from(new Uint8Array(digest)).slice(0, 3).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${slug}-${hash}`
}

const displayBranch = (branch) => branch.split(/[\/_-]+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

const renderApps = async () => {
  if (!appsList) return
  const production = { name: 'Production', branch: 'main', url: 'https://tabloid.tail70b7f1.ts.net/' }
  try {
    const response = await fetch('https://api.github.com/repos/dioscarr/Tabloid/branches?per_page=100', { headers: { Accept: 'application/vnd.github+json' } })
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
    const records = await response.json()
    const previews = await Promise.all(records.filter(({ name }) => name !== 'main').map(async ({ name }) => ({ name: displayBranch(name), branch: name, url: `https://tabloid-${await previewId(name)}.tail70b7f1.ts.net/` })))
    const currentHost = window.location.hostname
    appsList.innerHTML = [production, ...previews].map((app) => {
      const current = new URL(app.url).hostname === currentHost
      return `<a href="${app.url}" role="menuitem" class="flex items-center gap-3 rounded-xl px-3 py-3 transition ${current ? 'bg-emerald-800' : 'hover:bg-emerald-900'}"><span class="grid size-10 shrink-0 place-items-center rounded-xl ${current ? 'bg-lime-300 text-emerald-950' : 'bg-emerald-800 text-emerald-200'}">${app.name.charAt(0)}</span><span class="min-w-0"><span class="block truncate text-sm font-bold">${app.name}</span><span class="block truncate text-xs text-emerald-200/60">${app.branch}${current ? ' · Current' : ''}</span></span></a>`
    }).join('')
  } catch (error) {
    appsList.innerHTML = `<a href="${production.url}" class="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-emerald-900"><span class="grid size-10 place-items-center rounded-xl bg-emerald-800 text-emerald-200">P</span><span><span class="block text-sm font-bold">Production</span><span class="block text-xs text-emerald-200/60">main</span></span></a><p class="px-3 py-3 text-xs leading-5 text-amber-200">Branch apps could not be loaded. Try again shortly.</p>`
  }
}

if (appsButton && appsMenu) {
  appsButton.addEventListener('click', () => {
    const isOpen = appsButton.getAttribute('aria-expanded') === 'true'
    appsButton.setAttribute('aria-expanded', String(!isOpen))
    appsButton.setAttribute('aria-label', isOpen ? 'Open app switcher' : 'Close app switcher')
    appsMenu.classList.toggle('hidden', isOpen)
    if (!isOpen) renderApps()
  })
  document.addEventListener('click', (event) => {
    if (!appsMenu.contains(event.target) && !appsButton.contains(event.target)) {
      appsMenu.classList.add('hidden')
      appsButton.setAttribute('aria-expanded', 'false')
      appsButton.setAttribute('aria-label', 'Open app switcher')
    }
  })
}

document.querySelectorAll('form').forEach((formElement) => {
  formElement.addEventListener('submit', (event) => event.preventDefault())
})

document.querySelectorAll('main section, main article, main aside').forEach((node, index) => {
  node.classList.add('reveal-up')
  node.style.transitionDelay = `${Math.min(index * 35, 220)}ms`
})

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return
    entry.target.classList.add('is-visible')
    observer.unobserve(entry.target)
  })
}, { threshold: 0.14 })

document.querySelectorAll('.reveal-up').forEach((node) => revealObserver.observe(node))

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]')
  if (!link) return
  if (link.target && link.target !== '_self') return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (link.origin !== window.location.origin) return
  if (!link.pathname.endsWith('.html')) return
  if (!document.startViewTransition) return

  event.preventDefault()
  document.startViewTransition(() => {
    window.location.href = link.href
  })
})
