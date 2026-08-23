import './style.css'
import { mountSharedNav } from './shared-nav.js'

const glyph = (name) => ({ overview: '▦', apps: '◈', resources: '≡', activity: '∿', settings: '⚙' }[name])
const nav = [['overview', 'Overview'], ['apps', 'Applications'], ['resources', 'Resources'], ['activity', 'Activity'], ['settings', 'Settings']]
const metrics = [
  ['Running containers', '12', 'Across 6 previews', '+2 today'],
  ['Memory in use', '4.9 GB', '3.1 GB from WSL', '61% of budget'],
  ['Healthy routes', '6 / 6', 'Tailscale HTTPS', '100% available'],
  ['Build success', '96%', 'Last 30 builds', '+4.2% this week'],
]
const services = [
  ['Admin', 'admin', 'Healthy', '2 containers', '100.108.194.18'],
  ['Big News', 'big-news', 'Healthy', '2 containers', 'Private URL'],
  ['Tech', 'tech', 'Healthy', '2 containers', 'Private URL'],
  ['Dashboard', 'dashboard', 'Deploying', '2 containers', 'Private URL'],
]
const events = [
  ['Preview reconciled', 'admin', 'Image pulled and containers restarted', '2 min ago', 'bg-emerald-300'],
  ['Workflow completed', 'dashboard', 'Branch preview image published', '6 min ago', 'bg-emerald-300'],
  ['Workspace prepared', 'admin', 'Worktree and environment generated', '18 min ago', 'bg-cyan-300'],
  ['Memory threshold', 'host', 'WSL usage crossed 3 GB', '1 hr ago', 'bg-amber-300'],
]

document.title = 'System Dashboard | Tabloid'
document.querySelector('#app').innerHTML = `
  <div class="min-h-screen bg-[#071019] text-slate-100 selection:bg-cyan-300/30">
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 bg-[#09131e] xl:block">
      <div class="flex h-20 items-center gap-3 border-b border-white/10 px-6"><span class="grid size-10 place-items-center rounded-xl bg-cyan-300 font-black text-slate-950">S</span><div><p class="font-black">System</p><p class="text-xs text-slate-500">Operations dashboard</p></div></div>
      <nav class="space-y-1 p-4" aria-label="Dashboard sections">${nav.map(([key, label], index) => `<a href="#${key}" class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${index ? 'text-slate-500 hover:bg-white/5 hover:text-white' : 'bg-cyan-300/10 text-cyan-200'}"><span class="w-5 text-center">${glyph(key)}</span>${label}</a>`).join('')}</nav>
      <div class="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-white/[.025] p-4"><div class="flex items-center gap-2 text-xs font-bold text-emerald-300"><span class="size-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]"></span>Private control plane</div><p class="mt-2 text-xs text-slate-500">Tailscale access · local execution</p></div>
    </aside>
    <div class="xl:pl-64">
      <header class="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#071019]/90 px-5 backdrop-blur-xl sm:px-8"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Control plane</p><h1 class="mt-1 text-lg font-black">Environment overview</h1></div><div class="flex items-center gap-3"><span data-shared-nav-slot class="inline-flex"></span><button class="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 sm:block">Last 24 hours</button><span class="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-xs font-black text-slate-950">DR</span></div></header>
      <main class="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
        <section id="overview" class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p class="text-sm font-bold text-emerald-300">All critical systems operational</p><h2 class="mt-2 max-w-3xl text-4xl font-black tracking-[-.045em] sm:text-5xl">See the whole system.<br/><span class="text-slate-500">Act before it slows you down.</span></h2><p class="mt-4 max-w-2xl text-sm leading-6 text-slate-400">One private view of branch deployments, Podman resources, GitHub delivery, Tailscale routing, and development workspaces.</p></div><button class="w-fit rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Refresh live data</button></section>
        <section class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">${metrics.map(([label, value, detail, trend]) => `<article class="rounded-2xl border border-white/10 bg-white/[.035] p-5"><p class="text-sm font-semibold text-slate-500">${label}</p><p class="mt-5 text-3xl font-black">${value}</p><div class="mt-3 flex justify-between text-xs"><span class="text-slate-500">${detail}</span><span class="text-slate-300">${trend}</span></div></article>`).join('')}</section>
        <section class="mt-6 grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
          <article id="resources" class="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><div class="flex justify-between"><div><h3 class="font-black">Resource pressure</h3><p class="mt-1 text-xs text-slate-500">Observed usage with a seven-day projection</p></div><span class="h-fit rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-300">Within budget</span></div><div class="mt-8 grid h-56 grid-cols-12 items-end gap-2 border-b border-l border-white/10 px-3 pt-4">${[35,42,39,47,44,53,58,55,62,67,64,72].map((height, index) => `<div class="rounded-t-md ${index > 8 ? 'bg-cyan-300/30' : 'bg-cyan-300'}" style="height:${height}%" title="${height}%"></div>`).join('')}</div><div class="mt-3 flex justify-between text-[.65rem] font-bold uppercase tracking-widest text-slate-600"><span>12 hours ago</span><span>Now</span><span>Projection</span></div><div class="mt-6 grid gap-3 sm:grid-cols-3">${[['CPU', '18%', 'Low'], ['Memory', '61%', 'Moderate'], ['Disk', '34%', 'Low']].map(([name, value, status]) => `<div class="rounded-xl bg-black/20 p-4"><div class="flex justify-between text-xs"><strong>${name}</strong><span class="text-slate-500">${status}</span></div><div class="mt-3 h-1.5 rounded-full bg-white/10"><div class="h-full rounded-full bg-cyan-300" style="width:${value}"></div></div><p class="mt-2 text-right text-xs font-bold">${value}</p></div>`).join('')}</div></article>
          <aside class="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><h3 class="font-black">Capacity forecast</h3><p class="mt-1 text-xs text-slate-500">Planning signal, not a guarantee</p><div class="mt-7 grid place-items-center"><div class="grid size-40 place-items-center rounded-full bg-[conic-gradient(#67e8f9_0_61%,#172334_61%)]"><div class="grid size-32 place-items-center rounded-full bg-[#0c1722] text-center"><span><strong class="block text-3xl">9 days</strong><small class="text-slate-500">to 75% memory</small></span></div></div></div><div class="mt-7 space-y-3 text-xs">${[['Projected previews','9'],['Estimated memory','6.1 GB'],['Confidence','Medium']].map(([a,b]) => `<div class="flex justify-between rounded-xl bg-black/20 p-3"><span class="text-slate-500">${a}</span><strong>${b}</strong></div>`).join('')}</div></aside>
        </section>
        <section id="apps" class="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"><div class="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h3 class="font-black">Applications & branches</h3><p class="mt-1 text-xs text-slate-500">Runtime, delivery, and private routing status</p></div><span class="text-xs font-bold text-cyan-300">Manage in Admin →</span></div><div class="overflow-x-auto"><table class="w-full min-w-[740px] text-left text-sm"><thead class="text-[.65rem] uppercase tracking-[.15em] text-slate-600"><tr><th class="px-5 py-3">Application</th><th class="px-4 py-3">Branch</th><th class="px-4 py-3">Health</th><th class="px-4 py-3">Runtime</th><th class="px-5 py-3">Route</th></tr></thead><tbody class="divide-y divide-white/10">${services.map(([name, branch, status, runtime, route]) => `<tr><td class="px-5 py-4 font-bold">${name}</td><td class="px-4 py-4 font-mono text-xs text-slate-400">${branch}</td><td class="px-4 py-4 text-xs font-bold ${status === 'Healthy' ? 'text-emerald-300' : 'text-amber-300'}">● ${status}</td><td class="px-4 py-4 text-xs text-slate-400">${runtime}</td><td class="px-5 py-4 text-xs text-slate-400">${route}</td></tr>`).join('')}</tbody></table></div></section>
        <section id="activity" class="mt-6 rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6"><h3 class="font-black">System activity</h3><p class="mt-1 text-xs text-slate-500">Build, deploy, routing, and workspace events</p><div class="mt-5 divide-y divide-white/10">${events.map(([title, source, detail, time, tone]) => `<article class="grid gap-3 py-4 sm:grid-cols-[12rem_1fr_auto] sm:items-center"><div class="flex items-center gap-3"><span class="size-2 rounded-full ${tone}"></span><strong class="text-sm">${title}</strong></div><p class="text-xs text-slate-500"><span class="mr-2 rounded bg-white/5 px-2 py-1 font-mono">${source}</span>${detail}</p><time class="text-xs text-slate-600">${time}</time></article>`).join('')}</div></section>
        <p class="mt-6 text-center text-xs text-slate-600">Prototype data · Live adapters and retention are specified in the implementation handoff.</p>
      </main>
    </div>
  </div>`

mountSharedNav()
