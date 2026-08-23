import './style.css'
import { mountSharedNav } from './shared-nav.js'

// This is a public routing origin, not an API credential. The worker remains
// responsible for session validation, authorization, validation, and auditing.
const workerOrigin = String(import.meta.env.VITE_APP_GALLERY_WORKER_ORIGIN || '').trim().replace(/\/+$/, '')
const routes = Object.freeze({
  templates: '/api/v1/templates',
  apps: '/api/v1/apps',
  requests: '/api/v1/app-requests',
})

const localTemplates = Object.freeze([
  { id: 'daily-echo', name: 'The Daily Echo', description: 'A responsive publication shell with section navigation.', sourceBranch: 'main' },
  { id: 'admin-control', name: 'Admin control plane', description: 'A private, accessible control-plane starting point.', sourceBranch: 'admin' },
  { id: 'app-gallery', name: 'App Gallery', description: 'A catalog-first application launcher and creation experience.', sourceBranch: 'app-gallery' },
  { id: 'big-news', name: 'Big News', description: 'A personal intelligence publication starting point.', sourceBranch: 'big-news' },
  { id: 'tech', name: 'Tech', description: 'An engineering briefing and technology news starting point.', sourceBranch: 'tech' },
])

// Inventory is deliberately local so the gallery is useful while the worker,
// deployment system, or Podman is unavailable. URLs are known preview routes,
// not claimed deployment or health information.
const inventory = Object.freeze([
  ['The Daily Echo', 'https://tabloid.tail70b7f1.ts.net/', 'daily-echo', 'daily', 'Today\'s local briefing'],
  ['Admin', 'https://tabloid-admin-8c6976.tail70b7f1.ts.net/', 'admin-control', 'admin', 'Control plane'],
  ['App Gallery', 'https://tabloid-app-gallery-0f8e89.tail70b7f1.ts.net/', 'app-gallery', 'gallery', 'Apps and templates'],
  ['Big News', 'https://tabloid-big-news-f1a4f4.tail70b7f1.ts.net/', 'big-news', 'news', 'Intelligence briefing'],
  ['Tech', 'https://tabloid-tech-fe9bbd.tail70b7f1.ts.net/', 'tech', 'tech', 'Engineering signal'],
].map(([name, url, templateId, preview, headline]) => ({ name, url, templateId, preview, headline })))

const state = {
  templates: [...localTemplates],
  selectedTemplate: localTemplates[0].id,
  templatePhase: 'loading',
  requestPhase: 'loading',
  requests: [],
  staleMessage: '',
  form: { name: '', slug: '', description: '', intent: '' },
  errors: {},
  submission: { phase: 'idle', key: '', fingerprint: '', response: null, error: '' },
}

const app = document.querySelector('#app')
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]))
const asArray = (value) => Array.isArray(value) ? value : []
const endpoint = (path) => `${workerOrigin}${path}`
const templateId = (item) => String(item?.id || item?.templateId || item?.slug || '')
const templateName = (item) => String(item?.name || item?.displayName || templateId(item))
const templateDescription = (item) => String(item?.description || item?.summary || '')
const requestId = (item) => String(item?.id || item?.requestId || item?.appRequestId || item?.request?.id || '')
const requestStatus = (item) => String(item?.status || item?.phase || item?.request?.status || item?.app?.status || 'queued').replace(/[-_]/g, ' ')
const requestBranch = (item) => String(item?.branch || item?.branchName || item?.app?.branch || item?.request?.branch || '')
const requestPreview = (item) => String(item?.previewUrl || item?.url || item?.app?.previewUrl || item?.request?.previewUrl || '')
const idempotencyKey = () => globalThis.crypto?.randomUUID?.() || `gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`

class WorkerError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

async function workerRequest(path, options = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(endpoint(path), {
      credentials: 'omit',
      cache: 'no-store',
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new WorkerError(payload.message || payload.error || `The worker returned ${response.status}.`, response.status)
    return { payload, status: response.status }
  } catch (error) {
    if (error.name === 'AbortError') throw new WorkerError('The worker did not respond within 12 seconds.')
    if (error instanceof WorkerError) throw error
    throw new WorkerError('The private worker could not be reached. Your draft is still available to retry.')
  } finally {
    window.clearTimeout(timer)
  }
}

function normalizeTemplates(payload) {
  const received = asArray(payload?.templates || payload?.items || payload)
    .filter((item) => templateId(item))
    .map((item) => ({ id: templateId(item), name: templateName(item), description: templateDescription(item) }))
  return received.length ? received : [...localTemplates]
}

function normalizeRequests(payload) {
  return asArray(payload?.appRequests || payload?.requests || payload?.items || payload)
}

function validate(form) {
  const errors = {}
  if (!state.selectedTemplate) errors.template = 'Choose a template.'
  if (form.name.length < 2 || form.name.length > 80) errors.name = 'Enter a name between 2 and 80 characters.'
  if (!/^[a-z][a-z0-9-]{1,47}$/.test(form.slug)) errors.slug = 'Use 2–48 lowercase letters, numbers, and hyphens, starting with a letter.'
  if (form.description.length > 280) errors.description = 'Keep the description to 280 characters or fewer.'
  if (form.intent.length > 4000) errors.intent = 'Keep the customization request to 4,000 characters or fewer.'
  return errors
}

function staleNotice() {
  if (!state.staleMessage) return ''
  return `<section class="status-card status-card--quiet" role="status" aria-live="polite"><div><p class="status-kicker">Stale data</p><h2>Showing the available gallery inventory</h2></div><p>${escapeHtml(state.staleMessage)} Deployment status is not required to browse or submit a request.</p><button class="secondary-button" type="button" data-action="refresh">Try refresh</button></section>`
}

function templateOptions() {
  return state.templates.map((template) => `<button type="button" class="template-card${template.id === state.selectedTemplate ? ' template-card--selected' : ''}" data-template="${escapeHtml(template.id)}" aria-pressed="${template.id === state.selectedTemplate}">
    <span class="template-card__heading"><span>${escapeHtml(template.name)}</span><span class="template-card__state">${template.id === state.selectedTemplate ? 'Selected' : 'Choose'}</span></span>
    <span class="template-card__description">${escapeHtml(template.description || 'Template details are supplied by the worker.')}</span>
  </button>`).join('')
}

function requestStatusCard() {
  if (state.submission.phase === 'submitting') return '<section class="status-card" role="status" aria-live="polite" aria-busy="true"><div><p class="status-kicker">Creating request</p><h2>Sending your idempotent request</h2></div><p>The worker, not this browser, decides whether the request may create an app.</p></section>'
  if (state.submission.phase === 'denied') return `<section class="status-card status-card--error" role="alert"><div><p class="status-kicker">Permission denied</p><h2>The worker did not authorize this request</h2></div><p>${escapeHtml(state.submission.error)}</p></section>`
  if (state.submission.phase === 'failed') return `<section class="status-card status-card--error" role="alert"><div><p class="status-kicker">Request failed</p><h2>The app request was not accepted</h2></div><p>${escapeHtml(state.submission.error)}</p><p>Retrying unchanged details uses the same idempotency key.</p></section>`
  if (state.submission.phase !== 'success') return ''
  const response = state.submission.response || {}
  const branch = requestBranch(response)
  const preview = requestPreview(response)
  return `<section class="status-card status-card--success" role="status" aria-live="polite"><div><p class="status-kicker">Request created</p><h2>${escapeHtml(requestStatus(response))}</h2></div><dl class="request-details">${requestId(response) ? `<div><dt>Request</dt><dd>${escapeHtml(requestId(response))}</dd></div>` : ''}${branch ? `<div><dt>Branch</dt><dd>${escapeHtml(branch)}</dd></div>` : ''}${preview ? `<div><dt>Preview</dt><dd><a href="${escapeHtml(preview)}" target="_blank" rel="noreferrer">Open when ready</a></dd></div>` : '<div><dt>Preview</dt><dd>Not available yet</dd></div>'}</dl><p>Branch and preview availability are reported only when returned by the worker.</p></section>`
}

function requestsView() {
  if (state.requestPhase === 'loading') return '<section class="gallery-empty" role="status" aria-live="polite" aria-busy="true"><h2>Loading recent requests</h2><p>Existing apps and the create form are ready now.</p></section>'
  if (!state.requests.length) return '<section class="gallery-empty"><h2>No app requests yet</h2><p>Submitted requests will appear here when the worker returns them.</p></section>'
  return `<section class="review-summary" aria-labelledby="requests-title"><p class="eyebrow">Recent requests</p><h2 id="requests-title">Branch and preview status</h2><div class="page-list">${state.requests.map((item) => {
    const preview = requestPreview(item)
    return `<article class="page-card"><div><h4>${escapeHtml(item.name || item.appName || requestId(item) || 'App request')}</h4><p>Status: ${escapeHtml(requestStatus(item))}${requestBranch(item) ? ` · Branch: ${escapeHtml(requestBranch(item))}` : ''}</p></div>${preview ? `<a class="secondary-button" href="${escapeHtml(preview)}" target="_blank" rel="noreferrer">Preview</a>` : '<span class="unavailable-label">Preview pending</span>'}</article>`
  }).join('')}</div></section>`
}

function page() {
  return `<section class="gallery-home" aria-labelledby="gallery-title">
    <div class="gallery-home__heading"><div><p class="eyebrow">Application gallery</p><h1 id="gallery-title">Apps, templates, and requests</h1><p>Browse known apps immediately. Creating an app sends a small, idempotent request to the private worker; no GitHub or deployment credentials are in this browser.</p></div></div>
    ${staleNotice()}
    <section aria-labelledby="inventory-title"><h2 id="inventory-title" class="sr-only">Known apps</h2><div class="app-gallery-grid">${inventory.map((item) => `<article class="app-gallery-card"><div class="app-gallery-card__preview app-gallery-card__preview--${escapeHtml(item.preview)}" aria-label="${escapeHtml(item.name)} visual preview"><div class="preview-browser-bar"><span></span><span></span><span></span><i></i></div><div class="preview-site"><div class="preview-site__masthead">${escapeHtml(item.name)}</div><div class="preview-site__nav"><span></span><span></span><span></span></div><div class="preview-site__content"><p>${escapeHtml(item.headline)}</p><div></div><div></div><div></div></div></div></div><div class="app-gallery-card__body"><h2>${escapeHtml(item.name)}</h2><div class="state-actions"><a class="secondary-button" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open app</a><button class="secondary-button" type="button" data-create-from="${escapeHtml(item.templateId)}">Create from this app</button></div></div></article>`).join('')}</div></section>
    <section class="gallery-layout" aria-labelledby="create-title"><div class="template-panel"><div class="panel-heading"><p class="eyebrow">Template</p><h2>Choose a starting point</h2><p>${state.templatePhase === 'loading' ? 'Loading worker templates; local choices are available now.' : 'Templates are supplied or confirmed by the worker.'}</p></div><div class="template-list" role="group" aria-label="App templates">${templateOptions()}</div>${state.errors.template ? `<p class="field-error">${escapeHtml(state.errors.template)}</p>` : ''}</div>
      <form id="create-app-form" class="provision-form" novalidate><div class="panel-heading"><p class="eyebrow">Create request</p><h2 id="create-title">Describe the new app</h2><p>The server validates authorization and performs all branch, preview, and deployment work.</p></div>
        <label class="field-label" for="name">Name <span aria-hidden="true">*</span></label><input class="field-input" id="name" name="name" required maxlength="80" value="${escapeHtml(state.form.name)}" aria-invalid="${Boolean(state.errors.name)}" aria-describedby="name-error" />${state.errors.name ? `<p id="name-error" class="field-error">${escapeHtml(state.errors.name)}</p>` : ''}
        <label class="field-label" for="slug">Slug <span aria-hidden="true">*</span></label><input class="field-input" id="slug" name="slug" required maxlength="48" pattern="[a-z][a-z0-9\\-]{1,47}" value="${escapeHtml(state.form.slug)}" aria-invalid="${Boolean(state.errors.slug)}" aria-describedby="slug-hint slug-error" /><p id="slug-hint" class="field-hint">2–48 lowercase letters, numbers, and hyphens.</p>${state.errors.slug ? `<p id="slug-error" class="field-error">${escapeHtml(state.errors.slug)}</p>` : ''}
        <label class="field-label" for="description">Description</label><textarea class="field-input field-textarea" id="description" name="description" maxlength="280" aria-invalid="${Boolean(state.errors.description)}" aria-describedby="description-error">${escapeHtml(state.form.description)}</textarea>${state.errors.description ? `<p id="description-error" class="field-error">${escapeHtml(state.errors.description)}</p>` : ''}
        <label class="field-label" for="intent">Customization request</label><textarea class="field-input field-textarea" id="intent" name="intent" maxlength="4000" placeholder="What should be different in this app?" aria-invalid="${Boolean(state.errors.intent)}" aria-describedby="intent-error">${escapeHtml(state.form.intent)}</textarea>${state.errors.intent ? `<p id="intent-error" class="field-error">${escapeHtml(state.errors.intent)}</p>` : ''}
        <button class="submit-button" type="submit" ${state.submission.phase === 'submitting' ? 'disabled' : ''}>${state.submission.phase === 'submitting' ? 'Creating branch…' : 'Create editable app'}</button><p class="submit-note">The worker creates a new branch from the selected app, preserves its deployment files, and records this customization request.</p>
      </form></section>
    ${requestStatusCard()}${requestsView()}
  </section>`
}

function render() {
  document.title = 'App Gallery | Apps and templates'
  app.innerHTML = `<a class="skip-link" href="#main-content">Skip to app gallery</a><div class="app-shell"><header class="site-header"><a class="product-mark" href="./" aria-label="App Gallery home"><span aria-hidden="true">AG</span><span><strong>App Gallery</strong><small>Private worker requests</small></span></a><div class="header-actions"><div data-shared-nav-slot></div></div></header><main id="main-content" class="content-shell">${page()}</main><footer class="site-footer">The browser never receives GitHub credentials, privileged worker tokens, or Podman access.</footer></div>`
  mountSharedNav()
  bindEvents()
}

function bindEvents() {
  document.querySelectorAll('[data-template]').forEach((button) => button.addEventListener('click', () => {
    state.selectedTemplate = button.dataset.template
    state.errors = { ...state.errors, template: '' }
    render()
  }))
  document.querySelectorAll('[data-create-from]').forEach((button) => button.addEventListener('click', () => {
    state.selectedTemplate = button.dataset.createFrom
    state.errors = { ...state.errors, template: '' }
    render()
    document.querySelector('#name')?.focus()
  }))
  document.querySelector('[data-action="refresh"]')?.addEventListener('click', refresh)
  document.querySelector('#create-app-form')?.addEventListener('submit', submit)
}

async function refresh() {
  if (!workerOrigin) {
    state.templatePhase = 'stale'
    state.requestPhase = 'stale'
    state.staleMessage = 'The private creation worker is being configured.'
    render()
    return
  }
  state.templatePhase = 'loading'
  state.requestPhase = 'loading'
  render()
  const [templates, requests] = await Promise.allSettled([
    workerRequest(routes.templates),
    workerRequest(routes.requests),
  ])
  const failures = []
  if (templates.status === 'fulfilled') {
    state.templates = normalizeTemplates(templates.value.payload)
    if (!state.templates.some((item) => item.id === state.selectedTemplate)) state.selectedTemplate = state.templates[0]?.id || ''
    state.templatePhase = 'ready'
  } else {
    state.templatePhase = 'stale'
    failures.push('Templates could not be refreshed.')
  }
  if (requests.status === 'fulfilled') {
    state.requests = normalizeRequests(requests.value.payload)
    state.requestPhase = 'ready'
  } else {
    state.requestPhase = 'stale'
    failures.push('Recent request status could not be refreshed.')
  }
  state.staleMessage = failures.join(' ')
  render()
}

async function submit(event) {
  event.preventDefault()
  const form = {
    name: String(event.currentTarget.elements.name.value || '').trim(),
    slug: String(event.currentTarget.elements.slug.value || '').trim().toLowerCase(),
    description: String(event.currentTarget.elements.description.value || '').trim(),
    intent: String(event.currentTarget.elements.intent.value || '').trim(),
  }
  state.form = form
  state.errors = validate(form)
  if (Object.keys(state.errors).length) {
    render()
    document.querySelector(`[name="${Object.keys(state.errors)[0]}"]`)?.focus()
    return
  }
  if (!workerOrigin) {
    state.submission = { phase: 'failed', key: '', fingerprint: '', response: null, error: 'The private app-creation worker is being configured. Your app inventory remains available.' }
    render()
    return
  }
  const payload = { templateId: state.selectedTemplate, name: form.name, slug: form.slug, description: form.description, intent: form.intent }
  const fingerprint = JSON.stringify(payload)
  const key = state.submission.fingerprint === fingerprint ? state.submission.key : idempotencyKey()
  state.submission = { phase: 'submitting', key, fingerprint, response: null, error: '' }
  render()
  try {
    const response = await workerRequest(routes.apps, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(payload) })
    state.submission = { phase: 'success', key, fingerprint, response: response.payload, error: '' }
    refresh()
  } catch (error) {
    state.submission = { phase: error.status === 401 || error.status === 403 ? 'denied' : 'failed', key, fingerprint, response: null, error: error.message }
    render()
  }
}

render()
refresh()
