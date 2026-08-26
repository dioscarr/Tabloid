import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'

const arrowIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>`
const appsIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-5" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="10" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>`

const navigation = [
  ['news', 'News', 'news.html'],
  ['city', 'City', 'city.html'],
  ['politics', 'Politics', 'politics.html'],
  ['culture', 'Culture', 'culture.html'],
  ['business', 'Business', 'business.html'],
  ['sports', 'Sports', 'sports.html'],
]

const frontStories = [
  ['politics.html', 'Politics', 'Senate vote sparks a late-night showdown over the transit bill.', '18 min ago'],
  ['culture.html', 'Culture', 'Neighborhood theaters stage a comeback with midnight screenings and live jazz.', '32 min ago'],
  ['business.html', 'Business', 'Startup founders chase a new wave of green manufacturing jobs.', '1 hr ago'],
]

const features = [
  ['culture.html', 'Lifestyle', 'Inside the rooftop gardens turning empty lots into community hubs.', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85', 'lg:col-span-2'],
  ['city.html', 'Science', 'Researchers track a surprising rebound in urban bird populations.', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=85', ''],
  ['sports.html', 'Travel', 'Weekend escapes worth the train ride, from coastal towns to mountain inns.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', ''],
]

const sectionPages = {
  news: {
    title: 'Latest News',
    kicker: 'Top Stories',
    headline: 'Major transit expansion approved after six-hour council debate.',
    deck: 'The vote unlocks the first phase of crosstown stations, new protected bike corridors, and a seven-year budget plan tied to ridership goals.',
    byline: 'By Omar Levin · Updated 11:05 AM',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['City Hall', 'Public comment opens Monday for station naming and accessibility design reviews.'],
      ['Transit', 'Night service frequency will increase by 23% by next spring.'],
      ['Neighborhoods', 'Construction mitigation grants announced for small storefronts.'],
    ],
  },
  city: {
    title: 'City Desk',
    kicker: 'Metro Briefing',
    headline: 'Waterfront redesign moves into permits with expanded public housing set-asides.',
    deck: 'Planning officials introduced revised zoning language that reserves 28% of new units for affordable housing and adds two new school sites.',
    byline: 'By Hannah Wu · Updated 10:22 AM',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Housing', 'Three nonprofit developers selected for mixed-income parcels.'],
      ['Public Works', 'Stormwater tunnels to be completed before high-rise construction starts.'],
      ['Community', 'Residents request tree canopy guarantees in final approvals.'],
    ],
  },
  politics: {
    title: 'Politics',
    kicker: 'State & Local',
    headline: 'Coalition leaders negotiate education package as budget deadline closes in.',
    deck: 'Talks continue over teacher retention bonuses, school modernization, and district transparency requirements before Friday midnight.',
    byline: 'By Iris Patel · Updated 9:48 AM',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Legislature', 'Compromise language on class-size targets expected this afternoon.'],
      ['Campaigns', 'Mayor and council blocs clash over infrastructure earmarks.'],
      ['Policy', 'Independent fiscal office projects 4.2% revenue growth next year.'],
    ],
  },
  culture: {
    title: 'Culture',
    kicker: 'Arts & Ideas',
    headline: 'Midtown theaters return with sold-out late shows and neighborhood pop-ups.',
    deck: 'A coalition of performers, venue owners, and schools is turning dormant stages into year-round programming for students and night audiences.',
    byline: 'By Leo Grant · Updated 8:57 AM',
    image: 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Theater', 'Five venues announce discounted weekday passes.'],
      ['Music', 'Jazz residencies expand to riverfront parks through October.'],
      ['Film', 'Restored cinema reopens with documentary festival lineup.'],
    ],
  },
  business: {
    title: 'Business',
    kicker: 'Markets & Work',
    headline: 'Green manufacturing startups secure fresh capital and warehouse space.',
    deck: 'Founders say demand for battery components and heat-pump parts is accelerating hiring, with three industrial corridors now near full occupancy.',
    byline: 'By Renata Cole · Updated 10:41 AM',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Labor', 'Technical apprenticeship program adds 1,200 seats this year.'],
      ['Finance', 'Community banks launch low-interest climate equipment loans.'],
      ['Retail', 'Independent shops report strongest summer foot traffic since 2019.'],
    ],
  },
  sports: {
    title: 'Sports',
    kicker: 'Game Day',
    headline: 'River City FC extends unbeaten run as academy players spark late comeback.',
    deck: 'A 92nd-minute winner capped a second-half rally, putting the club atop the table and deepening calls for stadium transit upgrades.',
    byline: 'By Max Rivera · Updated 11:16 AM',
    image: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1500&q=88',
    updates: [
      ['Football', 'Coach confirms captain fit for weekend derby fixture.'],
      ['Basketball', 'City Hoops signs veteran point guard on one-year deal.'],
      ['Youth', 'Public school track finals draw record attendance.'],
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
      <a href="index.html" class="font-display text-xl font-black tracking-tight sm:text-2xl" aria-label="The Daily Echo home">The Daily Echo<span class="text-emerald-300">.</span></a>
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
        <a href="subscribe.html" class="hidden rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-white sm:inline-flex">Subscribe</a>
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
        <p class="font-display text-2xl font-black">The Daily Echo<span class="text-red-600">.</span></p>
        <p class="mt-1 text-sm text-stone-500">Truth in a noisy world.</p>
      </div>
      <form class="flex w-full max-w-md gap-2" aria-label="Newsletter subscription">
        <label class="sr-only" for="email">Email address</label>
        <input id="email" type="email" placeholder="you@example.com" class="min-w-0 flex-1 rounded-full border border-stone-300 bg-stone-50 px-5 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100" />
        <button type="submit" class="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">Join free</button>
      </form>
    </div>
  </footer>
`

const homePage = `
  <main>
    <section class="mx-auto max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-14 lg:pb-16">
      <div class="mb-8 flex flex-wrap items-center justify-between gap-3 border-y border-stone-300 py-3 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-stone-500"><span>Thursday, August 21, 2026</span><span>Independent city journalism · Vol. 42 No. 18</span></div>
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.7fr)] lg:gap-12">
        <article>
          <div class="mb-5 flex items-center gap-3 text-xs font-black uppercase tracking-[0.18em] text-red-600"><span class="h-px w-10 bg-red-600"></span> Front Page</div>
          <h1 class="max-w-5xl font-display text-[clamp(3rem,7vw,6.9rem)] font-black leading-[0.91] tracking-[-0.06em] text-balance">A waterfront reborn—and a city divided.</h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">The redevelopment package promises public parks, a transit link, and a new skyline. Residents are split between optimism and skepticism.</p>
          <div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"><span class="font-bold">By Mara Delgado</span><span class="text-stone-400">8 min read</span><span class="text-stone-400">Updated 9:42 AM</span></div>
        </article>
        <aside class="divide-y divide-stone-200 border-y border-stone-300 lg:border-t-0">
          ${frontStories.map(([href, category, title, time]) => `<a href="${href}" class="group block py-5 first:lg:pt-0"><div class="mb-2 flex items-center justify-between text-[0.68rem] font-black uppercase tracking-[0.16em] text-red-600"><span>${category}</span><span class="font-semibold tracking-normal text-stone-400">${time}</span></div><h2 class="font-display text-xl font-bold leading-tight tracking-[-0.025em] transition group-hover:text-red-600 sm:text-2xl">${title}</h2></a>`).join('')}
        </aside>
      </div>
      <figure class="group relative mt-10 overflow-hidden rounded-[1.75rem] bg-stone-900 shadow-2xl shadow-stone-900/10">
        <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=90" alt="Modern city skyline beside the waterfront" class="h-[420px] w-full object-cover transition duration-700 group-hover:scale-[1.02] sm:h-[560px]" />
        <div class="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent"></div>
        <figcaption class="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white sm:flex-row sm:items-end sm:justify-between sm:p-9"><p class="max-w-xl text-sm leading-6 text-stone-200">The proposed waterfront district would connect three neighborhoods through nine acres of public space.</p><span class="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-stone-300">Photo · Elias Chen</span></figcaption>
      </figure>
    </section>

    <section class="border-y border-red-200 bg-red-50" aria-label="Breaking news"><div class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-8"><span class="w-fit rounded-full bg-red-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white">Breaking</span><p class="text-sm font-semibold leading-6 sm:text-base">Power grid upgrades announced as heat wave threatens record demand across the metro area.</p><a href="news.html" class="ml-auto flex shrink-0 items-center gap-1 text-sm font-bold text-red-700 hover:text-red-900">Follow live ${arrowIcon}</a></div></section>

    <section class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <div class="mb-9 flex items-end justify-between gap-6"><div><p class="eyebrow">Ideas & living</p><h2 class="section-title">Beyond the headlines</h2></div><a href="culture.html" class="hidden items-center gap-2 text-sm font-bold hover:text-red-600 sm:flex">View all stories ${arrowIcon}</a></div>
      <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        ${features.map(([href, category, title, image, size], index) => `<a href="${href}" class="story-card group ${size}"><div class="overflow-hidden rounded-2xl bg-stone-200 ${index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}"><img src="${image}" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><div class="pt-5"><p class="eyebrow">${category}</p><h3 class="mt-2 font-display font-bold leading-tight tracking-[-0.03em] transition group-hover:text-red-600 ${index === 0 ? 'text-3xl sm:text-4xl' : 'text-2xl'}">${title}</h3><p class="mt-3 text-sm text-stone-400">5 min read</p></div></a>`).join('')}
      </div>
    </section>

    <section class="bg-stone-950 text-white"><div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:py-24"><div><p class="eyebrow text-red-400">The city, in motion</p><h2 class="mt-3 max-w-md font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">What else is moving the city.</h2><p class="mt-6 max-w-md leading-7 text-stone-400">A concise briefing on the stories shaping daily life, delivered every weekday.</p></div><div class="divide-y divide-stone-800 border-y border-stone-800">${[['city.html', 'Metro', 'Commuters brace for fare changes as regional rail expands service.'], ['politics.html', 'Schools', 'Parents push for longer library hours after literacy program gains traction.'], ['business.html', 'Food', 'Local chefs turn historic storefronts into late-night dining destinations.']].map(([href, category, title], index) => `<a href="${href}" class="group grid grid-cols-[2rem_1fr_auto] items-center gap-4 py-7 sm:grid-cols-[3rem_1fr_auto]"><span class="font-display text-lg text-stone-600">0${index + 1}</span><span><span class="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-400">${category}</span><span class="font-display text-xl font-bold leading-tight sm:text-2xl">${title}</span></span><span class="rounded-full border border-stone-700 p-3 transition group-hover:border-red-500 group-hover:bg-red-600">${arrowIcon}</span></a>`).join('')}</div></div></section>

    <section class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24"><div class="grid overflow-hidden rounded-[2rem] bg-amber-100 lg:grid-cols-[0.7fr_1.3fr]"><div class="flex min-h-64 items-end bg-[linear-gradient(135deg,#ef4444,#991b1b)] p-8 text-white sm:p-12"><div><p class="text-xs font-black uppercase tracking-[0.2em] text-red-100">Opinion</p><p class="mt-3 font-display text-3xl font-black">The Editorial Board</p></div></div><blockquote class="flex flex-col justify-center p-8 sm:p-12 lg:p-16"><p class="font-display text-4xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 sm:text-5xl">“We should build for people first, not for headlines.”</p><footer class="mt-6 max-w-xl leading-7 text-stone-600">From zoning reform to public transit, the next chapter of the city will be decided in the details.</footer></blockquote></div></section>
  </main>
`

const sectionTemplate = (key) => {
  const page = sectionPages[key]
  if (!page) {
    return `
      <main class="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8">
        <p class="eyebrow">Not found</p>
        <h1 class="mt-4 font-display text-5xl font-black tracking-[-0.05em]">This page is missing.</h1>
        <p class="mt-5 text-stone-600">Go back to the home page for the full Daily Echo edition.</p>
        <a href="index.html" class="mt-8 inline-flex rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white hover:bg-red-600">Back home</a>
      </main>
    `
  }

  return `
    <main>
      <section class="mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-8 sm:pt-14">
        <div class="mb-7 flex flex-wrap items-center justify-between gap-3 border-y border-stone-300 py-3 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-stone-500"><span>${page.title}</span><span>Updated newsroom report</span></div>
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
            <h2 class="font-display text-3xl font-black tracking-[-0.04em]">Live Updates</h2>
            <div class="mt-6 divide-y divide-stone-200">${page.updates.map(([tag, story]) => `<article class="py-4 first:pt-0"><p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-600">${tag}</p><p class="mt-2 text-sm leading-6 text-stone-700">${story}</p></article>`).join('')}</div>
          </aside>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-6 px-5 pb-16 sm:px-8 lg:grid-cols-3 lg:pb-24">
        <article class="rounded-3xl border border-stone-200 bg-white p-6 lg:col-span-2">
          <p class="eyebrow">Analysis</p>
          <h2 class="mt-3 font-display text-4xl font-black leading-[0.95] tracking-[-0.04em]">Why this story matters right now.</h2>
          <p class="mt-4 leading-7 text-stone-600">Citywide decisions around housing, mobility, and culture are converging at once. Leaders are trading speed for consultation, while residents push for clearer timelines and measurable outcomes.</p>
          <p class="mt-4 leading-7 text-stone-600">Our reporters are tracking milestones, budget shifts, and public comments so each update is tied to decisions that affect streets, schools, and jobs.</p>
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
        <p class="eyebrow">Support independent reporting</p>
        <h1 class="mt-4 font-display text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.9] tracking-[-0.055em]">Subscribe to The Daily Echo.</h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-stone-600">Members fund accountability journalism, neighborhood coverage, and accessible public-interest reporting across the city.</p>
        <ul class="mt-8 space-y-3 text-sm text-stone-700">
          <li>Daily AM and PM briefings</li>
          <li>Weekend investigations and explainers</li>
          <li>Member-only Q&A with our reporting team</li>
        </ul>
      </section>
      <section class="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <h2 class="font-display text-3xl font-black tracking-[-0.04em]">Choose your plan</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <article class="rounded-2xl border border-stone-200 p-4">
            <p class="text-sm font-bold">Monthly</p>
            <p class="mt-2 font-display text-3xl font-black">$6</p>
            <p class="text-xs text-stone-500">per month</p>
          </article>
          <article class="rounded-2xl border-2 border-red-500 bg-red-50 p-4">
            <p class="text-sm font-bold text-red-700">Annual</p>
            <p class="mt-2 font-display text-3xl font-black text-red-700">$60</p>
            <p class="text-xs text-red-700">save 16%</p>
          </article>
        </div>
        <form class="mt-6 space-y-3" aria-label="Subscription form">
          <label class="block text-sm font-semibold" for="subscriber-email">Email address</label>
          <input id="subscriber-email" type="email" placeholder="you@example.com" class="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
          <button type="submit" class="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600">Continue to checkout</button>
        </form>
      </section>
    </div>
  </main>
`

const dashboardPage = `<main class="tailadmin-app"><aside class="tailadmin-sidebar"><div class="tailadmin-brand"><span class="brand-mark">T</span><span>Tabloid</span></div><button class="workspace-switcher" type="button">Daily Echo <span>⌄</span></button><nav aria-label="Workspace"><p>Account</p><a class="active" href="#settings">Settings</a><a href="#account">Account</a><a href="#billing">Credit and Billing</a><a href="#personalization">Personalization</a><p>Features</p><a href="#system">System</a></nav><div class="sidebar-user"><span class="avatar">DE</span><span><b>Daily Echo</b><small>Administrator</small></span></div></aside><section class="tailadmin-content"><header class="tailadmin-topbar"><button type="button" class="mobile-menu">☰</button><span>Account</span><button type="button" class="profile-button">Daily Echo ▾</button></header><div class="settings-wrap"><div class="settings-heading"><div><p class="dashboard-kicker">Account</p><h1>Settings</h1><p>Manage your workspace preferences and account configuration.</p></div><button type="button" class="dashboard-primary" data-dashboard-action="save">Save changes</button></div><div class="settings-tabs"><a class="selected" href="#general">General</a><a href="#billing">Credit and Billing</a><a href="#personalization">Personalization</a></div><form class="settings-form"><section><h2>General</h2><p>Update the details used across your workspace.</p><label>Workspace name<input value="Daily Echo" /></label><label>Workspace URL<input value="daily-echo" /></label></section><section><h2>Notifications</h2><p>Choose how your team receives newsroom updates.</p><label class="toggle-row"><span><b>Email notifications</b><small>Receive editorial and system alerts by email.</small></span><input type="checkbox" checked /></label><label class="toggle-row"><span><b>Weekly digest</b><small>A weekly summary of publishing activity.</small></span><input type="checkbox" checked /></label></section></form></div></section></main>`
let mainContent = pageKey === 'index' ? dashboardPage : homePage
let activeSection = 'news'

if (pageKey === 'subscribe') {
  mainContent = subscribePage
  activeSection = ''
} else if (pageKey !== 'index') {
  mainContent = sectionTemplate(pageKey)
  activeSection = pageKey
}

const titleMap = {
  index: 'The Daily Echo',
  subscribe: 'Subscribe | The Daily Echo',
  news: 'News | The Daily Echo',
  city: 'City | The Daily Echo',
  politics: 'Politics | The Daily Echo',
  culture: 'Culture | The Daily Echo',
  business: 'Business | The Daily Echo',
  sports: 'Sports | The Daily Echo',
}

document.title = pageKey === 'index' ? 'Dashboard | The Daily Echo' : (titleMap[pageKey] || 'The Daily Echo')

document.querySelector('#app').innerHTML = `
  <div class="min-h-screen bg-stone-50 text-stone-950 selection:bg-red-200">
    ${header(activeSection)}
    ${mainContent}
    ${footer}
  </div>
`

mountSharedNav()

document.querySelector('[data-dashboard-action]')?.addEventListener('click', (event) => { event.currentTarget.textContent = 'Report workspace ready' })
initializeContentAdapter('production')
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


