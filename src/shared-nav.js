const REPOSITORY = 'dioscarr/Tabloid'
const TAILNET = 'tail70b7f1.ts.net'
const BRAIN_API = `https://tabloid-brain-api.${TAILNET}`
const AUTHZ_API = `https://tabloid-authorization-ca5839.${TAILNET}`
const VIBE_URL = `https://tabloid-vibe.${TAILNET}`
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
const APP_LOGOS = Object.freeze({
  main: 'daily-echo',
  admin: 'admin',
  api: 'admin',
  'app-gallery': 'gallery',
  'big-news': 'big-news',
  tech: 'tech',
  dashboard: 'dashboard',
  brain: 'brain',
  Authorization: 'authorization',
  'ai-news': 'ai-news',
  'apps/big-news-dr': 'astropaper',
})

const appLogo = (branch, name) => {
  const logo = APP_LOGOS[branch]
  if (!logo) return `<span class="icon monogram" aria-hidden="true">${escapeHtml(name[0] || '?')}</span>`
  return `<span class="icon logo logo-${logo}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><use href="/app-icons.svg#${logo}"></use></svg></span>`
}

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
        .menu-actions { display:flex; align-items:center; gap:10px; }
        .repo { border:0; padding:0; background:none; color:#94a3b8; font-size:11px; text-decoration:none; }
        .repo:hover { color:#bef264; }
        .apps { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; }
        .app { position:relative; display:flex; align-items:center; gap:11px; min-width:0; padding:12px; border:1px solid transparent; border-radius:14px; color:#e2e8f0; text-decoration:none; transition:background .15s,border-color .15s,transform .15s; }
        .app:hover { transform:translateY(-1px); border-color:#334155; background:#1e293b; }
        .app.current { border-color:#4d7c0f; background:linear-gradient(145deg,rgba(77,124,15,.27),rgba(30,41,59,.76)); }
        .icon { display:grid; flex:0 0 auto; place-items:center; width:42px; height:42px; border-radius:13px; background:linear-gradient(145deg,#334155,#1e293b); color:#cbd5e1; font-size:15px; font-weight:900; box-shadow:inset 0 1px rgba(255,255,255,.06); }
        .icon svg { width:23px; height:23px; fill:none; stroke:currentColor; stroke-linecap:round; stroke-linejoin:round; stroke-width:1.9; }
        .logo-daily-echo { background:linear-gradient(145deg,#e2e8f0,#94a3b8); color:#0f172a; }
        .logo-admin,.logo-authorization { background:linear-gradient(145deg,#c4b5fd,#7c3aed); color:#1e1b4b; }
        .logo-gallery { background:linear-gradient(145deg,#f9a8d4,#ec4899); color:#500724; }
        .logo-big-news { background:linear-gradient(145deg,#fb7185,#e11d48); color:#4c0519; }
        .logo-tech { background:linear-gradient(145deg,#67e8f9,#0891b2); color:#083344; }
        .logo-dashboard { background:linear-gradient(145deg,#a5f3fc,#06b6d4); color:#083344; }
        .logo-brain { background:linear-gradient(145deg,#c4b5fd,#8b5cf6); color:#2e1065; }
        .logo-ai-news { background:linear-gradient(145deg,#fde68a,#f59e0b); color:#451a03; }
        .logo-astropaper { background:linear-gradient(145deg,#fef3c7,#fb923c); color:#431407; }
        .current .icon { box-shadow:0 0 0 2px #bef264, inset 0 1px rgba(255,255,255,.18); }
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
          return (await response.json()).apps.map(({ id, name, branch }) => ({ id, name, branch }))
        })
      ])
      const discovered = sources.flatMap((source) => source.status === 'fulfilled' ? source.value : [])
      const appMap = new Map([{ id: 'app-gallery', name: 'App Gallery', branch: 'app-gallery' }, ...discovered].map((app) => [app.branch, app]))
      const apps = await Promise.all([...appMap.values()]
        .sort((a, b) => a.branch === 'main' ? -1 : b.branch === 'main' ? 1 : a.branch.localeCompare(b.branch))
        .map(async (app) => ({ ...app, id: app.id || app.branch, name: app.name || branchLabel(app.branch), url: await branchUrl(app.branch) })))
      if (!apps.length) throw new Error('No application source is available.')
      const currentApp = apps.find((app) => new URL(app.url).hostname === window.location.hostname)
      const vibeHref = currentApp ? `${VIBE_URL}/?model=${encodeURIComponent(`vibe-${currentApp.id}`)}&q=${encodeURIComponent(`Help me improve ${currentApp.name}. Start by understanding this app and ask what I want to change.`)}` : VIBE_URL
      this.menu.innerHTML = `<div class="menu-head"><div><div class="heading">Switch application</div><div class="subheading">Live branches in your repository</div></div><div class="menu-actions"><a class="repo vibe-launch" href="${vibeHref}">Vibe ✦</a><button class="repo studio-launch" type="button">Brain Studio</button></div></div><div class="apps">${apps.map((app) => {
        const current = new URL(app.url).hostname === window.location.hostname
        return `<a class="app${current ? ' current' : ''}" href="${app.url}">${appLogo(app.branch, app.name)}<span><span class="name">${escapeHtml(app.name)}</span><span class="branch">${escapeHtml(app.branch)}</span></span>${current ? '<span class="dot" title="Current application"></span>' : ''}</a>`
      }).join('')}</div><a class="status" style="display:block;text-decoration:none" href="https://github.com/${REPOSITORY}/branches" target="_blank" rel="noreferrer">Manage repository branches ↗</a>`
      this.menu.querySelector('.studio-launch')?.addEventListener('click', () => {
        this.close()
        document.querySelector('tabloid-brain-studio')?.open()
      })
    } catch {
      this.loaded = false
      this.menu.innerHTML = `<div class="heading">Live repository branches</div><a class="app" href="https://tabloid.${TAILNET}/">${appLogo('main', 'Production')}<span><span class="name">Production</span><span class="branch">main</span></span></a><div class="status">New branches could not be loaded. Try again shortly.</div>`
    }
  }
}

class TabloidBrainStudio extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return
    const root = this.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>
      :host{position:fixed;z-index:100;inset:0;display:none;font:500 14px/1.45 ui-sans-serif,system-ui;color:#e2e8f0}:host([open]){display:block}*{box-sizing:border-box}.backdrop{position:absolute;inset:0;border:0;background:#020617c9;backdrop-filter:blur(8px)}.panel{position:absolute;top:12px;right:12px;bottom:12px;width:min(640px,calc(100vw - 24px));overflow:auto;border:1px solid #334155;border-radius:24px;background:#0f172a;box-shadow:0 30px 90px #020617;padding:24px}.head,.toolbar,.history-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.eyebrow{color:#a3e635;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}h2{margin:5px 0 0;font-size:25px}.close{width:38px;height:38px;border:1px solid #334155;border-radius:11px;background:#1e293b;color:white;font-size:20px}.note{margin:18px 0 10px;padding:12px;border:1px solid #a3e63530;border-radius:12px;background:#a3e6350b;color:#cbd5e1;font-size:12px}.status{color:#94a3b8;font-size:11px}.intent{display:flex;gap:8px;margin-top:16px}.intent input,.search,select,.copy-field textarea{width:100%;border:1px solid #334155;border-radius:11px;background:#020617;color:white;padding:10px 12px;font:inherit}.intent button,.toolbar button,.history-row button{border:0;border-radius:11px;padding:10px 13px;background:#a3e635;color:#1a2e05;font-weight:900;white-space:nowrap}.intent button:disabled,.toolbar button:disabled{opacity:.5}.search{margin-top:14px}.fields{display:grid;gap:9px;margin-top:12px}.copy-field{display:block;border:1px solid #1e293b;border-radius:14px;background:#020617;padding:12px}.copy-field small{display:block;overflow:hidden;color:#64748b;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.copy-field textarea{min-height:66px;margin-top:7px;resize:vertical}.toolbar{position:sticky;bottom:-24px;margin:18px -24px -24px;padding:14px 24px;background:#0f172af2;border-top:1px solid #334155;backdrop-filter:blur(10px)}.toolbar .secondary,.history-row button{border:1px solid #334155;background:#1e293b;color:#e2e8f0}.toolbar .publish{background:#22c55e;color:#052e16}.history{margin-top:18px;padding:14px;border:1px solid #334155;border-radius:14px}.history-row{margin-top:9px}.history-row select{margin:0}.empty{margin-top:18px;padding:22px;border:1px dashed #334155;border-radius:14px;color:#94a3b8;text-align:center}@media(max-width:600px){.intent,.toolbar{align-items:stretch;flex-direction:column}.toolbar{position:static;margin:18px 0 0;padding:14px 0 0}.panel{padding:18px}}
    </style><button class="backdrop" aria-label="Close Brain Studio"></button><section class="panel" role="dialog" aria-modal="true" aria-labelledby="brain-studio-title"><div class="head"><div><div class="eyebrow">App-specific content management</div><h2 id="brain-studio-title">Brain Studio</h2></div><button class="close" aria-label="Close">×</button></div><div class="note">Edit every registered text field on this page. Preview locally, save a draft, then explicitly approve publication.</div><div class="status loading">Discovering page content…</div><div class="editor" hidden><div class="intent"><input name="intent" placeholder="Ask Brain to polish this entire page…"><button class="rewrite" type="button">Rewrite with Brain ✦</button></div><input class="search" type="search" placeholder="Find text on this page…"><div class="fields"></div><div class="history"><div class="eyebrow">Revision history</div><div class="history-row"><select class="revisions"><option value="">No published revisions yet</option></select><button class="rollback" type="button" disabled>Roll back</button></div></div><div class="toolbar"><button class="secondary preview" type="button">Preview changes</button><button class="secondary save" type="button">Save draft</button><button class="publish" type="button">Approve & publish</button></div></div><div class="empty" hidden></div></section>`
    root.querySelectorAll('.close,.backdrop').forEach((button) => button.addEventListener('click', () => this.close()))
    root.querySelector('.search').addEventListener('input', (event) => this.renderFields(event.target.value))
    root.querySelector('.rewrite').addEventListener('click', () => this.rewrite())
    root.querySelector('.preview').addEventListener('click', () => this.preview())
    root.querySelector('.save').addEventListener('click', () => this.saveDraft())
    root.querySelector('.publish').addEventListener('click', () => this.publish())
    root.querySelector('.rollback').addEventListener('click', () => this.rollback())
    root.querySelector('.revisions').addEventListener('change', (event) => { root.querySelector('.rollback').disabled = !event.target.value })
  }

  async open() {
    this.setAttribute('open', '')
    const root = this.shadowRoot
    const status = root.querySelector('.loading')
    const editor = root.querySelector('.editor')
    const empty = root.querySelector('.empty')
    editor.hidden = true; empty.hidden = true
    status.textContent = 'Discovering page content…'
    try {
      if (!window.TabloidCMS) await new Promise((resolve) => window.addEventListener('tabloid:cms-ready', resolve, { once: true }))
      this.cms = window.TabloidCMS
      if (!this.cms?.fields().length) throw new Error('This page has not installed the editable-content adapter yet.')
      const response = await fetch(`${BRAIN_API}/api/v1/content/pages/${this.cms.appId}/${this.cms.pageId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Brain returned ${response.status}`)
      this.page = await response.json()
      this.values = { ...this.cms.values(), ...(this.page.draft?.values || {}) }
      this.draftId = this.page.draft?.id || null
      status.textContent = `${this.cms.appId} · ${this.cms.pageId}.html · ${this.cms.fields().length} editable text fields${this.draftId ? ' · Draft restored' : ''}`
      this.renderFields()
      this.renderHistory()
      editor.hidden = false
    } catch (error) { empty.textContent = error.message; empty.hidden = false }
  }

  close() { this.cms?.reset(); this.removeAttribute('open') }

  renderFields(query = '') {
    const normalized = query.trim().toLowerCase()
    const fields = this.cms.fields().filter(({ key, label }) => !normalized || `${key} ${label}`.toLowerCase().includes(normalized))
    this.shadowRoot.querySelector('.fields').innerHTML = fields.map(({ key, label }) => `<label class="copy-field"><small>${escapeHtml(key)} · ${escapeHtml(label)}</small><textarea data-key="${escapeHtml(key)}">${escapeHtml(this.values[key] ?? '')}</textarea></label>`).join('') || '<div class="empty">No matching text fields.</div>'
    this.shadowRoot.querySelectorAll('[data-key]').forEach((input) => input.addEventListener('input', () => { this.values[input.dataset.key] = input.value; this.draftId = null }))
  }

  renderHistory() {
    const select = this.shadowRoot.querySelector('.revisions')
    select.innerHTML = '<option value="">Select a published revision…</option>' + (this.page.revisions || []).map((revision) => `<option value="${escapeHtml(revision.id)}">${escapeHtml(new Date(revision.createdAt).toLocaleString())} · ${escapeHtml(revision.message)}</option>`).join('')
    this.shadowRoot.querySelector('.rollback').disabled = true
  }

  setBusy(busy, message) {
    this.shadowRoot.querySelectorAll('.rewrite,.save,.publish,.preview').forEach((button) => { button.disabled = busy })
    if (message) this.shadowRoot.querySelector('.loading').textContent = message
  }

  preview() { this.cms.apply(this.values); this.shadowRoot.querySelector('.loading').textContent = 'Preview applied behind this panel. Close Studio to restore the published version.' }

  async saveDraft() {
    this.setBusy(true, 'Saving draft…')
    try {
      const response = await fetch(`${BRAIN_API}/api/v1/content/pages/${this.cms.appId}/${this.cms.pageId}/draft`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: this.values }) })
      const page = await response.json(); if (!response.ok) throw new Error(page.error || `Brain returned ${response.status}`)
      this.page = page; this.draftId = page.draft.id
      this.shadowRoot.querySelector('.loading').textContent = `Draft saved · ${new Date(page.draft.createdAt).toLocaleTimeString()}`
      return page.draft
    } catch (error) { this.shadowRoot.querySelector('.loading').textContent = `Draft failed: ${error.message}`; throw error }
    finally { this.setBusy(false) }
  }

  async rewrite() {
    const intent = this.shadowRoot.querySelector('[name=intent]').value.trim()
    if (!intent) { this.shadowRoot.querySelector('.loading').textContent = 'Describe what Brain should improve first.'; return }
    this.setBusy(true, 'Brain is rewriting this page with app-specific context…')
    try {
      const response = await fetch(`${BRAIN_API}/api/v1/content/pages/${this.cms.appId}/${this.cms.pageId}/rewrite`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: this.values, intent }) })
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || `Brain returned ${response.status}`)
      const generated = payload.content?.values || payload.content?.proposal?.values
      if (!generated || typeof generated !== 'object') throw new Error('Brain did not return editable page fields.')
      this.values = { ...this.values, ...generated }; this.draftId = null; this.renderFields(this.shadowRoot.querySelector('.search').value)
      this.shadowRoot.querySelector('.loading').textContent = 'AI rewrite ready for review · Not published'
    } catch (error) { this.shadowRoot.querySelector('.loading').textContent = `Rewrite failed: ${error.message}` }
    finally { this.setBusy(false) }
  }

  async publish() {
    if (!window.confirm('Publish this draft to the live page? A revision will be saved for rollback.')) return
    try {
      if (!this.draftId) await this.saveDraft()
      this.setBusy(true, 'Publishing approved revision…')
      const response = await fetch(`${BRAIN_API}/api/v1/content/pages/${this.cms.appId}/${this.cms.pageId}/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draftId: this.draftId, confirmed: true, message: 'Published from Brain Studio' }) })
      const page = await response.json(); if (!response.ok) throw new Error(page.error || `Brain returned ${response.status}`)
      this.page = page; this.draftId = null; this.cms.setPublished(page.published.values); this.values = { ...page.published.values }; this.renderHistory()
      this.shadowRoot.querySelector('.loading').textContent = `Published · ${new Date(page.published.createdAt).toLocaleString()}`
    } catch (error) { this.shadowRoot.querySelector('.loading').textContent = `Publish failed: ${error.message}` }
    finally { this.setBusy(false) }
  }

  async rollback() {
    const revisionId = this.shadowRoot.querySelector('.revisions').value
    if (!revisionId || !window.confirm('Roll the live page back to this revision?')) return
    this.setBusy(true, 'Rolling back…')
    try {
      const response = await fetch(`${BRAIN_API}/api/v1/content/pages/${this.cms.appId}/${this.cms.pageId}/rollback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ revisionId, confirmed: true }) })
      const page = await response.json(); if (!response.ok) throw new Error(page.error || `Brain returned ${response.status}`)
      this.page = page; this.values = { ...page.published.values }; this.cms.setPublished(this.values); this.renderFields(); this.renderHistory()
      this.shadowRoot.querySelector('.loading').textContent = 'Rollback published successfully.'
    } catch (error) { this.shadowRoot.querySelector('.loading').textContent = `Rollback failed: ${error.message}` }
    finally { this.setBusy(false) }
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
