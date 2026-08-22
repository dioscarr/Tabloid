const REPOSITORY = 'dioscarr/Tabloid'
const TAILNET = 'tail70b7f1.ts.net'

const previewId = async (branch) => {
  let slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'branch'
  slug = slug.slice(0, 38).replace(/-$/, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(branch))
  const hash = [...new Uint8Array(digest)].slice(0, 3).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${slug}-${hash}`
}

const branchLabel = (branch) => branch === 'main'
  ? 'Production'
  : branch.split(/[\/_-]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')

const branchUrl = async (branch) => branch === 'main'
  ? `https://tabloid.${TAILNET}/`
  : `https://tabloid-${await previewId(branch)}.${TAILNET}/`

class TabloidSharedNav extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host { display:block; position:fixed; inset:0 0 auto; z-index:2147483647; height:44px; color:#e2e8f0; font:500 14px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        * { box-sizing:border-box; }
        .bar { height:44px; display:flex; align-items:center; gap:10px; padding:0 clamp(10px,2vw,22px); background:rgba(9,14,24,.96); border-bottom:1px solid rgba(148,163,184,.18); box-shadow:0 5px 18px rgba(2,6,23,.22); backdrop-filter:blur(18px); }
        .launcher { display:grid; place-items:center; width:32px; height:32px; border:0; border-radius:9px; padding:0; background:transparent; color:#cbd5e1; }
        .launcher:hover,.launcher:focus-visible { background:#1e293b; color:white; }
        .brand { display:flex; align-items:center; gap:8px; color:#f8fafc; text-decoration:none; font-weight:780; letter-spacing:-.015em; white-space:nowrap; }
        .divider { width:1px; height:18px; background:#334155; }
        .current-label { color:#94a3b8; font-size:12px; font-weight:650; }
        .spacer { flex:1; }
        button { cursor:pointer; font:inherit; }
        button:focus-visible,.app:focus-visible { outline:2px solid #a3e635; outline-offset:2px; }
        .grid { width:17px; height:17px; }
        .menu { position:absolute; top:50px; left:clamp(10px,2vw,22px); width:min(420px,calc(100vw - 20px)); max-height:min(560px,calc(100vh - 66px)); overflow:auto; border:1px solid #334155; border-radius:20px; padding:10px; background:#0f172a; box-shadow:0 24px 70px rgba(2,6,23,.62); }
        .menu[hidden] { display:none; }
        .menu-head { display:flex; align-items:center; justify-content:space-between; padding:9px 10px 14px; }
        .heading { color:#f8fafc; font-size:15px; font-weight:850; letter-spacing:-.01em; }
        .subheading { margin-top:4px; color:#64748b; font-size:11px; }
        .repo { color:#94a3b8; font-size:11px; text-decoration:none; }
        .repo:hover { color:#bef264; }
        .apps { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
        .app { position:relative; display:flex; align-items:center; gap:11px; min-width:0; padding:12px; border:1px solid transparent; border-radius:14px; color:#e2e8f0; text-decoration:none; transition:background .15s,border-color .15s,transform .15s; }
        .app:hover { transform:translateY(-1px); border-color:#334155; background:#1e293b; }
        .app.current { border-color:#4d7c0f; background:linear-gradient(145deg,rgba(77,124,15,.27),rgba(30,41,59,.76)); }
        .icon { display:grid; flex:0 0 auto; place-items:center; width:42px; height:42px; border-radius:13px; background:linear-gradient(145deg,#334155,#1e293b); color:#cbd5e1; font-size:15px; font-weight:900; box-shadow:inset 0 1px rgba(255,255,255,.06); }
        .current .icon { background:linear-gradient(145deg,#bef264,#84cc16); color:#1a2e05; }
        .name,.branch { display:block; }
        .name { overflow:hidden; color:#f8fafc; font-size:13px; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
        .branch { overflow:hidden; margin-top:4px; color:#64748b; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
        .dot { position:absolute; top:10px; right:10px; width:7px; height:7px; border-radius:50%; background:#a3e635; box-shadow:0 0 0 3px rgba(163,230,53,.12); }
        .status { padding:16px 11px; color:#94a3b8; font-size:12px; line-height:1.5; }
        @media (max-width:520px) { .current-label,.divider { display:none; } .apps { grid-template-columns:1fr; } }
      </style>
      <nav class="bar" aria-label="Shared application navigation">
        <button class="launcher" type="button" aria-label="Open app switcher" aria-expanded="false" aria-controls="shared-app-menu">
          <svg class="grid" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor"><circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/><circle cx="15" cy="3" r="1.5"/><circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/></svg>
        </button>
        <a class="brand" href="https://tabloid.${TAILNET}/">Tabloid</a><span class="divider"></span><span class="current-label">Applications</span><span class="spacer"></span>
        <div id="shared-app-menu" class="menu" hidden><div class="status">Loading applications…</div></div>
      </nav>`

    this.button = root.querySelector('button')
    this.menu = root.querySelector('.menu')
    this.button.addEventListener('click', () => this.toggle())
    document.addEventListener('click', (event) => {
      if (!this.contains(event.target) && !event.composedPath().includes(this)) this.close()
    })
    this.loadBranches()
  }

  async toggle() {
    const opening = this.menu.hidden
    this.menu.hidden = !opening
    this.button.setAttribute('aria-expanded', String(opening))
    if (opening && !this.loaded) await this.loadBranches()
  }

  close() {
    if (!this.menu) return
    this.menu.hidden = true
    this.button.setAttribute('aria-expanded', 'false')
  }

  async loadBranches() {
    this.loaded = true
    try {
      const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/branches?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } })
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
      const branches = (await response.json()).map(({ name }) => name).sort((a, b) => a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b))
      const apps = await Promise.all(branches.map(async (branch) => ({ branch, name: branchLabel(branch), url: await branchUrl(branch) })))
      const currentApp = apps.find((app) => new URL(app.url).hostname === window.location.hostname)
      rootLabel(this.shadowRoot, currentApp?.name || 'Applications')
      this.menu.innerHTML = `<div class="menu-head"><div><div class="heading">Switch application</div><div class="subheading">Live branches in your repository</div></div><a class="repo" href="https://github.com/${REPOSITORY}/branches" target="_blank" rel="noreferrer">Manage branches ↗</a></div><div class="apps">${apps.map((app) => {
        const current = new URL(app.url).hostname === window.location.hostname
        return `<a class="app${current ? ' current' : ''}" href="${app.url}"><span class="icon">${app.name[0]}</span><span><span class="name">${app.name}</span><span class="branch">${app.branch}</span></span>${current ? '<span class="dot" title="Current application"></span>' : ''}</a>`
      }).join('')}</div>`
    } catch {
      this.loaded = false
      this.menu.innerHTML = `<div class="heading">Live repository branches</div><a class="app" href="https://tabloid.${TAILNET}/"><span class="icon">P</span><span><span class="name">Production</span><span class="branch">main</span></span></a><div class="status">New branches could not be loaded. Try again shortly.</div>`
    }
  }
}

const rootLabel = (root, label) => {
  const element = root?.querySelector('.current-label')
  if (element) element.textContent = label
}

if (!customElements.get('tabloid-shared-nav')) customElements.define('tabloid-shared-nav', TabloidSharedNav)

export const mountSharedNav = () => {
  if (document.querySelector('tabloid-shared-nav')) return
  document.body.prepend(document.createElement('tabloid-shared-nav'))
  document.body.style.paddingTop = '44px'
  const fixedSidebar = document.querySelector('#sidebar')
  if (fixedSidebar) fixedSidebar.style.top = '44px'
}
