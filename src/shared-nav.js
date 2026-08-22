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
        :host { display:block; position:fixed; inset:0 0 auto; z-index:2147483647; height:52px; color:#ecfdf5; font:500 14px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        * { box-sizing:border-box; }
        .bar { height:52px; display:flex; align-items:center; gap:16px; padding:0 clamp(14px,3vw,32px); background:rgba(2,44,34,.97); border-bottom:1px solid #166534; box-shadow:0 8px 24px rgba(2,44,34,.18); backdrop-filter:blur(14px); }
        .brand { display:flex; align-items:center; gap:9px; color:white; text-decoration:none; font-weight:850; letter-spacing:-.02em; white-space:nowrap; }
        .mark { display:grid; place-items:center; width:28px; height:28px; border-radius:9px; background:#bef264; color:#052e16; font-weight:950; }
        .context { color:#86efac; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
        .spacer { flex:1; }
        button { display:flex; align-items:center; gap:9px; min-height:36px; border:1px solid #15803d; border-radius:11px; padding:0 12px; background:#14532d; color:white; cursor:pointer; font:inherit; font-weight:750; }
        button:hover, button:focus-visible { background:#166534; outline:2px solid #bef264; outline-offset:2px; }
        .grid { width:17px; height:17px; }
        .menu { position:absolute; top:46px; right:clamp(14px,3vw,32px); width:min(360px,calc(100vw - 28px)); max-height:min(520px,calc(100vh - 70px)); overflow:auto; border:1px solid #166534; border-radius:16px; padding:8px; background:#052e16; box-shadow:0 22px 60px rgba(0,0,0,.45); }
        .menu[hidden] { display:none; }
        .heading { padding:10px 11px 12px; color:#86efac; font-size:11px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }
        .app { display:flex; align-items:center; gap:11px; padding:10px 11px; border-radius:11px; color:#dcfce7; text-decoration:none; }
        .app:hover, .app:focus-visible, .app.current { background:#14532d; outline:none; }
        .app.current { box-shadow:inset 3px 0 #bef264; }
        .icon { display:grid; flex:0 0 auto; place-items:center; width:36px; height:36px; border-radius:10px; background:#166534; color:#bbf7d0; font-weight:900; }
        .current .icon { background:#bef264; color:#052e16; }
        .name,.branch { display:block; }
        .name { color:white; font-weight:800; }
        .branch { margin-top:3px; color:#86efac; font-size:11px; }
        .status { padding:14px 11px; color:#86efac; font-size:12px; line-height:1.5; }
        @media (max-width:520px) { .context { display:none; } button span { display:none; } }
      </style>
      <nav class="bar" aria-label="Shared application navigation">
        <a class="brand" href="https://tabloid.${TAILNET}/"><span class="mark">T</span><span>Tabloid</span></a>
        <span class="context">Shared apps</span><span class="spacer"></span>
        <button type="button" aria-expanded="false" aria-controls="shared-app-menu">
          <svg class="grid" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor"><circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/><circle cx="15" cy="3" r="1.5"/><circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/></svg>
          <span>Switch app</span>
        </button>
        <div id="shared-app-menu" class="menu" hidden><div class="heading">Live repository branches</div><div class="status">Open the menu to load branches…</div></div>
      </nav>`

    this.button = root.querySelector('button')
    this.menu = root.querySelector('.menu')
    this.button.addEventListener('click', () => this.toggle())
    document.addEventListener('click', (event) => {
      if (!this.contains(event.target) && !event.composedPath().includes(this)) this.close()
    })
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
      this.menu.innerHTML = `<div class="heading">Live repository branches</div>${apps.map((app) => {
        const current = new URL(app.url).hostname === window.location.hostname
        return `<a class="app${current ? ' current' : ''}" href="${app.url}"><span class="icon">${app.name[0]}</span><span><span class="name">${app.name}</span><span class="branch">${app.branch}${current ? ' · Current' : ''}</span></span></a>`
      }).join('')}`
    } catch {
      this.loaded = false
      this.menu.innerHTML = `<div class="heading">Live repository branches</div><a class="app" href="https://tabloid.${TAILNET}/"><span class="icon">P</span><span><span class="name">Production</span><span class="branch">main</span></span></a><div class="status">New branches could not be loaded. Try again shortly.</div>`
    }
  }
}

if (!customElements.get('tabloid-shared-nav')) customElements.define('tabloid-shared-nav', TabloidSharedNav)

export const mountSharedNav = () => {
  if (document.querySelector('tabloid-shared-nav')) return
  document.body.prepend(document.createElement('tabloid-shared-nav'))
  document.body.style.paddingTop = '52px'
  const fixedSidebar = document.querySelector('#sidebar')
  if (fixedSidebar) fixedSidebar.style.top = '52px'
}
