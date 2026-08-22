import './style.css'
import { mountSharedNav } from './shared-nav.js'

const arrowIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>`
const appsIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-5" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="10" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>`

const navigation = [
  ['news', 'AI Radar', 'news.html'],
  ['city', 'GitHub Pulse', 'city.html'],
  ['politics', 'Career Moves', 'politics.html'],
  ['culture', 'Pay & Demand', 'culture.html'],
  ['business', 'Build This', 'business.html'],
  ['sports', 'For You', 'sports.html'],
]

const frontStories = [
  ['news.html', 'AI Radar', 'A new open model makes private, local AI dramatically easier to run.', '4 min'],
  ['city.html', 'GitHub Pulse', 'Five fast-growing repositories that could improve your workflow this week.', '3 min'],
  ['politics.html', 'Career Moves', 'AI infrastructure roles are rising—and these are the skills employers want.', '4 min'],
]

const features = [
  ['business.html', 'Build This', 'Turn your saved articles into a searchable personal knowledge assistant.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85', 'lg:col-span-2'],
  ['culture.html', 'Pay & Demand', 'The technology skills gaining value faster than job titles can keep up.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=85', ''],
  ['sports.html', 'For You', 'A focused 30-day learning path built around your next career move.', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=85', ''],
]

const sectionPages = {
  news: {
    title: 'AI Radar',
    kicker: 'What changed',
    headline: 'Smaller open models are making useful private AI possible on everyday hardware.',
    deck: 'The newest releases prioritize efficiency, local inference, and practical agent workflows—creating opportunities without another expensive cloud subscription.',
    byline: 'Big News Intelligence · Updated 11:05 AM',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Models', 'A compact release now handles common coding and document tasks locally.'],
      ['Agents', 'Tool-use reliability is improving faster than raw benchmark scores.'],
      ['Your move', 'Test one private workflow before moving more data into the cloud.'],
    ],
  },
  city: {
    title: 'GitHub Pulse',
    kicker: 'Open source signal',
    headline: 'Developer tools are converging around local agents, structured context, and faster feedback.',
    deck: 'We filtered today’s repository activity for projects with real documentation, active maintainers, and a clear benefit to the way you build.',
    byline: 'Big News Intelligence · Updated 10:22 AM',
    image: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Trending', 'Local-first agent frameworks are attracting sustained contributor growth.'],
      ['Maintainers', 'The strongest projects pair frequent releases with clear migration notes.'],
      ['Your move', 'Star less. Trial one tool against a real task for thirty minutes.'],
    ],
  },
  politics: {
    title: 'Career Moves',
    kicker: 'Opportunity radar',
    headline: 'Companies need people who can connect AI prototypes to reliable production systems.',
    deck: 'The durable opportunity is shifting from prompt experimentation toward evaluation, infrastructure, security, data quality, and measurable business outcomes.',
    byline: 'Big News Intelligence · Updated 9:48 AM',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Hiring', 'Platform and AI operations roles increasingly overlap.'],
      ['Skills', 'Evaluation and observability now separate demos from dependable products.'],
      ['Your move', 'Document one production-grade AI project as a concise case study.'],
    ],
  },
  culture: {
    title: 'Pay & Demand',
    kicker: 'Know your value',
    headline: 'The market is rewarding adaptable technical depth more than fashionable titles.',
    deck: 'Salary data becomes useful when paired with location, experience, industry demand, and the specific technologies appearing in real job descriptions.',
    byline: 'Big News Intelligence · Updated 8:57 AM',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Baseline', 'Government labor data provides a defensible compensation benchmark.'],
      ['Demand', 'Cloud, security, data, and AI integration skills continue to intersect.'],
      ['Your move', 'Compare responsibilities and outcomes—not title alone—before negotiating.'],
    ],
  },
  business: {
    title: 'Build This',
    kicker: 'From signal to project',
    headline: 'Build a personal research assistant that remembers what you decide—not everything you read.',
    deck: 'A focused weekend project can combine feeds, source-aware summaries, semantic search, and a small decision journal without becoming another information inbox.',
    byline: 'Big News Intelligence · Updated 10:41 AM',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Scope', 'Start with three trusted feeds and one searchable collection.'],
      ['Stack', 'Use a small API, Postgres, and source-linked summaries.'],
      ['Your move', 'Ship the smallest useful loop before adding autonomous agents.'],
    ],
  },
  sports: {
    title: 'For You',
    kicker: 'Your five minutes',
    headline: 'Three useful signals, one opportunity, and one next step—then you are caught up.',
    deck: 'Your briefing prioritizes the technologies, roles, projects, and ideas most likely to improve your work and protect your time outside it.',
    byline: 'Personalized by Big News · Updated 11:16 AM',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Know', 'Local AI tools are becoming practical for private daily workflows.'],
      ['Try', 'Evaluate one trending repository against a problem you already have.'],
      ['Done', 'You have enough signal for today. Go spend the saved time well.'],
    ],
  },
}

const fileName = window.location.pathname.split('/').pop() || 'index.html'
const pageKey = fileName.replace('.html', '')

const navMarkup = (active) => navigation.map(([key, label, href]) => `<a href="${href}" class="text-sm font-semibold transition hover:text-emerald-200 ${key === active ? 'text-emerald-300' : 'text-emerald-50/80'}">${label}</a>`).join('')

const mobileNavMarkup = () => navigation.map(([, label, href]) => `<a href="${href}" class="rounded-xl px-4 py-3 text-sm font-semibold text-emerald-50 hover:bg-emerald-800">${label}</a>`).join('')

const header = (active) => `
  <header class="sticky top-0 z-50 border-b border-emerald-800 bg-emerald-950/95 text-white shadow-lg shadow-emerald-950/10 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
      <a href="index.html" class="font-display text-xl font-black tracking-tight sm:text-2xl" aria-label="Big News home">Big News<span class="text-emerald-300">.</span></a>
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
        <a href="subscribe.html" class="hidden rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-white sm:inline-flex">Your Briefing</a>
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
        <p class="font-display text-2xl font-black">Big News<span class="text-red-600">.</span></p>
        <p class="mt-1 text-sm text-stone-500">Spend less time searching. Spend more time living.</p>
      </div>
      <form class="flex w-full max-w-md gap-2" aria-label="Newsletter subscription">
        <label class="sr-only" for="email">Email address</label>
        <input id="email" type="email" placeholder="you@example.com" class="min-w-0 flex-1 rounded-full border border-stone-300 bg-stone-50 px-5 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100" />
        <button type="submit" class="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">Get the briefing</button>
      </form>
    </div>
  </footer>
`

const homePage = `
  <main class="bg-[#f3f1e8]">
    <section class="overflow-hidden bg-stone-950 text-white">
      <div class="mx-auto max-w-7xl px-5 pb-10 pt-8 sm:px-8 sm:pb-14">
        <div class="flex items-center justify-between border-y border-stone-700 py-3 text-[0.65rem] font-black uppercase tracking-[0.22em] text-stone-300"><span>Thursday Edition</span><span>August 21, 2026</span></div>
        <div class="border-b border-stone-700 py-5 sm:py-7">
          <p class="text-center text-[clamp(4.3rem,15vw,11rem)] font-black leading-[0.72] tracking-[-0.085em] text-red-500">BIG NEWS</p>
        </div>
        <div class="grid gap-8 pt-8 lg:grid-cols-[1.05fr_1.45fr] lg:items-stretch">
          <article class="flex flex-col justify-between">
            <div>
              <p class="inline-flex rounded-full bg-red-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white">Your five-minute tech briefing</p>
              <h1 class="mt-6 max-w-2xl font-display text-[clamp(3.2rem,7vw,6.6rem)] font-black leading-[0.86] tracking-[-0.065em]">Know what matters. Then get back to life.</h1>
              <p class="mt-6 max-w-xl text-lg leading-8 text-stone-300">AI, open source, careers, pay, and useful ideas—filtered into the few signals that can genuinely improve your work and your life.</p>
            </div>
            <div class="mt-8 flex flex-wrap items-center gap-4 border-t border-stone-700 pt-5 text-sm"><span class="font-bold text-white">Personalized for you</span><span class="text-stone-400">5 minutes</span><a href="sports.html" class="ml-auto inline-flex items-center gap-2 font-bold text-red-400">Start your briefing ${arrowIcon}</a></div>
          </article>
          <figure class="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-stone-900 sm:min-h-[560px]">
            <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=90" alt="Detailed technology circuit board" class="absolute inset-0 h-full w-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/5 to-transparent"></div>
            <figcaption class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-6 sm:p-8"><p class="max-w-lg text-sm leading-6 text-stone-100">Signal over noise, with every recommendation connected to a source and a useful next step.</p><span class="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.17em] text-stone-300">Big News Intelligence</span></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="border-y border-red-200 bg-red-50 text-stone-950" aria-label="Breaking news"><div class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-8"><span class="w-fit rounded-full bg-red-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white">AI Radar</span><p class="font-display text-lg font-black leading-tight sm:text-xl">New local models promise better privacy and useful performance on hardware you already own.</p><a href="news.html" class="ml-auto inline-flex shrink-0 items-center gap-2 text-sm font-black text-red-700">Why it matters ${arrowIcon}</a></div></section>

    <section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
        <div class="flex flex-col justify-between rounded-[2rem] bg-red-600 p-7 text-white sm:p-9">
          <div><p class="text-xs font-black uppercase tracking-[0.2em] text-red-100">Today, in five</p><h2 class="mt-4 font-display text-5xl font-black leading-[0.9] tracking-[-0.055em]">Three signals. One clear next step.</h2></div>
          <p class="mt-12 max-w-sm leading-7 text-red-50">Enough context to move forward—without losing your morning to the feed.</p>
        </div>
        <div class="divide-y divide-stone-300 border-y border-stone-400">
          ${frontStories.map(([href, category, title, time], index) => `<a href="${href}" class="group grid grid-cols-[2.5rem_1fr] gap-4 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-center"><span class="font-display text-3xl font-black text-stone-400">0${index + 1}</span><span><span class="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600">${category}</span><span class="font-display text-2xl font-black leading-tight tracking-[-0.03em] transition group-hover:text-red-600 sm:text-3xl">${title}</span></span><span class="hidden text-sm font-bold text-stone-500 sm:block">${time}</span></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="border-y border-stone-300 bg-white">
      <div class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
        <div class="mb-8 flex items-end justify-between"><div><p class="text-xs font-black uppercase tracking-[0.2em] text-red-600">Chosen for usefulness</p><h2 class="mt-2 font-display text-5xl font-black tracking-[-0.055em] sm:text-6xl">Useful, not endless.</h2></div><a href="sports.html" class="hidden items-center gap-2 text-sm font-black text-red-700 sm:flex">See your briefing ${arrowIcon}</a></div>
        <div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          ${features.map(([href, category, title, image, size], index) => `<a href="${href}" class="group overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f3f1e8] ${size}"><div class="overflow-hidden ${index === 0 ? 'aspect-[16/8]' : 'aspect-[4/3]'}"><img src="${image}" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><div class="p-6"><p class="text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-600">${category}</p><h3 class="mt-3 font-display font-black leading-[0.95] tracking-[-0.04em] transition group-hover:text-red-600 ${index === 0 ? 'text-4xl sm:text-5xl' : 'text-3xl'}">${title}</h3></div></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20"><div class="grid overflow-hidden rounded-[2rem] bg-amber-100 lg:grid-cols-[1.2fr_.8fr]"><blockquote class="p-8 sm:p-12 lg:p-16"><p class="text-xs font-black uppercase tracking-[0.2em] text-red-700">Time well spent</p><p class="mt-5 font-display text-4xl font-black leading-[0.95] tracking-[-0.05em] text-stone-950 sm:text-6xl">“Spend less time searching. Spend more time living.”</p><footer class="mt-7 max-w-xl leading-7 text-stone-600">Big News has a real stopping point. When the useful signals are covered, you are caught up—and free to focus on the people and work that matter.</footer></blockquote><div class="flex min-h-72 items-end bg-red-700 p-8 text-white sm:p-12"><div><p class="text-sm font-bold text-red-200">Your daily promise</p><a href="subscribe.html" class="mt-3 inline-flex items-center gap-2 font-display text-3xl font-black">Shape your briefing ${arrowIcon}</a></div></div></div></section>
  </main>
`

const sectionTemplate = (key) => {
  const page = sectionPages[key]
  if (!page) {
    return `
      <main class="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8">
        <p class="eyebrow">Not found</p>
        <h1 class="mt-4 font-display text-5xl font-black tracking-[-0.05em]">This page is missing.</h1>
        <p class="mt-5 text-stone-600">Go back to the Big News briefing.</p>
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
            <h1 class="mt-4 max-w-4xl font-display text-[clamp(2.7rem,6vw,5.6rem)] font-black leading-[0.92] tracking-[-0.055em]">${page.headline}</h1>
            <p class="mt-6 max-w-3xl text-lg leading-8 text-stone-600">${page.deck}</p>
            <p class="mt-5 text-sm font-semibold text-stone-500">${page.byline}</p>
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
          <p class="mt-4 leading-7 text-stone-600">Big News connects each development to the tools you use, the skills you are building, and the opportunities you care about. Popularity alone is not enough; the signal must be useful.</p>
          <p class="mt-4 leading-7 text-stone-600">Every briefing is designed to end with a practical next step and a clear stopping point, so staying informed does not consume the time you are trying to protect.</p>
        </article>
        <aside class="rounded-3xl border border-stone-200 bg-stone-950 p-6 text-white">
          <p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-300">Read Next</p>
          <div class="mt-4 space-y-4">${navigation.filter(([navKey]) => navKey !== key).slice(0, 3).map(([, label, href]) => `<a href="${href}" class="group block rounded-2xl border border-stone-800 p-4 transition hover:border-red-500"><p class="text-xs font-black uppercase tracking-[0.17em] text-red-300">${label}</p><p class="mt-2 font-display text-xl font-bold leading-tight">More from ${label}</p><p class="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-stone-300 group-hover:text-white">Open ${arrowIcon}</p></a>`).join('')}</div>
        </aside>
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
        <h1 class="mt-4 font-display text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.9] tracking-[-0.055em]">Build your Big News briefing.</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Tell us what you build, what you want to learn, and where you want your career to go. Big News will prioritize the developments that can help you get there.</p>
        <ul class="mt-8 space-y-3 text-sm text-stone-700">
          <li>One focused five-minute daily briefing</li>
          <li>AI, open source, career, and compensation signals</li>
          <li>Clear next steps with links to every original source</li>
        </ul>
      </section>
      <section class="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 class="font-display text-3xl font-black tracking-[-0.04em]">Choose your focus</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <article class="rounded-2xl border border-stone-200 p-4">
            <p class="text-sm font-bold">Build better</p>
            <p class="mt-2 font-display text-3xl font-black">Tools</p>
            <p class="text-xs text-stone-500">AI, GitHub, and projects</p>
          </article>
          <article class="rounded-2xl border-2 border-red-500 bg-red-50 p-4">
            <p class="text-sm font-bold text-red-700">Grow your career</p>
            <p class="mt-2 font-display text-3xl font-black text-red-700">Moves</p>
            <p class="text-xs text-red-700">jobs, skills, and pay</p>
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
  index: 'Big News | Your personal technology briefing',
  subscribe: 'Your Briefing | Big News',
  news: 'AI Radar | Big News',
  city: 'GitHub Pulse | Big News',
  politics: 'Career Moves | Big News',
  culture: 'Pay & Demand | Big News',
  business: 'Build This | Big News',
  sports: 'For You | Big News',
}

document.title = titleMap[pageKey] || 'Big News'

document.querySelector('#app').innerHTML = `
  <div class="min-h-screen bg-stone-50 text-stone-950 selection:bg-red-200">
    ${header(activeSection)}
    ${mainContent}
    ${footer}
  </div>
`

mountSharedNav()
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
