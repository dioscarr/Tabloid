import './style.css'
import { mountSharedNav } from './shared-nav.js'

const apiBaseUrl = String(import.meta.env.VITE_ADMIN_API_URL || '').trim().replace(/\/+$/, '')
const apiRoutes = Object.freeze({
  session: '/api/v1/session',
  templates: '/api/v1/app-templates',
  provision: '/api/v1/applications/provision',
})
const reservedNames = new Set(['admin', 'api', 'app-gallery', 'auth', 'brain', 'root', 'system', 'www'])

const state = {
  view: apiBaseUrl ? 'loading-session' : 'unavailable',
  session: null,
  templates: [],
  selectedTemplateId: '',
  draft: { displayName: '', appId: '', branch: '' },
  validation: {},
  request: { phase: 'idle', fingerprint: '', idempotencyKey: '', response: null, error: '' },
  error: '',
}

const app = document.querySelector('#app')

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]))

const endpoint = (path) => `${apiBaseUrl}${path}`

class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

const getErrorMessage = (payload, fallback) => {
  if (typeof payload?.message === 'string') return payload.message
  if (typeof payload?.error === 'string') return payload.error
  if (typeof payload?.detail === 'string') return payload.detail
  return fallback
}

const request = async (path, options = {}) => {
  if (!apiBaseUrl) throw new ApiError('The Admin API endpoint has not been configured.')

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch(endpoint(path), {
      cache: 'no-store',
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new ApiError(getErrorMessage(payload, `The Admin API returned ${response.status}.`), response.status)
    return { payload, status: response.status }
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The Admin API did not respond within 12 seconds.')
    if (error instanceof ApiError) throw error
    throw new ApiError('The Admin API could not be reached. Check the endpoint and your network connection.')
  } finally {
    window.clearTimeout(timeout)
  }
}

const valuesFrom = (value) => Array.isArray(value) ? value : []

const hasProvisionPermission = (session) => {
  if (
    session?.canProvisionApplications === true
    || session?.authorization?.canProvisionApplications === true
    || session?.permissions?.applications?.provision === true
    || session?.authorization?.permissions?.applications?.provision === true
  ) return true

  const permissions = [
    ...valuesFrom(session?.permissions),
    ...valuesFrom(session?.scopes),
    ...valuesFrom(session?.capabilities),
    ...valuesFrom(session?.user?.permissions),
    ...valuesFrom(session?.user?.scopes),
    ...valuesFrom(session?.permissions?.applications),
    ...valuesFrom(session?.authorization?.permissions?.applications),
  ].map((value) => String(value).toLowerCase())

  return permissions.some((permission) => [
    'applications:provision',
    'applications.provision',
    'app-gallery:provision',
    'provision:applications',
  ].includes(permission))
}

const sessionIsAuthenticated = (session) => session?.authenticated !== false && session?.session?.authenticated !== false

const templateId = (template) => String(template?.id || template?.templateId || template?.slug || '')
const templateName = (template) => String(template?.name || template?.displayName || templateId(template))
const templateDescription = (template) => String(template?.description || template?.summary || '')

const capabilitiesFor = (template) => {
  const source = template?.capabilities ?? template?.features ?? template?.includes ?? []
  if (Array.isArray(source)) return source.map((capability) => String(capability)).filter(Boolean)
  if (source && typeof source === 'object') {
    return Object.entries(source)
      .filter(([, enabled]) => enabled !== false && enabled !== null)
      .map(([name, enabled]) => enabled === true ? name : `${name}: ${enabled}`)
  }
  return []
}

const approvedTemplates = (payload) => {
  const templates = Array.isArray(payload) ? payload : valuesFrom(payload?.templates || payload?.items)
  return templates.filter((template) => {
    if (!templateId(template)) return false
    if (template?.approved === false) return false
    return !['draft', 'rejected', 'retired'].includes(String(template?.status || template?.approvalStatus || '').toLowerCase())
  })
}

const selectedTemplate = () => state.templates.find((template) => templateId(template) === state.selectedTemplateId)

const validateBranch = (value) => {
  if (!value) return 'Enter the branch that the Admin API should validate.'
  if (value.length > 120) return 'Branch names must be 120 characters or fewer.'
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return 'Use letters, numbers, periods, underscores, hyphens, and forward slashes only.'
  if (value.startsWith('/') || value.endsWith('/') || value.startsWith('.') || value.endsWith('.') || value.includes('//') || value.includes('..') || value.includes('@{') || value.endsWith('.lock')) {
    return 'Enter a valid Git reference name without empty, dot, lock, or special path segments.'
  }
  if (reservedNames.has(value.toLowerCase())) return 'This branch name is reserved for platform use.'
  return ''
}

const validateDraft = (draft) => {
  const errors = {}
  if (!state.selectedTemplateId) errors.template = 'Select an approved template.'
  if (draft.displayName.length < 3 || draft.displayName.length > 80) errors.displayName = 'Enter an application display name between 3 and 80 characters.'
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(draft.appId)) errors.appId = 'Use 2–63 lowercase letters, numbers, and hyphens, starting with a letter.'
  else if (reservedNames.has(draft.appId)) errors.appId = 'This application ID is reserved for platform use.'
  const branchError = validateBranch(draft.branch)
  if (branchError) errors.branch = branchError
  return errors
}

const readableStatus = (value) => String(value || 'Accepted').replace(/[-_]/g, ' ')

const requestIdFrom = (payload) => payload?.requestId || payload?.request?.id || payload?.id || payload?.provisioningRequestId

const requestStatusFrom = (payload) => payload?.status || payload?.request?.status || payload?.provisioning?.status

const statusCard = () => {
  if (state.request.phase === 'idle') {
    return '<section class="status-card status-card--quiet" aria-labelledby="request-status-title"><div><p class="status-kicker">Request status</p><h2 id="request-status-title">No provisioning request submitted</h2></div><p>Complete the form to send one idempotent request to the Admin API. This browser cannot create branches, repositories, containers, or credentials.</p></section>'
  }

  if (state.request.phase === 'submitting') {
    return '<section class="status-card" aria-live="polite" aria-busy="true"><div><p class="status-kicker">Request status</p><h2>Submitting to the Admin API</h2></div><p>Your idempotency key is retained while this request is in progress.</p></section>'
  }

  if (state.request.phase === 'accepted') {
    const response = state.request.response || {}
    const requestId = requestIdFrom(response)
    const remoteStatus = requestStatusFrom(response)
    return `<section class="status-card status-card--success" aria-live="polite"><div><p class="status-kicker">Request status</p><h2>Provisioning request acknowledged</h2></div><dl class="request-details"><div><dt>Admin API response</dt><dd>${escapeHtml(remoteStatus ? readableStatus(remoteStatus) : `HTTP ${state.request.httpStatus}`)}</dd></div>${requestId ? `<div><dt>Request ID</dt><dd class="break-all">${escapeHtml(requestId)}</dd></div>` : ''}<div><dt>Idempotency key</dt><dd class="break-all">${escapeHtml(state.request.idempotencyKey)}</dd></div></dl><p>The Admin API acknowledged this request. Provisioning remains server-side; this browser has not created an application, branch, container, or credential.</p></section>`
  }

  return `<section class="status-card status-card--error" aria-live="assertive"><div><p class="status-kicker">Request status</p><h2>Provisioning request failed</h2></div><p>${escapeHtml(state.request.error || 'The Admin API did not accept this request.')}</p><p>Correct the form or service issue and retry. The same idempotency key will be sent again for this unchanged request.</p></section>`
}

const renderTemplate = (template) => {
  const id = templateId(template)
  const isSelected = id === state.selectedTemplateId
  const capabilities = capabilitiesFor(template)
  return `<button type="button" class="template-card${isSelected ? ' template-card--selected' : ''}" data-template-id="${escapeHtml(id)}" aria-pressed="${isSelected}" aria-describedby="template-${escapeHtml(id)}-details"><span class="template-card__heading"><span>${escapeHtml(templateName(template))}</span><span class="template-card__state">${isSelected ? 'Selected' : 'Approved'}</span></span>${templateDescription(template) ? `<span class="template-card__description">${escapeHtml(templateDescription(template))}</span>` : ''}<span id="template-${escapeHtml(id)}-details" class="template-card__capabilities">${capabilities.length ? capabilities.map((capability) => `<span>${escapeHtml(capability)}</span>`).join('') : '<span>No template capabilities were supplied by the Admin API.</span>'}</span></button>`
}

const inputError = (name) => state.validation[name] ? `<p id="${name}-error" class="field-error">${escapeHtml(state.validation[name])}</p>` : ''
const invalidAttribute = (name) => state.validation[name] ? `aria-invalid="true" aria-describedby="${name}-error"` : ''

const formView = () => {
  const template = selectedTemplate()
  const capabilities = template ? capabilitiesFor(template) : []
  return `<section class="gallery-layout" aria-label="Application provisioning">
    <div class="template-panel">
      <div class="panel-heading"><p class="eyebrow">1. Approved template</p><h2>Choose a starting point</h2><p>Only templates returned by the authorized Admin API are available.</p></div>
      <div class="template-list" role="group" aria-label="Approved templates">${state.templates.map(renderTemplate).join('')}</div>
    </div>
    <form id="provision-form" class="provision-form" novalidate>
      <div class="panel-heading"><p class="eyebrow">2. Application details</p><h2>Describe the request</h2><p>The server validates the selected template, app ID, branch, authorization, and idempotency key.</p></div>
      <label class="field-label" for="display-name">App display name<span aria-hidden="true"> *</span></label>
      <input id="display-name" name="displayName" class="field-input" value="${escapeHtml(state.draft.displayName)}" maxlength="80" autocomplete="off" required ${invalidAttribute('displayName')} />
      ${inputError('displayName')}
      <label class="field-label" for="app-id">App ID<span aria-hidden="true"> *</span></label>
      <input id="app-id" name="appId" class="field-input" value="${escapeHtml(state.draft.appId)}" maxlength="63" pattern="[a-z][a-z0-9-]{1,62}" autocomplete="off" required ${invalidAttribute('appId')} />
      <p class="field-hint">Lowercase identifier. Reserved platform names cannot be used.</p>
      ${inputError('appId')}
      <label class="field-label" for="branch">Existing branch<span aria-hidden="true"> *</span></label>
      <input id="branch" name="branch" class="field-input" value="${escapeHtml(state.draft.branch)}" maxlength="120" autocomplete="off" required ${invalidAttribute('branch')} />
      <p class="field-hint">A reference only. The Admin API must verify it; this app does not create branches.</p>
      ${inputError('branch')}
      ${state.validation.template ? `<p id="template-error" class="field-error">${escapeHtml(state.validation.template)}</p>` : ''}
      <section class="capability-review" aria-labelledby="capability-review-title">
        <p class="eyebrow">3. Capability review</p>
        <h3 id="capability-review-title">${template ? escapeHtml(templateName(template)) : 'Select a template to review capabilities'}</h3>
        ${templateDescription(template) ? `<p>${escapeHtml(templateDescription(template))}</p>` : ''}
        <ul>${capabilities.length ? capabilities.map((capability) => `<li>${escapeHtml(capability)}</li>`).join('') : '<li>No capabilities are available until an approved template is selected.</li>'}</ul>
      </section>
      <button class="submit-button" type="submit" ${state.request.phase === 'submitting' ? 'disabled' : ''}>${state.request.phase === 'submitting' ? 'Submitting request…' : 'Submit provisioning request'}</button>
      <p class="submit-note">Submitting sends only the selected template ID, display name, app ID, branch, and an idempotency key to the configured Admin API.</p>
    </form>
  </section>`
}

const unavailableView = () => {
  const configured = Boolean(apiBaseUrl)
  const title = configured ? 'Admin API unavailable' : 'Admin API not configured'
  const detail = configured
    ? `App Gallery could not reach the configured Admin API at ${apiBaseUrl}. Confirm the public endpoint is available and accepts this application origin, then retry.`
    : 'Set VITE_ADMIN_API_URL to the public origin of the Admin API, rebuild or restart Vite, and retry. Do not put credentials or privileged tokens in this value.'
  return `<section class="state-panel state-panel--warning" role="status" aria-live="polite"><p class="eyebrow">Connection required</p><h1>${title}</h1><p>${escapeHtml(detail)}</p>${configured ? '<button id="retry-button" class="secondary-button" type="button">Retry connection</button>' : '<code>VITE_ADMIN_API_URL=https://admin-api.example</code>'}</section>`
}

const deniedView = () => '<section class="state-panel state-panel--denied" role="alert"><p class="eyebrow">Access denied</p><h1>You cannot provision applications</h1><p>Your session did not include a confirmed application-provisioning permission. Ask an Admin API administrator to grant access, then sign in again.</p><button id="retry-button" class="secondary-button" type="button">Check session again</button></section>'

const errorView = () => `<section class="state-panel state-panel--error" role="alert"><p class="eyebrow">Unable to load App Gallery</p><h1>The Admin API request failed</h1><p>${escapeHtml(state.error || 'The service did not return the required data.')}</p><button id="retry-button" class="secondary-button" type="button">Retry</button></section>`

const loadingView = (message) => `<section class="state-panel state-panel--loading" role="status" aria-live="polite" aria-busy="true"><p class="eyebrow">Loading</p><h1>${escapeHtml(message)}</h1><p>App Gallery is waiting for an authenticated response from the Admin API.</p></section>`

const emptyView = () => '<section class="state-panel state-panel--empty" role="status"><p class="eyebrow">No approved templates</p><h1>There are no templates available to provision</h1><p>The Admin API returned no approved templates for this session. Ask an administrator to publish a template or grant access, then retry.</p><button id="retry-button" class="secondary-button" type="button">Refresh templates</button></section>'

const pageBody = () => {
  if (state.view === 'unavailable') return unavailableView()
  if (state.view === 'loading-session') return loadingView('Checking your session')
  if (state.view === 'loading-templates') return loadingView('Loading approved templates')
  if (state.view === 'denied') return deniedView()
  if (state.view === 'error') return errorView()
  if (state.view === 'empty') return emptyView()

  return `<section class="hero"><div><p class="eyebrow">Authorized provisioning</p><h1>Build from an approved application template.</h1><p>Select a template, provide the application identity and existing branch, then submit one traceable request to the Admin API.</p></div><div class="session-summary"><span class="session-summary__dot" aria-hidden="true"></span><span>Session verified by Admin API</span></div></section>${statusCard()}${formView()}`
}

const render = () => {
  document.title = 'App Gallery | Approved application provisioning'
  app.innerHTML = `<a class="skip-link" href="#main-content">Skip to provisioning</a><div class="app-shell"><header class="site-header"><a class="product-mark" href="./" aria-label="App Gallery home"><span aria-hidden="true">AG</span><span><strong>App Gallery</strong><small>Approved application provisioning</small></span></a><div class="header-actions"><div data-shared-nav-slot></div></div></header><main id="main-content" class="content-shell">${pageBody()}</main><footer class="site-footer">Requests are authorized and provisioned only by the Admin API. No privileged credentials are available in this browser.</footer></div>`
  mountSharedNav()
  bindEvents()
}

const captureDraft = (form) => ({
  displayName: String(form.elements.displayName?.value || '').trim(),
  appId: String(form.elements.appId?.value || '').trim().toLowerCase(),
  branch: String(form.elements.branch?.value || '').trim(),
})

const focusFirstError = () => {
  const field = Object.keys(state.validation).find((name) => name !== 'template')
  if (field) document.querySelector(`[name="${field}"]`)?.focus()
  else document.querySelector('[data-template-id]')?.focus()
}

const createIdempotencyKey = () => crypto.randomUUID ? crypto.randomUUID() : `app-gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`

const submitProvisioning = async (form) => {
  const draft = captureDraft(form)
  const validation = validateDraft(draft)
  state.draft = draft
  state.validation = validation
  if (Object.keys(validation).length) {
    render()
    focusFirstError()
    return
  }

  const payload = {
    templateId: state.selectedTemplateId,
    displayName: draft.displayName,
    appId: draft.appId,
    branch: draft.branch,
  }
  const fingerprint = JSON.stringify(payload)
  const idempotencyKey = state.request.fingerprint === fingerprint && state.request.idempotencyKey
    ? state.request.idempotencyKey
    : createIdempotencyKey()

  state.request = { phase: 'submitting', fingerprint, idempotencyKey, response: null, error: '' }
  render()

  try {
    const { payload: response, status } = await request(apiRoutes.provision, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    })
    state.request = { phase: 'accepted', fingerprint, idempotencyKey, response, httpStatus: status, error: '' }
  } catch (error) {
    if (error.status === 401 || error.status === 403) state.view = 'denied'
    state.request = { phase: 'failed', fingerprint, idempotencyKey, response: null, error: error.message }
  }
  render()
}

const bindEvents = () => {
  document.querySelector('#retry-button')?.addEventListener('click', initialize)
  document.querySelectorAll('[data-template-id]').forEach((button) => button.addEventListener('click', () => {
    state.selectedTemplateId = button.dataset.templateId
    state.validation = { ...state.validation, template: '' }
    render()
  }))
  document.querySelector('#provision-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    submitProvisioning(event.currentTarget)
  })
}

async function initialize() {
  if (!apiBaseUrl) {
    state.view = 'unavailable'
    render()
    return
  }

  state.view = 'loading-session'
  state.error = ''
  render()

  try {
    const { payload: session } = await request(apiRoutes.session)
    state.session = session
    if (!sessionIsAuthenticated(session) || !hasProvisionPermission(session)) {
      state.view = 'denied'
      render()
      return
    }

    state.view = 'loading-templates'
    render()
    const { payload } = await request(apiRoutes.templates)
    state.templates = approvedTemplates(payload)
    state.selectedTemplateId = state.templates.some((template) => templateId(template) === state.selectedTemplateId)
      ? state.selectedTemplateId
      : templateId(state.templates[0])
    state.view = state.templates.length ? 'ready' : 'empty'
  } catch (error) {
    if (error.status === 401 || error.status === 403) state.view = 'denied'
    else {
      state.view = 'error'
      state.error = error.message
    }
  }
  render()
}

render()
initialize()
