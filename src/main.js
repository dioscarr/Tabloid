import './style.css'
import { mountSharedNav } from './shared-nav.js'

const icon = (name, className = 'size-5') => {
  const paths = {
    overview: '<path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    activity: '<path d="M3 12h4l3-9 4 18 3-9h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.12-1.28l2-1.55-2-3.46-2.48 1a7 7 0 0 0-2.2-1.28L13.82 3h-4l-.38 2.43a7 7 0 0 0-2.2 1.28l-2.48-1-2 3.46 2 1.55a7 7 0 0 0 0 2.56l-2 1.55 2 3.46 2.48-1a7 7 0 0 0 2.2 1.28l.38 2.43h4l.38-2.43a7 7 0 0 0 2.2-1.28l2.48 1 2-3.46-2-1.55A7 7 0 0 0 19 12Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    google: '<path d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.32 2.98-7.39Z"/><path d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"/><path d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.11-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.53l3.35-2.61Z"/><path d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"/>',
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24" class="${className}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.apps}</svg>`
}

const navItems = [['overview', 'Overview'], ['users', 'Users'], ['apps', 'Applications'], ['workspace', 'Workspaces'], ['shield', 'Roles & access'], ['activity', 'Audit log'], ['settings', 'Settings']]
const users = [
  ['Dioscar Rodriguez', 'dioscarr@gmail.com', 'Owner', 'All applications', 'Active', 'DR'],
  ['Maya Chen', 'maya@example.com', 'Editor', 'Big News, Tech', 'Active', 'MC'],
  ['Jordan Lee', 'jordan@example.com', 'Viewer', 'Tech', 'Invited', 'JL'],
  ['Service · Preview deployer', 'preview-deployer', 'Service', 'Deployments', 'Active', 'PD'],
]
const applications = [
  ['The Daily Echo', 'Production', 'main', '12 users', 'Healthy', 'DE'],
  ['Big News', 'Personal intelligence', 'big-news', '8 users', 'Healthy', 'BN'],
  ['Tech', 'Engineering briefing', 'tech', '6 users', 'Healthy', 'TC'],
]
const applicationUrls = {
  main: 'https://tabloid.tail70b7f1.ts.net/',
  'big-news': 'https://tabloid-big-news-f1a4f4.tail70b7f1.ts.net/',
  tech: 'https://tabloid-tech-fe9bbd.tail70b7f1.ts.net/',
}
const dashboardUrl = 'https://tabloid-dashboard-66cd96.tail70b7f1.ts.net/'

document.title = 'Admin | Application control center'

document.querySelector('#app').innerHTML = `
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <aside id="sidebar" class="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-800 bg-slate-950 lg:flex">
      <div class="flex h-20 items-center gap-3 border-b border-slate-800 px-6"><span class="grid size-10 place-items-center rounded-xl bg-indigo-500 font-black text-white shadow-lg shadow-indigo-500/25">A</span><div><p class="font-bold tracking-tight">Admin</p><p class="text-xs text-slate-500">Application control center</p></div></div>
      <nav class="flex-1 space-y-1 p-4" aria-label="Administration">${navItems.map(([key, label], index) => `<button data-view="${key}" class="nav-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${index === 0 ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}">${icon(key)}<span>${label}</span></button>`).join('')}</nav>
      <div class="m-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div class="flex items-center gap-2 text-xs font-bold text-emerald-400"><span class="size-2 rounded-full bg-emerald-400"></span>Identity design ready</div><p class="mt-2 text-xs leading-5 text-slate-500">Google SSO requires authentik and OAuth credentials before activation.</p></div>
    </aside>

    <div class="lg:pl-72">
      <header class="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur-xl sm:px-7">
        <div class="flex items-center gap-3"><button id="sidebar-button" class="grid size-10 place-items-center rounded-xl border border-slate-800 lg:hidden" aria-label="Open navigation">${icon('apps')}</button><div><p class="text-xs font-semibold text-slate-500">Workspace</p><h1 id="page-title" class="text-lg font-bold tracking-tight">Overview</h1></div></div>
        <div class="flex items-center gap-2 sm:gap-3">
          <label class="relative hidden md:block"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">${icon('search', 'size-4')}</span><span class="sr-only">Search</span><input class="w-64 rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-slate-600 focus:border-indigo-500" placeholder="Search users and apps" /></label>
          <button class="relative grid size-10 place-items-center rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white" aria-label="Notifications">${icon('bell')}<span class="absolute right-2 top-2 size-2 rounded-full bg-rose-500"></span></button>
          <div class="relative"><button id="profile-button" class="flex items-center gap-2 rounded-xl border border-slate-800 p-1.5 pr-3 hover:bg-slate-900" aria-expanded="false"><span class="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-600 text-xs font-black">DR</span><span class="hidden text-left sm:block"><span class="block text-xs font-bold">Dioscar</span><span class="block text-[0.65rem] text-slate-500">Owner</span></span></button><div id="profile-menu" class="absolute right-0 top-12 hidden w-64 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl"><div class="border-b border-slate-800 px-3 py-3"><p class="text-sm font-bold">Dioscar Rodriguez</p><p class="mt-1 text-xs text-slate-500">dioscarr@gmail.com</p></div><a class="mt-2 block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800" href="#profile">Profile & preferences</a><a class="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-slate-800" href="#security">Security</a><button class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10">Sign out</button></div></div>
        </div>
      </header>

      <main class="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:py-9">
        <section id="overview-section" class="scroll-mt-24 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-sm font-semibold text-indigo-400">Good morning, Dioscar</p><h2 class="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Your applications are under control.</h2><p class="mt-2 text-sm text-slate-500">Manage identity, access, and activity from one place.</p></div><div class="flex gap-2"><button id="google-button" class="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100">${icon('google')} Configure Google</button><button class="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400">${icon('plus')} Invite user</button></div></section>

        <section class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">${[['Users', '24', '+3 this month', 'users', 'indigo'], ['Applications', '3', 'All operational', 'apps', 'emerald'], ['Active sessions', '11', 'Across 4 devices', 'activity', 'sky'], ['Access alerts', '1', 'Review recommended', 'shield', 'amber']].map(([label, value, note, iconName]) => `<article class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div class="flex items-start justify-between"><div><p class="text-sm font-semibold text-slate-500">${label}</p><p class="mt-3 text-3xl font-black tracking-tight">${value}</p></div><span class="grid size-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-400">${icon(iconName)}</span></div><p class="mt-3 text-xs text-slate-500">${note}</p></article>`).join('')}</section>

        <section id="users-section" class="mt-6 scroll-mt-24 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
          <article class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"><div class="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h3 class="font-bold">Users</h3><p class="mt-1 text-xs text-slate-500">Identity and application access</p></div><button class="text-xs font-bold text-indigo-400 hover:text-indigo-300">View all</button></div><div class="overflow-x-auto"><table class="w-full min-w-[700px] text-left"><thead class="text-[0.65rem] uppercase tracking-[0.14em] text-slate-600"><tr><th class="px-5 py-3">User</th><th class="px-4 py-3">Role</th><th class="px-4 py-3">Access</th><th class="px-4 py-3">Status</th><th class="px-5 py-3"></th></tr></thead><tbody class="divide-y divide-slate-800">${users.map(([name, email, role, access, status, initials]) => `<tr class="hover:bg-slate-800/35"><td class="px-5 py-4"><div class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-xl bg-slate-800 text-xs font-black text-slate-300">${initials}</span><span><span class="block text-sm font-semibold">${name}</span><span class="block text-xs text-slate-500">${email}</span></span></div></td><td class="px-4 py-4 text-sm text-slate-300">${role}</td><td class="px-4 py-4 text-sm text-slate-400">${access}</td><td class="px-4 py-4"><span class="rounded-full px-2.5 py-1 text-xs font-bold ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}">${status}</span></td><td class="px-5 py-4 text-right"><button class="text-slate-500 hover:text-white" aria-label="Open ${name}">${icon('chevron', 'size-4')}</button></td></tr>`).join('')}</tbody></table></div></article>
          <aside id="roles-access" class="scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900/60"><div class="border-b border-slate-800 px-5 py-4"><h3 class="font-bold">Security posture</h3><p class="mt-1 text-xs text-slate-500">Recommended next steps</p></div><div class="space-y-3 p-4"><div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><div class="flex gap-3"><span class="mt-0.5 text-amber-400">${icon('shield')}</span><div><p class="text-sm font-bold">Google SSO is not configured</p><p class="mt-1 text-xs leading-5 text-slate-500">Connect Google through the central identity provider before protecting applications.</p><button class="mt-3 text-xs font-bold text-amber-400">Review setup →</button></div></div></div><div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p class="text-sm font-bold">Require MFA for owners</p><p class="mt-1 text-xs leading-5 text-slate-500">Enforce a second factor for privileged accounts and recovery actions.</p></div><div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p class="text-sm font-bold">Review service access</p><p class="mt-1 text-xs leading-5 text-slate-500">The preview deployer token was last used twelve minutes ago.</p></div></div></aside>
        </section>

        <section id="applications-section" class="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"><div class="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h3 class="font-bold">Applications</h3><p class="mt-1 text-xs text-slate-500">Open an application or inspect its operational statistics.</p></div><button class="inline-flex items-center gap-1 text-xs font-bold text-indigo-400">${icon('plus', 'size-4')} Register app</button></div><div class="grid gap-px bg-slate-800 md:grid-cols-3">${applications.map(([name, description, branch, usersCount, status, initials]) => `<article class="group bg-slate-900 p-5 transition hover:bg-slate-800/80"><div class="flex items-start justify-between"><span class="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/10 text-sm font-black text-indigo-300">${initials}</span><span class="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-400">${status}</span></div><h4 class="mt-5 font-bold">${name}</h4><p class="mt-1 text-xs text-slate-500">${description}</p><div class="mt-5 flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-500"><span>${usersCount}</span><span class="font-mono">${branch}</span></div><div class="mt-4 grid grid-cols-2 gap-2"><a href="${applicationUrls[branch]}" target="_blank" rel="noreferrer" class="rounded-xl bg-indigo-500 px-3 py-2.5 text-center text-xs font-bold text-white hover:bg-indigo-400">Open site</a><a href="${dashboardUrl}?app=${encodeURIComponent(branch)}#app-detail" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-700 px-3 py-2.5 text-center text-xs font-bold text-slate-300 hover:bg-slate-800">View stats</a></div></article>`).join('')}</div></section>

        <section id="branches-workspaces" class="mt-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"><div class="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="font-bold">Branches & workspaces</h3><p class="mt-1 text-xs text-slate-500">Open any branch in its own isolated VS Code worktree and safely remove preview infrastructure.</p></div><button id="refresh-branches" class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">Refresh</button></div><div id="branch-manager" class="p-5"><p class="text-sm text-slate-500">Connecting to the private Admin worker…</p></div></section>

        <section id="audit-log" class="mt-6 scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900/60"><div class="border-b border-slate-800 px-5 py-4"><h3 class="font-bold">Audit log</h3><p class="mt-1 text-xs text-slate-500">Recent control-plane activity</p></div><div class="divide-y divide-slate-800 px-5">${[['Branch inventory refreshed', 'Admin worker', 'Just now'], ['Static deployments reconciled', 'Preview deployer', '5 minutes ago'], ['Workspace access verified', 'Tailscale identity', '18 minutes ago']].map(([event, source, time]) => `<div class="grid gap-1 py-4 sm:grid-cols-[1fr_12rem_8rem]"><p class="text-sm font-semibold">${event}</p><p class="text-xs text-slate-500">${source}</p><p class="text-xs text-slate-600 sm:text-right">${time}</p></div>`).join('')}</div></section>

        <section id="settings-section" class="mt-6 scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900/60"><div class="border-b border-slate-800 px-5 py-4"><h3 class="font-bold">Settings</h3><p class="mt-1 text-xs text-slate-500">Platform defaults and private endpoints</p></div><div class="grid gap-4 p-5 md:grid-cols-3"><div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p class="text-xs font-bold uppercase tracking-wider text-slate-500">Preview cadence</p><p class="mt-2 font-bold">Every 5 minutes</p></div><div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p class="text-xs font-bold uppercase tracking-wider text-slate-500">Workspace host</p><p class="mt-2 font-mono text-sm text-slate-300">dio:8443</p></div><div class="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><p class="text-xs font-bold uppercase tracking-wider text-slate-500">Access</p><p class="mt-2 font-bold text-emerald-400">Private tailnet</p></div></div></section>
      </main>
    </div>

    <div id="setup-dialog" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><section class="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"><div class="flex items-start justify-between"><div><span class="grid size-11 place-items-center rounded-xl bg-white text-slate-900">${icon('google')}</span><h2 class="mt-5 text-2xl font-black tracking-tight">Connect Google identity</h2></div><button id="close-dialog" class="grid size-9 place-items-center rounded-xl bg-slate-800 text-slate-400" aria-label="Close">×</button></div><p class="mt-3 text-sm leading-6 text-slate-400">The interface is ready, but secure sign-in requires a Google OAuth client and a running authentik identity service. Secrets will be stored server-side—not in this browser bundle.</p><div class="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-6 text-slate-400"><p>1. Deploy authentik privately</p><p>2. Create a Google OAuth client</p><p>3. Register each application as an OIDC client</p><p>4. Apply groups and access policies</p></div><button id="understood-button" class="mt-5 w-full rounded-xl bg-indigo-500 py-3 text-sm font-bold hover:bg-indigo-400">Understood</button></section></div>
    <div id="workspace-dialog" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><section class="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"><div class="flex items-start justify-between"><div><p class="text-xs font-black uppercase tracking-[0.16em] text-indigo-400">New workspace</p><h2 class="mt-2 text-2xl font-black tracking-tight">Open the repo in VS Code</h2></div><button id="close-workspace-dialog" class="grid size-9 place-items-center rounded-xl bg-slate-800 text-slate-400" aria-label="Close">×</button></div><div class="mt-6 grid gap-4 sm:grid-cols-2"><label class="text-xs font-bold text-slate-400 sm:col-span-2">Repository<input value="dioscarr/Tabloid" readonly class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-300" /></label><label class="text-xs font-bold text-slate-400">Branch<select class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"><option>admin</option><option>tech</option><option>big-news</option><option>main</option></select></label><label class="text-xs font-bold text-slate-400">Resource preset<select class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"><option>Small · 2 CPU / 4 GB</option><option>Medium · 4 CPU / 8 GB</option></select></label><label class="text-xs font-bold text-slate-400">Workspace name<input value="admin-feature" class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm" /></label><label class="text-xs font-bold text-slate-400">Expires<select class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"><option>24 hours</option><option>8 hours</option><option>72 hours</option></select></label><label class="text-xs font-bold text-slate-400 sm:col-span-2">Environment profile<select class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm"><option>Branch default · generated automatically</option><option>Frontend development · public variables only</option><option>Backend development · approved secret references</option></select><span class="mt-2 block font-normal leading-5 text-slate-500">Branch URL, API path, and auth URL are generated after checkout. Secrets remain server-side.</span></label></div><div class="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-200">The provisioning API is documented but not deployed yet. Creating a workspace will be enabled after the authenticated orchestration worker and GitHub App are configured.</div><button id="workspace-understood" class="mt-5 w-full rounded-xl bg-indigo-500 py-3 text-sm font-bold hover:bg-indigo-400">Review implementation plan</button></section></div>
  </div>
`

const profileButton = document.querySelector('#profile-button')
mountSharedNav()
const profileMenu = document.querySelector('#profile-menu')
profileButton?.addEventListener('click', () => {
  const open = profileButton.getAttribute('aria-expanded') === 'true'
  profileButton.setAttribute('aria-expanded', String(!open))
  profileMenu?.classList.toggle('hidden', open)
})

const sidebar = document.querySelector('#sidebar')
document.querySelector('#sidebar-button')?.addEventListener('click', () => sidebar?.classList.toggle('hidden'))
const viewTargets = { overview: 'overview-section', users: 'users-section', apps: 'applications-section', workspace: 'branches-workspaces', shield: 'roles-access', activity: 'audit-log', settings: 'settings-section' }
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((nav) => { nav.className = 'nav-item flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 transition hover:bg-slate-900 hover:text-white' })
  item.className = 'nav-item flex w-full items-center gap-3 rounded-xl bg-indigo-500/15 px-3 py-3 text-sm font-semibold text-indigo-300 transition'
  document.querySelector('#page-title').textContent = item.textContent.trim()
  document.querySelector(`#${viewTargets[item.dataset.view]}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (window.innerWidth < 1024) sidebar?.classList.add('hidden')
}))

const dialog = document.querySelector('#setup-dialog')
const closeDialog = () => { dialog?.classList.add('hidden'); dialog?.classList.remove('flex') }
document.querySelector('#google-button')?.addEventListener('click', () => { dialog?.classList.remove('hidden'); dialog?.classList.add('flex') })
document.querySelector('#close-dialog')?.addEventListener('click', closeDialog)
document.querySelector('#understood-button')?.addEventListener('click', closeDialog)

const workspaceDialog = document.querySelector('#workspace-dialog')
const closeWorkspaceDialog = () => { workspaceDialog?.classList.add('hidden'); workspaceDialog?.classList.remove('flex') }
document.querySelector('#close-workspace-dialog')?.addEventListener('click', closeWorkspaceDialog)
const announce = (message, tone = 'info') => {
  const notice = document.createElement('div')
  notice.setAttribute('role', 'status')
  notice.className = `fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl ${tone === 'success' ? 'border-emerald-500/30 bg-emerald-950 text-emerald-200' : 'border-indigo-500/30 bg-indigo-950 text-indigo-200'}`
  notice.textContent = message
  document.body.append(notice)
  window.setTimeout(() => notice.remove(), 5000)
}

document.querySelector('#workspace-understood')?.addEventListener('click', () => {
  closeWorkspaceDialog()
  announce('Workspace request queued. Provisioning will begin when the Admin API is connected.')
})

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  if (!dialog?.classList.contains('hidden')) closeDialog()
  if (!workspaceDialog?.classList.contains('hidden')) closeWorkspaceDialog()
})

const branchManager = document.querySelector('#branch-manager')
const workerBase = 'https://dio.tail70b7f1.ts.net:9443/api/v1'
const workerRequest = async (path, options = {}) => {
  const response = await fetch(`${workerBase}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Admin worker returned ${response.status}`)
  return payload
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

const renderBranches = (branches) => {
  branchManager.innerHTML = `<div class="grid gap-3">${branches.map((branch) => `
    <article class="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h4 class="truncate font-mono text-sm font-bold">${escapeHtml(branch.branch)}</h4><span class="rounded-full px-2 py-1 text-[0.65rem] font-bold ${branch.appContainer ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}">${branch.staticHosting ? 'Static deployment' : branch.appContainer ? 'Preview running' : 'No preview'}</span><span class="rounded-full px-2 py-1 text-[0.65rem] font-bold ${branch.workspace ? 'bg-indigo-500/10 text-indigo-300' : 'bg-slate-800 text-slate-400'}">${branch.workspace ? 'Workspace ready' : 'Workspace not prepared'}</span></div><p class="mt-2 text-xs text-slate-500">${[branch.staticHosting ? 'shared gateway' : branch.appContainer && 'app', branch.tailscaleContainer && 'Tailscale', branch.network && 'network', branch.volume && 'state volume'].filter(Boolean).join(' · ') || 'No Podman resources'}</p></div>
      <div class="flex flex-wrap gap-2"><a href="${branch.appUrl}" target="_blank" rel="noreferrer" class="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">Open app</a>${branch.workspace ? `<a href="${branch.vscodeUrl}" target="_blank" rel="noreferrer" class="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-400">Open VS Code</a>` : `<button data-workspace="${encodeURIComponent(branch.branch)}" class="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-400">Prepare VS Code</button>`}${branch.branch === 'main' ? '' : `<button data-remove="${encodeURIComponent(branch.branch)}" data-purge="${branch.volume && !branch.appContainer ? 'true' : 'false'}" class="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10">${branch.volume && !branch.appContainer ? 'Purge storage' : 'Remove preview'}</button>`}</div>
    </article>`).join('')}</div>`
}

const loadBranches = async () => {
  branchManager.innerHTML = '<p class="text-sm text-slate-500">Loading branches and Podman inventory…</p>'
  try { renderBranches((await workerRequest('/branches')).branches) }
  catch (error) { branchManager.innerHTML = `<div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200"><p class="font-bold">Admin worker is unavailable</p><p class="mt-2 text-xs leading-5 text-amber-200/70">${error.message}. Start the localhost worker and Tailscale Serve endpoint to enable branch actions.</p></div>` }
}

document.querySelector('#refresh-branches')?.addEventListener('click', loadBranches)
branchManager?.addEventListener('click', async (event) => {
  const workspaceButton = event.target.closest('[data-workspace]')
  if (workspaceButton) {
    const editorWindow = window.open('about:blank', '_blank')
    if (editorWindow) editorWindow.opener = null
    workspaceButton.disabled = true
    workspaceButton.textContent = 'Preparing…'
    try {
      const result = await workerRequest(`/branches/${workspaceButton.dataset.workspace}/workspace`, { method: 'POST' })
      if (editorWindow) editorWindow.location.replace(result.vscodeUrl)
      else announce('Workspace ready. Click Open VS Code to launch it.')
      announce(`VS Code workspace is ready for ${result.branch}.`, 'success')
      await loadBranches()
    } catch (error) { editorWindow?.close(); announce(error.message); workspaceButton.disabled = false; workspaceButton.textContent = 'Retry workspace' }
    return
  }
  const removeButton = event.target.closest('[data-remove]')
  if (!removeButton) return
  const branch = decodeURIComponent(removeButton.dataset.remove)
  const purge = removeButton.dataset.purge === 'true'
  const phrase = purge ? `Permanently remove the retained state volume for ${branch}?` : `Stop and remove the preview resources for ${branch}? The state volume will be retained for recovery.`
  if (!window.confirm(phrase)) return
  removeButton.disabled = true
  try {
    await workerRequest(`/branches/${removeButton.dataset.remove}/preview?purgeVolume=${purge}`, { method: 'DELETE' })
    announce(`${branch} cleanup completed.`, 'success')
    await loadBranches()
  } catch (error) { announce(error.message); removeButton.disabled = false }
})

loadBranches()
