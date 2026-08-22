import './style.css'

const arrowIcon = `<svg aria-hidden="true" viewBox="0 0 20 20" class="size-4" fill="none"><path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>`

const stories = [
  ['Politics', 'Senate vote sparks a late-night showdown over the transit bill.', '18 min ago'],
  ['Culture', 'Neighborhood theaters stage a comeback with midnight screenings and live jazz.', '32 min ago'],
  ['Business', 'Startup founders chase a new wave of green manufacturing jobs.', '1 hr ago'],
]

const features = [
  ['Lifestyle', 'Inside the rooftop gardens turning empty lots into community hubs.', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=85', 'lg:col-span-2'],
  ['Science', 'Researchers track a surprising rebound in urban bird populations.', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=85', ''],
  ['Travel', 'Weekend escapes worth the train ride, from coastal towns to mountain inns.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', ''],
]

document.querySelector('#app').innerHTML = `
  <div class="min-h-screen bg-stone-50 text-stone-950 selection:bg-red-200">
    <header class="sticky top-0 z-50 border-b border-stone-200/90 bg-stone-50/90 backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#top" class="font-display text-xl font-black tracking-tight sm:text-2xl" aria-label="The Daily Echo home">The Daily Echo<span class="text-red-600">.</span></a>
        <nav class="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          ${['News', 'City', 'Politics', 'Culture', 'Business', 'Sports'].map((item, index) => `<a href="#${item.toLowerCase()}" class="text-sm font-semibold transition hover:text-red-600 ${index === 0 ? 'text-red-600' : 'text-stone-600'}">${item}</a>`).join('')}
        </nav>
        <div class="flex items-center gap-2">
          <button class="icon-button" type="button" aria-label="Search"><svg aria-hidden="true" viewBox="0 0 24 24" class="size-5" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
          <button id="menu-button" class="icon-button md:hidden" type="button" aria-label="Open navigation" aria-expanded="false"><svg aria-hidden="true" viewBox="0 0 24 24" class="size-5" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
          <a href="#subscribe" class="hidden rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 sm:inline-flex">Subscribe</a>
        </div>
      </div>
      <nav id="mobile-nav" class="hidden border-t border-stone-200 px-5 py-4 md:hidden" aria-label="Mobile navigation"><div class="mx-auto grid max-w-7xl grid-cols-2 gap-2">${['News', 'City', 'Politics', 'Culture', 'Business', 'Sports'].map(item => `<a href="#${item.toLowerCase()}" class="rounded-xl px-4 py-3 text-sm font-semibold hover:bg-stone-100">${item}</a>`).join('')}</div></nav>
    </header>

    <main id="top">
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
            ${stories.map(([category, title, time]) => `<a href="#" class="group block py-5 first:lg:pt-0"><div class="mb-2 flex items-center justify-between text-[0.68rem] font-black uppercase tracking-[0.16em] text-red-600"><span>${category}</span><span class="font-semibold tracking-normal text-stone-400">${time}</span></div><h2 class="font-display text-xl font-bold leading-tight tracking-[-0.025em] transition group-hover:text-red-600 sm:text-2xl">${title}</h2></a>`).join('')}
          </aside>
        </div>
        <figure class="group relative mt-10 overflow-hidden rounded-[1.75rem] bg-stone-900 shadow-2xl shadow-stone-900/10">
          <img src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1800&q=90" alt="Modern city skyline beside the waterfront" class="h-[420px] w-full object-cover transition duration-700 group-hover:scale-[1.02] sm:h-[560px]" />
          <div class="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-transparent to-transparent"></div>
          <figcaption class="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white sm:flex-row sm:items-end sm:justify-between sm:p-9"><p class="max-w-xl text-sm leading-6 text-stone-200">The proposed waterfront district would connect three neighborhoods through nine acres of public space.</p><span class="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-stone-300">Photo · Elias Chen</span></figcaption>
        </figure>
      </section>

      <section class="border-y border-red-200 bg-red-50" aria-label="Breaking news"><div class="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-8"><span class="w-fit rounded-full bg-red-600 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white">Breaking</span><p class="text-sm font-semibold leading-6 sm:text-base">Power grid upgrades announced as heat wave threatens record demand across the metro area.</p><a href="#" class="ml-auto flex shrink-0 items-center gap-1 text-sm font-bold text-red-700 hover:text-red-900">Follow live ${arrowIcon}</a></div></section>

      <section id="culture" class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div class="mb-9 flex items-end justify-between gap-6"><div><p class="eyebrow">Ideas & living</p><h2 class="section-title">Beyond the headlines</h2></div><a href="#" class="hidden items-center gap-2 text-sm font-bold hover:text-red-600 sm:flex">View all stories ${arrowIcon}</a></div>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          ${features.map(([category, title, image, size], index) => `<article class="story-card group ${size}"><div class="overflow-hidden rounded-2xl bg-stone-200 ${index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}"><img src="${image}" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div><div class="pt-5"><p class="eyebrow">${category}</p><h3 class="mt-2 font-display font-bold leading-tight tracking-[-0.03em] transition group-hover:text-red-600 ${index === 0 ? 'text-3xl sm:text-4xl' : 'text-2xl'}">${title}</h3><p class="mt-3 text-sm text-stone-400">5 min read</p></div></article>`).join('')}
        </div>
      </section>

      <section id="news" class="bg-stone-950 text-white"><div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:py-24"><div><p class="eyebrow text-red-400">The city, in motion</p><h2 class="mt-3 max-w-md font-display text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">What else is moving the city.</h2><p class="mt-6 max-w-md leading-7 text-stone-400">A concise briefing on the stories shaping daily life, delivered every weekday.</p></div><div class="divide-y divide-stone-800 border-y border-stone-800">${[['Metro', 'Commuters brace for fare changes as regional rail expands service.'], ['Schools', 'Parents push for longer library hours after literacy program gains traction.'], ['Food', 'Local chefs turn historic storefronts into late-night dining destinations.']].map(([category, title], index) => `<a href="#" class="group grid grid-cols-[2rem_1fr_auto] items-center gap-4 py-7 sm:grid-cols-[3rem_1fr_auto]"><span class="font-display text-lg text-stone-600">0${index + 1}</span><span><span class="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.18em] text-red-400">${category}</span><span class="font-display text-xl font-bold leading-tight sm:text-2xl">${title}</span></span><span class="rounded-full border border-stone-700 p-3 transition group-hover:border-red-500 group-hover:bg-red-600">${arrowIcon}</span></a>`).join('')}</div></div></section>

      <section class="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24"><div class="grid overflow-hidden rounded-[2rem] bg-amber-100 lg:grid-cols-[0.7fr_1.3fr]"><div class="flex min-h-64 items-end bg-[linear-gradient(135deg,#ef4444,#991b1b)] p-8 text-white sm:p-12"><div><p class="text-xs font-black uppercase tracking-[0.2em] text-red-100">Opinion</p><p class="mt-3 font-display text-3xl font-black">The Editorial Board</p></div></div><blockquote class="flex flex-col justify-center p-8 sm:p-12 lg:p-16"><p class="font-display text-4xl font-black leading-[1.02] tracking-[-0.045em] text-stone-950 sm:text-5xl">“We should build for people first, not for headlines.”</p><footer class="mt-6 max-w-xl leading-7 text-stone-600">From zoning reform to public transit, the next chapter of the city will be decided in the details.</footer></blockquote></div></section>
    </main>

    <footer id="subscribe" class="border-t border-stone-200 bg-white"><div class="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between"><div><p class="font-display text-2xl font-black">The Daily Echo<span class="text-red-600">.</span></p><p class="mt-1 text-sm text-stone-500">Truth in a noisy world.</p></div><form class="flex w-full max-w-md gap-2" aria-label="Newsletter subscription"><label class="sr-only" for="email">Email address</label><input id="email" type="email" placeholder="you@example.com" class="min-w-0 flex-1 rounded-full border border-stone-300 bg-stone-50 px-5 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100" /><button type="submit" class="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">Join free</button></form></div></footer>
  </div>
`

const menuButton = document.querySelector('#menu-button')
const mobileNav = document.querySelector('#mobile-nav')

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true'
  menuButton.setAttribute('aria-expanded', String(!isOpen))
  menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation')
  mobileNav.classList.toggle('hidden', isOpen)
})

document.querySelector('form').addEventListener('submit', (event) => event.preventDefault())
