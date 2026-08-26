import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'

const states = {
  sample: ['Illustrative workspace', 'Representative records only. Live authorization data is not connected.'],
  loading: ['Loading access inventory', 'Requesting independent, read-only sources.'],
  empty: ['No records returned', 'The connected source returned no records for this scope.'],
  denied: ['Access not granted', 'This view requires an explicit server-side authorization decision.'],
  stale: ['Snapshot needs refresh', 'The last successful source snapshot is older than the configured freshness window.'],
  failure: ['Source unavailable', 'A source could not be read. No sample data is substituted for a failed response.'],
}

const sampleDecisions = [
  ['svc-example-index', 'Read application metadata', 'Brain', 'Low', 'Allowed'],
  ['example-editor', 'Request editorial workspace', 'Admin', 'Medium', 'Step-up required'],
  ['unrecognized-session', 'Read protected configuration', 'Authorization', 'High', 'Denied'],
]

const sampleApps = [
  ['Admin', 'Identity administration', 'Protected'],
  ['Brain', 'Content operations', 'Scoped'],
  ['Dashboard', 'Operational visibility', 'Read-only'],
]

const icon = (name) => ({
  overview: '◈',
  decisions: '⌁',
  applications: '▦',
  requests: '◌',
  audit: '≡',
  settings: '⚙',
}[name])

const renderDecisionRows = () => sampleDecisions.map(([subject, action, application, risk, result]) => `
  <button class="decision-row" type="button" data-decision="${result}">
    <span class="entity-mark" aria-hidden="true">${subject[0].toUpperCase()}</span>
    <span><strong>${subject}</strong><small>${action}</small></span>
    <span class="app-pill">${application}</span>
    <span class="risk ${risk.toLowerCase()}">${risk}</span>
    <span class="decision ${result === 'Allowed' ? 'allowed' : result === 'Denied' ? 'denied' : 'challenge'}">${result}</span>
    <span class="row-arrow" aria-hidden="true">→</span>
  </button>
`).join('')

const renderSample = () => `
  <section class="metrics" aria-label="Illustrative authorization metrics">
    <article><span class="metric-icon">⌁</span><p>Decision stream</p><strong>Sample</strong><small>No live event source</small></article>
    <article><span class="metric-icon">◇</span><p>Applications</p><strong>3</strong><small>Illustrative inventory</small></article>
    <article><span class="metric-icon">✓</span><p>Access reviews</p><strong>Unknown</strong><small>Awaiting source</small></article>
    <article><span class="metric-icon">!</span><p>Attention queue</p><strong>Unknown</strong><small>Not evaluated</small></article>
  </section>
  <section class="workspace-grid">
    <article class="panel decisions-panel" id="decisions">
      <div class="panel-heading"><div><p class="eyebrow">Decision activity</p><h2>Illustrative policy evaluations</h2><p>Example records demonstrate the review layout. They are not live authorization decisions.</p></div><button class="quiet-button" type="button" data-state="loading">Refresh view</button></div>
      <div class="table-labels"><span>Subject & action</span><span>Application</span><span>Risk</span><span>Result</span></div>
      <div class="decision-list">${renderDecisionRows()}</div>
      <button class="panel-footer" type="button" data-state="empty">View decision history <span>→</span></button>
    </article>
    <aside class="panel review-panel" id="requests">
      <div class="panel-heading"><div><p class="eyebrow">Review queue</p><h2>Requests need a source</h2></div><span class="status neutral">Unknown</span></div>
      <div class="empty-illustration" aria-hidden="true">◌</div>
      <p>Server-approved requests will appear with requester context, a scoped duration, and an auditable decision path.</p>
      <button class="secondary-button" type="button" data-state="loading">Check for requests</button>
    </aside>
  </section>
  <section class="panel application-panel" id="applications">
    <div class="panel-heading"><div><p class="eyebrow">Application inventory</p><h2>Protected application surfaces</h2><p>Application registrations are illustrative until the server API is connected.</p></div><button class="quiet-button" type="button" data-state="stale">View freshness</button></div>
    <div class="application-list">${sampleApps.map(([name, scope, posture]) => `<article><span class="application-icon">${name[0]}</span><div><strong>${name}</strong><small>${scope}</small></div><span class="status neutral">${posture}</span><button type="button" aria-label="Inspect ${name} application" data-inspect="${name}">Inspect <span>→</span></button></article>`).join('')}</div>
  </section>
`

const renderState = (state) => {
  if (state === 'sample') return renderSample()
  const [title, message] = states[state]
  const kind = state === 'failure' || state === 'denied' ? ' critical' : ''
  return `<section class="state-panel${kind}" role="${state === 'failure' || state === 'denied' ? 'alert' : 'status'}"><span class="state-symbol" aria-hidden="true">${state === 'loading' ? '◌' : state === 'denied' ? '⊘' : state === 'failure' ? '!' : '◇'}</span><p class="eyebrow">Authorization workspace</p><h2>${title}</h2><p>${message}</p><div><button class="secondary-button" type="button" data-state="sample">Return to sample workspace</button><button class="quiet-button" type="button" data-state="loading">Try read-only refresh</button></div></section>`
}

document.title = 'Authorization | Tabloid Control Plane'
document.querySelector('#app').innerHTML = `
  <div class="authorization-shell">
    <a class="skip-link" href="#main-content">Skip to access workspace</a>
    <aside class="sidebar" aria-label="Authorization navigation">
      <a class="brand" href="#overview"><span aria-hidden="true">◇</span><strong>Tabloid<small>Authorization</small></strong></a>
      <nav>
        <p>Control plane</p>
        ${[['overview', 'Overview'], ['decisions', 'Decisions'], ['applications', 'Applications'], ['requests', 'Access requests'], ['audit', 'Audit trail'], ['settings', 'Settings']].map(([key, label], index) => `<a href="#${key}" class="${index === 0 ? 'active' : ''}"><span aria-hidden="true">${icon(key)}</span>${label}</a>`).join('')}
      </nav>
      <div class="sidebar-card"><span class="status neutral">Read-only interface</span><p>Policy enforcement, identity records, and audit writes remain server-side.</p></div>
    </aside>
    <main>
      <header class="topbar">
        <button class="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">☰</button>
        <div class="crumb"><span>Control plane</span><strong>Authorization workspace</strong></div>
        <label class="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search when a source is connected" disabled><kbd>⌘ K</kbd></label>
        <div data-shared-nav-slot class="shared-nav-slot"></div>
        <label class="state-select"><span class="sr-only">Workspace display state</span><select data-state-select>${Object.entries(states).map(([key, [label]]) => `<option value="${key}">${label}</option>`).join('')}</select></label>
      </header>
      <div class="content" id="main-content">
        <section class="hero" id="overview"><div><p class="eyebrow">Access intelligence</p><h1>Decisions that are<br><em>clear by design.</em></h1><p>Review authorization posture without moving identity, policy evaluation, or audit writes into the browser.</p></div><div class="hero-card"><span class="hero-orbit" aria-hidden="true">◇</span><div><p>Default posture</p><strong>Deny until approved</strong><small>Enforced by the server decision layer</small></div></div></section>
        <section class="source-banner"><div><span class="status neutral" data-state-badge>Illustrative workspace</span><p data-state-description>${states.sample[1]}</p></div><button class="quiet-button" type="button" data-state="failure">View failure handling</button></section>
        <div data-workspace>${renderSample()}</div>
      </div>
    </main>
    <dialog data-dialog><button class="dialog-close" type="button" aria-label="Close details">×</button><p class="eyebrow">Read-only detail</p><h2>Evidence is server-owned</h2><p>Policy evidence, identity context, and audit references are requested through a protected server API. This prototype does not fabricate or mutate a decision.</p><button class="secondary-button" type="button" data-dialog-close>Close</button></dialog>
  </div>
`

mountSharedNav()
initializeContentAdapter('authorization')

const workspace = document.querySelector('[data-workspace]')
const selector = document.querySelector('[data-state-select]')
const badge = document.querySelector('[data-state-badge]')
const description = document.querySelector('[data-state-description]')
const dialog = document.querySelector('[data-dialog]')
const sidebar = document.querySelector('.sidebar')
const menuToggle = document.querySelector('.menu-toggle')

const setState = (state) => {
  selector.value = state
  workspace.innerHTML = renderState(state)
  badge.textContent = states[state][0]
  description.textContent = states[state][1]
}

document.addEventListener('click', (event) => {
  const stateButton = event.target.closest('[data-state]')
  if (stateButton) setState(stateButton.dataset.state)
  if (event.target.closest('[data-decision],[data-inspect]')) dialog.showModal()
  if (event.target.closest('[data-dialog-close],.dialog-close')) dialog.close()
})
selector.addEventListener('change', () => setState(selector.value))
menuToggle.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open')
  menuToggle.setAttribute('aria-expanded', String(open))
})
