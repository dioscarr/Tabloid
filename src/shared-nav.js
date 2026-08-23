const REPOSITORY = 'dioscarr/Tabloid'
const TAILNET = 'tail70b7f1.ts.net'
const BRAIN_API = `https://tabloid-brain-api.${TAILNET}`
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])

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
        :host { display:inline-block; position:relative; z-index:60; color:#e2e8f0; font:500 14px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        * { box-sizing:border-box; }
        .launcher { display:grid; place-items:center; width:40px; height:40px; border:1px solid rgba(148,163,184,.22); border-radius:12px; padding:0; background:rgba(15,23,42,.38); color:inherit; }
        .launcher:hover,.launcher:focus-visible { background:rgba(51,65,85,.55); color:white; }
        button { cursor:pointer; font:inherit; }
        button:focus-visible,.app:focus-visible { outline:2px solid #a3e635; outline-offset:2px; }
        .grid { width:17px; height:17px; }
        .menu { position:absolute; top:48px; right:0; width:min(420px,calc(100vw - 24px)); max-height:min(560px,calc(100vh - 78px)); overflow:auto; border:1px solid #334155; border-radius:20px; padding:10px; background:#0f172a; color:#e2e8f0; box-shadow:0 24px 70px rgba(2,6,23,.62); }
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
        @media (max-width:520px) { .apps { grid-template-columns:1fr; } .menu { position:fixed; top:60px; right:12px; left:12px; width:auto; } }
      </style>
      <button class="launcher" type="button" aria-label="Switch application" aria-expanded="false" aria-controls="shared-app-menu">
        <svg class="grid" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor"><circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/><circle cx="15" cy="3" r="1.5"/><circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="15" r="1.5"/></svg>
      </button>
      <div id="shared-app-menu" class="menu" hidden><div class="status">Loading applications…</div></div>`

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
      const sources = await Promise.allSettled([
        fetch(`${BRAIN_API}/api/v1/apps`).then(async (response) => {
          if (!response.ok) throw new Error(`Brain returned ${response.status}`)
          return (await response.json()).apps.map(({ branch }) => branch)
        }),
        fetch(`https://api.github.com/repos/${REPOSITORY}/branches?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } }).then(async (response) => {
          if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
          return (await response.json()).map(({ name }) => name)
        })
      ])
      const branches = [...new Set(sources.flatMap((source) => source.status === 'fulfilled' ? source.value : []))]
      if (!branches.length) throw new Error('No application source is available.')
      branches.sort((a, b) => a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b))
      const apps = await Promise.all(branches.map(async (branch) => ({ branch, name: branchLabel(branch), url: await branchUrl(branch) })))
      this.menu.innerHTML = `<div class="menu-head"><div><div class="heading">Switch application</div><div class="subheading">Live branches in your repository</div></div><button class="repo studio-launch" type="button">Brain Studio ✦</button></div><div class="apps">${apps.map((app) => {
        const current = new URL(app.url).hostname === window.location.hostname
        return `<a class="app${current ? ' current' : ''}" href="${app.url}"><span class="icon">${escapeHtml(app.name[0])}</span><span><span class="name">${escapeHtml(app.name)}</span><span class="branch">${escapeHtml(app.branch)}</span></span>${current ? '<span class="dot" title="Current application"></span>' : ''}</a>`
      }).join('')}</div><a class="status" style="display:block;text-decoration:none" href="https://github.com/${REPOSITORY}/branches" target="_blank" rel="noreferrer">Manage repository branches ↗</a>`
      this.menu.querySelector('.studio-launch')?.addEventListener('click', () => {
        this.close()
        document.querySelector('tabloid-brain-studio')?.open()
      })
    } catch {
      this.loaded = false
      this.menu.innerHTML = `<div class="heading">Live repository branches</div><a class="app" href="https://tabloid.${TAILNET}/"><span class="icon">P</span><span><span class="name">Production</span><span class="branch">main</span></span></a><div class="status">New branches could not be loaded. Try again shortly.</div>`
    }
  }
}

class TabloidBrainStudio extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>
      :host{position:fixed;z-index:100;inset:0;display:none;font:500 14px/1.45 ui-sans-serif,system-ui;color:#e2e8f0}:host([open]){display:block}.backdrop{position:absolute;inset:0;border:0;background:#020617c9;backdrop-filter:blur(8px)}.panel{position:absolute;top:12px;right:12px;bottom:12px;width:min(520px,calc(100vw - 24px));overflow:auto;border:1px solid #334155;border-radius:24px;background:#0f172a;box-shadow:0 30px 90px #020617;padding:24px}.head{display:flex;justify-content:space-between;gap:20px}.eyebrow{color:#a3e635;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}h2{margin:5px 0 0;font-size:25px}.close{width:38px;height:38px;border:1px solid #334155;border-radius:11px;background:#1e293b;color:white;font-size:20px}.note{margin:18px 0;padding:12px;border:1px solid #a3e63530;border-radius:12px;background:#a3e6350b;color:#cbd5e1;font-size:12px}label{display:block;margin-top:16px;color:#94a3b8;font-size:11px;font-weight:800}select,textarea{width:100%;margin-top:7px;border:1px solid #334155;border-radius:12px;background:#020617;color:white;padding:12px;font:inherit}textarea{min-height:120px;resize:vertical}.generate{width:100%;margin-top:18px;border:0;border-radius:13px;background:#a3e635;color:#1a2e05;padding:13px;font-weight:900}.generate:disabled{opacity:.55}.result{margin-top:18px;border:1px solid #334155;border-radius:16px;background:#020617;padding:16px}.result[hidden]{display:none}.result h3{margin:0 0 12px}.field{padding:10px 0;border-top:1px solid #1e293b}.field:first-of-type{border:0}.field small,.field strong{display:block}.field small{color:#64748b;text-transform:uppercase;font-size:9px}.field strong{margin-top:5px;color:#f8fafc}.status{margin-top:12px;color:#94a3b8;font-size:11px}
    </style><button class="backdrop" aria-label="Close Brain Studio"></button><section class="panel" role="dialog" aria-modal="true" aria-labelledby="brain-studio-title"><div class="head"><div><div class="eyebrow">Private AI workspace</div><h2 id="brain-studio-title">Brain Studio</h2></div><button class="close" aria-label="Close">×</button></div><div class="note">Generate a reviewable proposal for this application. Brain cannot publish without a separate human approval.</div><div class="status loading">Loading this app's content contract…</div><form hidden><label>Content surface<select name="surface"></select></label><label>What should Brain create or improve?<textarea name="intent" required placeholder="Make the homepage hero clearer, warmer, and focused on saving time…"></textarea></label><button class="generate">Generate proposal ✦</button></form><div class="result" hidden aria-live="polite"></div></section>`
    root.querySelectorAll('.close,.backdrop').forEach((button) => button.addEventListener('click', () => this.close()))
    root.querySelector('form').addEventListener('submit', (event) => this.generate(event))
  }

  async open() {
    this.setAttribute('open', '')
    const root = this.shadowRoot
    const status = root.querySelector('.loading')
    const form = root.querySelector('form')
    const result = root.querySelector('.result')
    result.hidden = true
    form.hidden = true
    status.textContent = 'Loading this app’s content contract…'
    try {
      const response = await fetch('/app.contract.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('This branch has not adopted the Brain contract yet.')
      this.contract = await response.json()
      const surfaces = this.contract.content?.surfaces || []
      if (!surfaces.length) throw new Error('This app has no editable content surfaces.')
      root.querySelector('[name=surface]').innerHTML = surfaces.map(({ id, label }) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join('')
      status.textContent = `${this.contract.app.name} · ${surfaces.length} editable surface${surfaces.length === 1 ? '' : 's'}`
      form.hidden = false
    } catch (error) { status.textContent = error.message }
  }

  close() { this.removeAttribute('open') }

  async generate(event) {
    event.preventDefault()
    const root = this.shadowRoot
    const button = root.querySelector('.generate')
    const result = root.querySelector('.result')
    button.disabled = true
    button.textContent = 'Brain is working…'
    result.hidden = false
    result.innerHTML = '<div class="status">Discovering tools and generating a structured proposal…</div>'
    try {
      const response = await fetch(`${BRAIN_API}/api/v1/content/proposals`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ appId: this.contract.app.id, surfaceId: root.querySelector('[name=surface]').value, intent: root.querySelector('[name=intent]').value }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || `Brain returned ${response.status}`)
      const proposal = payload.content?.proposal || payload.content || {}
      result.innerHTML = `<h3>Proposal ready</h3>${Object.entries(proposal).map(([field, value]) => `<div class="field"><small>${escapeHtml(field)}</small><strong>${escapeHtml(Array.isArray(value) ? value.join(', ') : value)}</strong></div>`).join('')}<div class="status">Proposal ${escapeHtml(payload.id)} · Not published</div>`
    } catch (error) { result.innerHTML = `<h3>Generation unavailable</h3><div class="status">${escapeHtml(error.message)}</div>` }
    finally { button.disabled = false; button.textContent = 'Generate proposal ✦' }
  }
}

if (!customElements.get('tabloid-shared-nav')) customElements.define('tabloid-shared-nav', TabloidSharedNav)
if (!customElements.get('tabloid-brain-studio')) customElements.define('tabloid-brain-studio', TabloidBrainStudio)

export const mountSharedNav = () => {
  if (!document.querySelector('tabloid-brain-studio')) document.body.append(document.createElement('tabloid-brain-studio'))
  if (document.querySelector('tabloid-shared-nav')) return
  const sharedNav = document.createElement('tabloid-shared-nav')
  const explicitSlot = document.querySelector('[data-shared-nav-slot]')
  if (explicitSlot) {
    explicitSlot.append(sharedNav)
    return
  }
  const legacyLauncher = document.querySelector('#apps-button')?.parentElement
  if (legacyLauncher) {
    legacyLauncher.replaceWith(sharedNav)
    return
  }
  const profileControl = document.querySelector('#profile-button')?.parentElement
  if (profileControl) {
    profileControl.before(sharedNav)
    return
  }
  document.body.prepend(sharedNav)
}
