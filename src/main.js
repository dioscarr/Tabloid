import './style.css'
import { mountSharedNav } from './shared-nav.js'

const defaultAdminApiUrl = 'https://tabloid-copilot-admin-production-foundation-24deb8.tail70b7f1.ts.net'
const apiBaseUrl = String(import.meta.env.VITE_ADMIN_API_URL || defaultAdminApiUrl).trim().replace(/\/+$/, '')
const apiRoutes = Object.freeze({
  session: '/api/v1/session',
  applications: '/api/v1/applications',
  intents: '/api/v1/app-intents',
  templates: '/api/v1/app-templates',
  provision: '/api/v1/applications/provision',
})
const reservedNames = new Set(['admin', 'api', 'app-gallery', 'auth', 'brain', 'root', 'system', 'www'])

const state = {
  view: apiBaseUrl ? 'loading-session' : 'gallery',
  session: null,
  templates: [],
  applications: [],
  selectedTemplateId: '',
  intent: {
    draft: { description: '', audience: '', goal: '' },
    validation: {},
    phase: 'idle',
    fingerprint: '',
    idempotencyKey: '',
    decomposition: null,
    error: '',
  },
  provisionDraft: { displayName: '', appId: '', branch: '' },
  provisionValidation: {},
  request: { phase: 'idle', fingerprint: '', idempotencyKey: '', response: null, error: '' },
  error: '',
  errorContext: '',
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
const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null
const asString = (value) => typeof value === 'string' ? value.trim() : ''
const firstString = (...values) => values.map(asString).find(Boolean) || ''
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null)

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
const applicationId = (application) => String(application?.id || application?.slug || application?.branch || '')
const applicationName = (application) => String(application?.name || application?.displayName || applicationId(application))
const applicationDescription = (application) => String(application?.description || application?.summary || '')
const applicationUrl = (application) => {
  const candidate = application?.url || application?.appUrl || application?.previewUrl
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

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

const decompositionValue = (decomposition, names) => firstDefined(...names.map((name) => decomposition?.[name]))
const decompositionArray = (decomposition, names) => {
  const value = decompositionValue(decomposition, names)
  return Array.isArray(value) ? value : []
}
const decompositionTitle = (decomposition) => firstString(
  decomposition?.title,
  decomposition?.appTitle,
  decomposition?.application?.title,
  decomposition?.application?.name,
)
const decompositionSummary = (decomposition) => firstString(
  decomposition?.summary,
  decomposition?.application?.summary,
)
const decompositionSlug = (decomposition) => firstString(
  decomposition?.slug,
  decomposition?.appSlug,
  decomposition?.application?.slug,
)
const decompositionBranch = (decomposition) => firstString(
  decomposition?.branchSuggestion,
  decomposition?.suggestedBranch,
  decomposition?.branch,
  decomposition?.application?.branchSuggestion,
)
const decompositionPages = (decomposition) => decompositionArray(decomposition, ['proposedPages', 'pages'])
const decompositionNavigation = (decomposition) => decompositionArray(decomposition, ['navigation', 'proposedNavigation'])
const decompositionEntities = (decomposition) => decompositionArray(decomposition, ['entities', 'proposedEntities'])
const decompositionCriteria = (decomposition) => decompositionArray(decomposition, ['acceptanceCriteria', 'criteria'])
const decompositionTasks = (decomposition) => decompositionArray(decomposition, ['taskSlices', 'tasks'])
const pagePurpose = (page) => asString(asObject(page)?.purpose)
const pageName = (page) => firstString(asObject(page)?.name, asObject(page)?.title, asObject(page)?.label, asObject(page)?.path)
const incompletePages = (decomposition) => decompositionPages(decomposition).filter((page) => !pagePurpose(page))

const isReviewableDecomposition = (decomposition) => {
  if (!asObject(decomposition)) return false
  if (!decompositionTitle(decomposition) || !decompositionSummary(decomposition) || !decompositionSlug(decomposition) || !decompositionBranch(decomposition)) return false
  return [
    ['proposedPages', 'pages'],
    ['navigation', 'proposedNavigation'],
    ['entities', 'proposedEntities'],
    ['acceptanceCriteria', 'criteria'],
    ['taskSlices', 'tasks'],
  ].every((names) => Array.isArray(decompositionValue(decomposition, names)))
}

const returnedDecomposition = (payload) => {
  const candidates = [
    payload?.decomposition,
    payload?.appIntent?.decomposition,
    payload?.intent?.decomposition,
    payload?.result?.decomposition,
    payload,
  ]
  return candidates.find(isReviewableDecomposition) || null
}

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

const validateProvisionDraft = (draft) => {
  const errors = {}
  if (!state.selectedTemplateId) errors.template = 'Select an approved template.'
  if (draft.displayName.length < 3 || draft.displayName.length > 80) errors.displayName = 'Enter an application display name between 3 and 80 characters.'
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(draft.appId)) errors.appId = 'Use 2–63 lowercase letters, numbers, and hyphens, starting with a letter.'
  else if (reservedNames.has(draft.appId)) errors.appId = 'This application ID is reserved for platform use.'
  const branchError = validateBranch(draft.branch)
  if (branchError) errors.branch = branchError
  return errors
}

const validateIntentDraft = (draft) => {
  const errors = {}
  if (draft.description.length < 20) errors.description = 'Describe the application in at least 20 characters.'
  if (draft.description.length > 4_000) errors.description = 'Keep the application description to 4,000 characters or fewer.'
  if (draft.audience.length > 240) errors.audience = 'Keep the audience to 240 characters or fewer.'
  if (draft.goal.length > 240) errors.goal = 'Keep the goal to 240 characters or fewer.'
  return errors
}

const readableStatus = (value) => String(value || 'Accepted').replace(/[-_]/g, ' ')
const requestIdFrom = (payload) => payload?.requestId || payload?.request?.id || payload?.id || payload?.provisioningRequestId
const requestStatusFrom = (payload) => payload?.status || payload?.request?.status || payload?.provisioning?.status
const createIdempotencyKey = () => globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `app-gallery-${Date.now()}-${Math.random().toString(36).slice(2)}`

const statusCard = () => {
  if (state.request.phase === 'idle') {
    return '<section class="status-card status-card--quiet" aria-labelledby="request-status-title"><div><p class="status-kicker">Request status</p><h2 id="request-status-title">No provisioning request submitted</h2></div><p>Complete the reviewed form to send one idempotent request to the Admin API. This browser cannot create branches, repositories, containers, or credentials.</p></section>'
  }

  if (state.request.phase === 'submitting') {
    return '<section class="status-card" aria-live="polite" aria-busy="true"><div><p class="status-kicker">Request status</p><h2>Submitting to the Admin API</h2></div><p>Your idempotency key is retained while this request is in progress.</p></section>'
  }

  if (state.request.phase === 'accepted') {
    const response = state.request.response || {}
    const requestId = requestIdFrom(response)
    const remoteStatus = requestStatusFrom(response)
    return `<section class="status-card status-card--success" aria-live="polite"><div><p class="status-kicker">Request status</p><h2>Provisioning request acknowledged</h2></div><dl class="request-details"><div><dt>Admin API response</dt><dd>${escapeHtml(remoteStatus ? readableStatus(remoteStatus) : `HTTP ${state.request.httpStatus}`)}</dd></div>${requestId ? `<div><dt>Request ID</dt><dd class="break-all">${escapeHtml(requestId)}</dd></div>` : ''}<div><dt>Idempotency key</dt><dd class="break-all">${escapeHtml(state.request.idempotencyKey)}</dd></dl><p>The Admin API acknowledged this request. Provisioning remains server-side; this browser has not created an application, branch, container, or credential.</p></section>`
  }

  return `<section class="status-card status-card--error" aria-live="assertive"><div><p class="status-kicker">Request status</p><h2>Provisioning request failed</h2></div><p>${escapeHtml(state.request.error || 'The Admin API did not accept this request.')}</p><p>Correct the form or service issue and retry. The same idempotency key will be sent again for this unchanged request.</p></section>`
}

const intentError = (name) => state.intent.validation[name] ? `<p id="intent-${name}-error" class="field-error">${escapeHtml(state.intent.validation[name])}</p>` : ''
const intentInvalidAttribute = (name) => state.intent.validation[name] ? `aria-invalid="true" aria-describedby="intent-${name}-hint intent-${name}-error"` : `aria-describedby="intent-${name}-hint"`
const provisionError = (name) => state.provisionValidation[name] ? `<p id="${name}-error" class="field-error">${escapeHtml(state.provisionValidation[name])}</p>` : ''
const provisionInvalidAttribute = (name) => state.provisionValidation[name] ? `aria-invalid="true" aria-describedby="${name}-error"` : ''

const intentFormView = () => `<section class="intent-panel" aria-labelledby="intent-title">
  <div class="panel-heading"><p class="eyebrow">Step 0 · Application intent</p><h2 id="intent-title">Describe the application you want</h2><p>Start with the outcome. The Admin API analyzes this request and returns a draft for your review; this browser does not invent pages, tasks, or implementation details.</p></div>
  <form id="app-intent-form" novalidate>
    <label class="field-label" for="app-description">Describe the application you want<span aria-hidden="true"> *</span></label>
    <textarea id="app-description" name="description" class="field-input field-textarea" rows="8" maxlength="4000" minlength="20" required ${intentInvalidAttribute('description')}>${escapeHtml(state.intent.draft.description)}</textarea>
    <p id="intent-description-hint" class="field-hint">At least 20 characters. Include the problem, important workflows, and constraints.</p>
    ${intentError('description')}
    <label class="field-label" for="app-audience">Audience</label>
    <input id="app-audience" name="audience" class="field-input" value="${escapeHtml(state.intent.draft.audience)}" maxlength="240" autocomplete="off" ${intentInvalidAttribute('audience')} />
    <p id="intent-audience-hint" class="field-hint">Who will use this application? Optional.</p>
    ${intentError('audience')}
    <label class="field-label" for="app-goal">Primary goal</label>
    <input id="app-goal" name="goal" class="field-input" value="${escapeHtml(state.intent.draft.goal)}" maxlength="240" autocomplete="off" ${intentInvalidAttribute('goal')} />
    <p id="intent-goal-hint" class="field-hint">What should a successful application enable? Optional.</p>
    ${intentError('goal')}
    <button class="submit-button" type="submit">Analyze application intent</button>
    <p class="submit-note">Submitting sends your description, audience, goal, and an idempotency key to the configured Admin API.</p>
  </form>
</section>`

const renderTemplate = (template) => {
  const id = templateId(template)
  const isSelected = id === state.selectedTemplateId
  const capabilities = capabilitiesFor(template)
  return `<button type="button" class="template-card${isSelected ? ' template-card--selected' : ''}" data-template-id="${escapeHtml(id)}" aria-pressed="${isSelected}" aria-describedby="template-${escapeHtml(id)}-details"><span class="template-card__heading"><span>${escapeHtml(templateName(template))}</span><span class="template-card__state">${isSelected ? 'Selected' : 'Approved'}</span></span>${templateDescription(template) ? `<span class="template-card__description">${escapeHtml(templateDescription(template))}</span>` : ''}<span id="template-${escapeHtml(id)}-details" class="template-card__capabilities">${capabilities.length ? capabilities.map((capability) => `<span>${escapeHtml(capability)}</span>`).join('') : '<span>No template capabilities were supplied by the Admin API.</span>'}</span></button>`
}

const genericItem = (item) => {
  const object = asObject(item)
  if (!object) return `<li>${escapeHtml(item)}</li>`
  const title = firstString(object.title, object.name, object.label, object.criterion, object.objective)
  const detail = firstString(object.description, object.summary, object.detail, object.value)
  return `<li>${title ? `<strong>${escapeHtml(title)}</strong>` : ''}${detail && detail !== title ? `<span>${escapeHtml(detail)}</span>` : ''}</li>`
}

const genericList = (items, emptyMessage) => items.length
  ? `<ul class="review-list">${items.map(genericItem).join('')}</ul>`
  : `<p class="review-empty">${escapeHtml(emptyMessage)}</p>`

const renderPages = (decomposition) => {
  const pages = decompositionPages(decomposition)
  if (!pages.length) return '<p class="review-empty">The Admin API returned no proposed pages. A proposed page is required before you can continue.</p>'
  return `<div class="page-list">${pages.map((page) => {
    const purpose = pagePurpose(page)
    return `<article class="page-card${purpose ? '' : ' page-card--incomplete'}"><div><h4>${escapeHtml(pageName(page) || 'Proposed page')}</h4>${purpose ? `<p>${escapeHtml(purpose)}</p>` : '<p class="field-error">Incomplete: the Admin API did not return a purpose for this page.</p>'}</div>${purpose ? '' : '<span class="incomplete-badge">Purpose required</span>'}</article>`
  }).join('')}</div>`
}

const agentHintsFor = (task) => {
  const value = firstDefined(asObject(task)?.agentHints, asObject(task)?.agentHint, asObject(task)?.agents)
  return Array.isArray(value) ? value : asString(value) ? [value] : []
}

const renderTasks = (tasks) => {
  if (!tasks.length) return '<p class="review-empty">The Admin API returned no task slices.</p>'
  return `<div class="task-list">${tasks.map((task) => {
    const object = asObject(task)
    const title = firstString(object?.title, object?.name, object?.slice, object?.objective)
    const detail = firstString(object?.description, object?.summary, object?.detail)
    const hints = agentHintsFor(task)
    return `<article class="task-card"><h4>${escapeHtml(title || 'Task slice')}</h4>${detail ? `<p>${escapeHtml(detail)}</p>` : ''}<p class="task-card__label">Agent hints</p>${hints.length ? `<ul class="agent-hints">${hints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join('')}</ul>` : '<p class="review-empty">No agent hints were returned for this task slice.</p>'}</article>`
  }).join('')}</div>`
}

const reviewView = () => {
  const decomposition = state.intent.decomposition
  const missingPurpose = incompletePages(decomposition)
  const hasNoPages = !decompositionPages(decomposition).length
  const progressionBlocked = hasNoPages || missingPurpose.length > 0
  return `<section class="review-panel" aria-labelledby="review-title">
    <div class="panel-heading"><p class="eyebrow">Step 1 · Review draft</p><h2 id="review-title">${escapeHtml(decompositionTitle(decomposition))}</h2><p>${escapeHtml(decompositionSummary(decomposition))}</p></div>
    ${progressionBlocked ? '<section class="incomplete-notice" role="alert"><strong>Draft incomplete</strong><p>Every proposed page needs a purpose before template selection and provisioning can continue. Submit a revised description to request a new server-generated draft.</p></section>' : ''}
    <dl class="draft-details"><div><dt>Suggested app slug</dt><dd>${escapeHtml(decompositionSlug(decomposition))}</dd></div><div><dt>Suggested branch</dt><dd>${escapeHtml(decompositionBranch(decomposition))}</dd></div></dl>
    <div class="review-grid">
      <section class="review-section"><h3>Proposed pages</h3>${renderPages(decomposition)}</section>
      <section class="review-section"><h3>Navigation</h3>${genericList(decompositionNavigation(decomposition), 'The Admin API returned no navigation items.')}</section>
      <section class="review-section"><h3>Entities</h3>${genericList(decompositionEntities(decomposition), 'The Admin API returned no entities.')}</section>
      <section class="review-section"><h3>Acceptance criteria</h3>${genericList(decompositionCriteria(decomposition), 'The Admin API returned no acceptance criteria.')}</section>
      <section class="review-section review-section--wide"><h3>Task slices</h3>${renderTasks(decompositionTasks(decomposition))}</section>
    </div>
    <div class="review-actions"><button class="submit-button" type="button" data-action="approve-draft" ${progressionBlocked ? 'disabled aria-describedby="review-blocked-note"' : ''}>Use this reviewed draft</button>${progressionBlocked ? '<p id="review-blocked-note" class="submit-note">Template selection remains unavailable until all proposed pages have a purpose.</p>' : ''}<button class="secondary-button" type="button" data-action="revise-intent">Revise application description</button></div>
  </section>`
}

const provisionFormView = () => {
  const template = selectedTemplate()
  const capabilities = template ? capabilitiesFor(template) : []
  return `<section class="gallery-layout" aria-label="Application provisioning">
    <div class="template-panel">
      <div class="panel-heading"><p class="eyebrow">Step 2 · Approved template</p><h2>Choose a starting point</h2><p>Only templates returned by the authorized Admin API are available.</p></div>
      <div class="template-list" role="group" aria-label="Approved templates">${state.templates.map(renderTemplate).join('')}</div>
    </div>
    <form id="provision-form" class="provision-form" novalidate>
      <div class="panel-heading"><p class="eyebrow">Step 3 · Application details</p><h2>Confirm the request</h2><p>Values were pre-filled from the reviewed server-generated draft. The Admin API validates the selected template, identity, branch, authorization, and idempotency key.</p></div>
      <label class="field-label" for="display-name">App display name<span aria-hidden="true"> *</span></label>
      <input id="display-name" name="displayName" class="field-input" value="${escapeHtml(state.provisionDraft.displayName)}" maxlength="80" autocomplete="off" required ${provisionInvalidAttribute('displayName')} />
      ${provisionError('displayName')}
      <label class="field-label" for="app-id">App ID<span aria-hidden="true"> *</span></label>
      <input id="app-id" name="appId" class="field-input" value="${escapeHtml(state.provisionDraft.appId)}" maxlength="63" pattern="[a-z][a-z0-9-]{1,62}" autocomplete="off" required ${provisionInvalidAttribute('appId')} />
      <p class="field-hint">Pre-filled from the Admin API's suggested slug. Reserved platform names cannot be used.</p>
      ${provisionError('appId')}
      <label class="field-label" for="branch">Suggested branch<span aria-hidden="true"> *</span></label>
      <input id="branch" name="branch" class="field-input" value="${escapeHtml(state.provisionDraft.branch)}" maxlength="120" autocomplete="off" required ${provisionInvalidAttribute('branch')} />
      <p class="field-hint">Pre-filled from the reviewed draft. The Admin API must verify it; this app does not create branches.</p>
      ${provisionError('branch')}
      ${state.provisionValidation.template ? `<p id="template-error" class="field-error">${escapeHtml(state.provisionValidation.template)}</p>` : ''}
      <section class="capability-review" aria-labelledby="capability-review-title">
        <p class="eyebrow">Step 4 · Capability review</p>
        <h3 id="capability-review-title">${template ? escapeHtml(templateName(template)) : 'Select a template to review capabilities'}</h3>
        ${templateDescription(template) ? `<p>${escapeHtml(templateDescription(template))}</p>` : ''}
        <ul>${capabilities.length ? capabilities.map((capability) => `<li>${escapeHtml(capability)}</li>`).join('') : '<li>No capabilities are available until an approved template is selected.</li>'}</ul>
      </section>
      <button class="submit-button" type="submit" ${state.request.phase === 'submitting' ? 'disabled' : ''}>${state.request.phase === 'submitting' ? 'Submitting request…' : 'Submit provisioning request'}</button>
      <p class="submit-note">Submitting sends the selected template ID, reviewed application title and slug, suggested branch, and an idempotency key to the configured Admin API.</p>
    </form>
  </section>`
}

const unavailableView = () => {
  const configured = Boolean(apiBaseUrl)
  const title = configured ? 'Admin API unavailable' : 'Admin API not configured'
  const detail = configured
    ? `App Gallery could not reach the configured Admin API at ${apiBaseUrl}. Confirm the public endpoint is available and accepts this application origin, then retry.`
    : 'Set VITE_ADMIN_API_URL to the public origin of the Admin API, rebuild or restart Vite, and retry. Do not put credentials or privileged tokens in this value.'
  return `<section class="state-panel state-panel--warning" role="status" aria-live="polite"><p class="eyebrow">Connection required</p><h1>${title}</h1><p>${escapeHtml(detail)}</p>${configured ? '<button data-action="initialize" class="secondary-button" type="button">Retry connection</button>' : '<div class="state-actions"><button data-action="back-to-gallery" class="secondary-button" type="button">Back to gallery</button><code>VITE_ADMIN_API_URL=https://admin-api.example</code></div>'}</section>`
}

const deniedView = () => '<section class="state-panel state-panel--denied" role="alert"><p class="eyebrow">Access denied</p><h1>You cannot create or provision applications</h1><p>Your session did not include a confirmed application-provisioning permission. Ask an Admin API administrator to grant access, then sign in again.</p><button data-action="initialize" class="secondary-button" type="button">Check session again</button></section>'
const errorView = () => `<section class="state-panel state-panel--error" role="alert"><p class="eyebrow">Unable to load App Gallery</p><h1>The Admin API request failed</h1><p>${escapeHtml(state.error || 'The service did not return the required data.')}</p><button data-action="retry-error" class="secondary-button" type="button">Retry</button></section>`
const analyzingView = () => '<section class="state-panel state-panel--loading" role="status" aria-live="polite" aria-busy="true"><p class="eyebrow">Analyzing application intent</p><h1>Creating your server-generated draft</h1><p>The Admin API is decomposing your application description into reviewable pages, navigation, entities, acceptance criteria, and task slices. Nothing is generated in this browser.</p></section>'
const generationFailedView = () => `<section class="state-panel state-panel--error" role="alert"><p class="eyebrow">Draft generation failed</p><h1>The application draft was not available</h1><p>${escapeHtml(state.intent.error || 'The Admin API did not return a reviewable application decomposition.')}</p><button data-action="retry-intent" class="secondary-button" type="button">Try analysis again</button><button data-action="revise-intent" class="secondary-button" type="button">Revise description</button></section>`
const loadingView = (message) => `<section class="state-panel state-panel--loading" role="status" aria-live="polite" aria-busy="true"><p class="eyebrow">Loading</p><h1>${escapeHtml(message)}</h1><p>App Gallery is waiting for an authenticated response from the Admin API.</p></section>`
const emptyView = () => '<section class="state-panel state-panel--empty" role="status"><p class="eyebrow">No approved templates</p><h1>There are no templates available to provision</h1><p>The Admin API returned no approved templates for this session. Your reviewed draft has been retained; ask an administrator to publish a template or grant access, then retry.</p><button data-action="load-templates" class="secondary-button" type="button">Refresh templates</button><button data-action="back-to-review" class="secondary-button" type="button">Return to draft</button></section>'

const galleryView = () => `<section class="gallery-home" aria-labelledby="gallery-title">
  <div class="gallery-home__heading"><div><p class="eyebrow">Application gallery</p><h1 id="gallery-title">Explore your applications</h1><p>Open a live preview or start a new application from the governed template workflow.</p></div><button class="submit-button gallery-home__cta" type="button" data-action="create-app">Create new app</button></div>
  ${state.applications.length ? `<div class="app-gallery-grid">${state.applications.map((application) => {
    const url = applicationUrl(application)
    return `<article class="app-gallery-card" ${url ? `tabindex="0" role="link" data-app-url="${escapeHtml(url)}"` : ''}><div class="app-gallery-card__preview">${url ? `<iframe src="${escapeHtml(url)}" title="${escapeHtml(applicationName(application))} first-page preview" loading="lazy" sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>` : '<p>Preview URL is not available.</p>'}</div><div class="app-gallery-card__body"><div><h2>${escapeHtml(applicationName(application))}</h2>${applicationDescription(application) ? `<p>${escapeHtml(applicationDescription(application))}</p>` : ''}</div>${url ? `<a class="secondary-button" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open application</a>` : '<span class="unavailable-label">Preview unavailable</span>'}</div></article>`
  }).join('')}</div>` : '<div class="gallery-empty"><h2>No applications are registered yet</h2><p>Your first application will appear here after the Admin API completes provisioning.</p></div>'}
  <button class="create-app-card" type="button" data-action="create-app"><span aria-hidden="true">＋</span><span><strong>Create a new application</strong><small>Describe what you need, review the generated plan, and choose an approved template.</small></span></button>
</section>`

const heroView = () => '<section class="hero"><div><p class="eyebrow">Authorized application design</p><h1>Describe the application before choosing a template.</h1><p>Review the Admin API’s returned decomposition first. Template selection and provisioning become available only after you approve a complete draft.</p></div><div class="session-summary"><span class="session-summary__dot" aria-hidden="true"></span><span>Session verified by Admin API</span></div></section>'

const pageBody = () => {
  if (state.view === 'unavailable') return unavailableView()
  if (state.view === 'loading-session') return loadingView('Checking your session')
  if (state.view === 'loading-gallery') return loadingView('Loading application gallery')
  if (state.view === 'loading-templates') return loadingView('Loading approved templates')
  if (state.view === 'denied') return deniedView()
  if (state.view === 'error') return errorView()
  if (state.view === 'gallery') return galleryView()
  if (state.view === 'analyzing') return analyzingView()
  if (state.view === 'generation-failed') return generationFailedView()
  if (state.view === 'empty') return emptyView()
  if (state.view === 'review') return `${heroView()}${reviewView()}`
  if (state.view === 'provision') {
    return `${heroView()}<section class="review-summary" aria-label="Reviewed application draft"><p class="eyebrow">Reviewed draft</p><h2>${escapeHtml(decompositionTitle(state.intent.decomposition))}</h2><p>${escapeHtml(decompositionSummary(state.intent.decomposition))}</p><button class="secondary-button" type="button" data-action="back-to-review">View draft</button></section>${statusCard()}${provisionFormView()}`
  }
  return `${heroView()}${intentFormView()}`
}

const render = () => {
  document.title = 'App Gallery | Describe and provision applications'
  app.innerHTML = `<a class="skip-link" href="#main-content">Skip to application setup</a><div class="app-shell"><header class="site-header"><a class="product-mark" href="./" aria-label="App Gallery home"><span aria-hidden="true">AG</span><span><strong>App Gallery</strong><small>Describe, review, and provision</small></span></a><div class="header-actions"><div data-shared-nav-slot></div></div></header><main id="main-content" class="content-shell">${pageBody()}</main><footer class="site-footer">Requests are authorized, analyzed, and provisioned only by the Admin API. No privileged credentials are available in this browser.</footer></div>`
  mountSharedNav()
  bindEvents()
}

const captureIntentDraft = (form) => ({
  description: String(form.elements.description?.value || '').trim(),
  audience: String(form.elements.audience?.value || '').trim(),
  goal: String(form.elements.goal?.value || '').trim(),
})

const captureProvisionDraft = (form) => ({
  displayName: String(form.elements.displayName?.value || '').trim(),
  appId: String(form.elements.appId?.value || '').trim().toLowerCase(),
  branch: String(form.elements.branch?.value || '').trim(),
})

const focusFirstIntentError = () => document.querySelector(`[name="${Object.keys(state.intent.validation)[0]}"]`)?.focus()
const focusFirstProvisionError = () => {
  const field = Object.keys(state.provisionValidation).find((name) => name !== 'template')
  if (field) document.querySelector(`[name="${field}"]`)?.focus()
  else document.querySelector('[data-template-id]')?.focus()
}

const submitIntent = async (draft) => {
  const validation = validateIntentDraft(draft)
  state.intent = { ...state.intent, draft, validation, error: '' }
  if (Object.keys(validation).length) {
    state.view = 'ready'
    render()
    focusFirstIntentError()
    return
  }

  const payload = { description: draft.description, audience: draft.audience, goal: draft.goal }
  const fingerprint = JSON.stringify(payload)
  const idempotencyKey = state.intent.fingerprint === fingerprint && state.intent.idempotencyKey
    ? state.intent.idempotencyKey
    : createIdempotencyKey()
  state.intent = { ...state.intent, phase: 'analyzing', fingerprint, idempotencyKey, error: '' }
  state.view = 'analyzing'
  render()

  try {
    const { payload: response } = await request(apiRoutes.intents, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    })
    const decomposition = returnedDecomposition(response)
    if (!decomposition) throw new ApiError('The Admin API did not return a complete, reviewable application decomposition.')
    state.intent = { ...state.intent, phase: 'review', decomposition, error: '' }
    state.view = 'review'
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      state.view = 'denied'
    } else {
      state.intent = { ...state.intent, phase: 'failed', error: error.message }
      state.view = 'generation-failed'
    }
  }
  render()
}

const approveDraft = () => {
  const decomposition = state.intent.decomposition
  if (!decomposition || !decompositionPages(decomposition).length || incompletePages(decomposition).length) return
  state.provisionDraft = {
    displayName: decompositionTitle(decomposition),
    appId: decompositionSlug(decomposition),
    branch: decompositionBranch(decomposition),
  }
  state.provisionValidation = {}
  loadTemplates()
}

const submitProvisioning = async (form) => {
  const draft = captureProvisionDraft(form)
  const validation = validateProvisionDraft(draft)
  state.provisionDraft = draft
  state.provisionValidation = validation
  if (Object.keys(validation).length) {
    render()
    focusFirstProvisionError()
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

const reviseIntent = () => {
  state.intent = { ...state.intent, validation: {}, error: '' }
  state.view = 'ready'
  render()
}

const bindEvents = () => {
  document.querySelectorAll('[data-app-url]').forEach((card) => {
    const open = () => window.open(card.dataset.appUrl, '_blank', 'noopener,noreferrer')
    card.addEventListener('click', (event) => {
      if (event.target.closest('a')) return
      open()
    })
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    })
  })
  document.querySelector('[data-action="initialize"]')?.addEventListener('click', initialize)
  document.querySelector('[data-action="back-to-gallery"]')?.addEventListener('click', () => {
    state.view = 'gallery'
    render()
  })
  document.querySelectorAll('[data-action="create-app"]').forEach((button) => button.addEventListener('click', () => {
    if (!apiBaseUrl) {
      state.view = 'unavailable'
      render()
      return
    }
    state.view = 'ready'
    render()
  }))
  document.querySelector('[data-action="retry-error"]')?.addEventListener('click', () => {
    if (state.errorContext === 'templates') loadTemplates()
    else initialize()
  })
  document.querySelector('[data-action="load-templates"]')?.addEventListener('click', loadTemplates)
  document.querySelector('[data-action="approve-draft"]')?.addEventListener('click', approveDraft)
  document.querySelectorAll('[data-action="back-to-review"]').forEach((button) => button.addEventListener('click', () => {
    state.view = 'review'
    render()
  }))
  document.querySelectorAll('[data-action="revise-intent"]').forEach((button) => button.addEventListener('click', reviseIntent))
  document.querySelector('[data-action="retry-intent"]')?.addEventListener('click', () => submitIntent(state.intent.draft))
  document.querySelectorAll('[data-template-id]').forEach((button) => button.addEventListener('click', () => {
    state.selectedTemplateId = button.dataset.templateId
    state.provisionValidation = { ...state.provisionValidation, template: '' }
    render()
  }))
  document.querySelector('#app-intent-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    submitIntent(captureIntentDraft(event.currentTarget))
  })
  document.querySelector('#provision-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    submitProvisioning(event.currentTarget)
  })
}

async function loadTemplates() {
  state.view = 'loading-templates'
  state.error = ''
  state.errorContext = 'templates'
  render()

  try {
    const { payload } = await request(apiRoutes.templates)
    state.templates = approvedTemplates(payload)
    state.selectedTemplateId = state.templates.some((template) => templateId(template) === state.selectedTemplateId)
      ? state.selectedTemplateId
      : templateId(state.templates[0])
    state.view = state.templates.length ? 'provision' : 'empty'
  } catch (error) {
    if (error.status === 401 || error.status === 403) state.view = 'denied'
    else {
      state.view = 'error'
      state.error = error.message
    }
  }
  render()
}

async function initialize() {
  if (!apiBaseUrl) {
    state.view = 'unavailable'
    render()
    return
  }

  state.view = 'loading-session'
  state.error = ''
  state.errorContext = 'session'
  render()

  try {
    const { payload: session } = await request(apiRoutes.session)
    state.session = session
    if (!sessionIsAuthenticated(session) || !hasProvisionPermission(session)) {
      state.view = 'denied'
      render()
      return
    }
    state.view = 'loading-gallery'
    render()
    const { payload } = await request(apiRoutes.applications)
    state.applications = valuesFrom(payload?.data || payload?.applications || payload?.items || payload)
    state.view = 'gallery'
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
