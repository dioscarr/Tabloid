import './style.css'
import { mountSharedNav } from './shared-nav.js'
import { initializeContentAdapter } from './content-adapter.js'

const scenarios = {
  sample: {
    label: 'Sample snapshot',
    description: 'Illustrative records only. No dashboard API is connected.',
  },
  loading: {
    label: 'Loading',
    description: 'Waiting for a read-only dashboard API response.',
  },
  empty: {
    label: 'Empty result',
    description: 'The API responded, but there are no records for this view.',
  },
  error: {
    label: 'Partial failure',
    description: 'A source response failed. Other source groups remain independently visible.',
  },
}

const icon = (name) => ({
  overview: '⌂',
  applications: '◫',
  resources: '◌',
  delivery: '⇄',
  activity: '≋',
}[name])

const navItems = [
  ['overview', 'Overview'],
  ['applications', 'Applications'],
  ['resources', 'Resources'],
  ['delivery', 'Delivery'],
  ['activity', 'Activity'],
]

const metricCards = [
  ['Published branches', '4', 'Example inventory', 'No live adapter'],
  ['Observed capacity', '61%', 'Sample memory ratio', 'Not a health claim'],
  ['Pending attention', '2', 'Example signals', 'Review before action'],
  ['Latest snapshot', '—', 'No API connected', 'Unknown freshness'],
]

const appRows = [
  ['Daily reporting', 'main', 'Sample only', 'Unknown', 'Not collected'],
  ['Editorial tools', 'admin', 'Sample only', 'Unknown', 'Not collected'],
  ['Special edition', 'big-news', 'Sample only', 'Unknown', 'Not collected'],
  ['Control Center', 'dashboard', 'Sample only', 'Unknown', 'Not collected'],
]

const activity = [
  ['Snapshot schema prepared', 'fixture adapter', 'Example event — no collector is connected.', 'Illustrative'],
  ['Route probe awaiting source', 'network', 'A real probe result will identify its layer and observed time.', 'Unknown'],
  ['Forecast withheld', 'projection', 'Forecasts require qualified historical samples before display.', 'Expected'],
]

const renderMetricCards = () => metricCards.map(([label, value, detail, status]) => `
  <article class="metric-card">
    <p>${label}</p>
    <strong>${value}</strong>
    <div><span>${detail}</span><span>${status}</span></div>
  </article>
`).join('')

const renderApplications = () => `
  <div class="table-scroll">
    <table>
      <caption class="sr-only">Example application inventory. Values are not connected to a live source.</caption>
      <thead><tr><th>Application</th><th>Branch</th><th>Commit</th><th>Route probe</th><th>Freshness</th></tr></thead>
      <tbody>${appRows.map(([name, branch, commit, route, freshness]) => `
        <tr>
          <td><strong>${name}</strong><small>Demonstration record</small></td>
          <td><code>${branch}</code></td>
          <td><span class="status neutral">◌ ${commit}</span></td>
          <td><span class="status neutral">◌ ${route}</span></td>
          <td>${freshness}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
`

const renderSample = () => `
  <section class="metrics-grid" aria-label="Prototype summary metrics">${renderMetricCards()}</section>
  <section class="dashboard-grid">
    <article class="panel resource-panel" id="resources" aria-labelledby="resource-title">
      <div class="panel-heading">
        <div><p class="eyebrow">Resource history</p><h2 id="resource-title">Capacity needs a live source</h2></div>
        <span class="status neutral">◌ Unknown freshness</span>
      </div>
      <p class="muted">This example chart demonstrates the dashboard layout. It is not an observation of a host, VM, container runtime, or route.</p>
      <figure class="sample-chart" aria-labelledby="chart-caption">
        <div class="chart-bars" aria-hidden="true">${[35, 47, 38, 57, 48, 63, 52, 71, 60, 76, 68, 82].map((height, index) => `<span class="${index > 8 ? 'projected' : ''}" style="height:${height}%"></span>`).join('')}</div>
        <figcaption id="chart-caption"><span>Example history</span><span>Now</span><span>Example projection</span></figcaption>
      </figure>
      <dl class="resource-list">
        <div><dt>Windows host</dt><dd>Unknown <small>Awaiting host collector</small></dd></div>
        <div><dt>Podman storage</dt><dd>Unknown <small>Awaiting Podman collector</small></dd></div>
        <div><dt>Reclaimable storage</dt><dd>Unknown <small>Never removed here</small></dd></div>
      </dl>
    </article>
    <article class="panel forecast-panel" aria-labelledby="forecast-title">
      <div class="panel-heading">
        <div><p class="eyebrow">Forecast</p><h2 id="forecast-title">Not enough evidence</h2></div>
      </div>
      <div class="forecast-mark" aria-hidden="true">?</div>
      <p class="muted">A forecast appears only after enough recent samples meet the model’s confidence threshold.</p>
      <dl class="compact-list">
        <div><dt>Model</dt><dd>Withheld</dd></div>
        <div><dt>Samples</dt><dd>0 available</dd></div>
        <div><dt>Confidence</dt><dd>Unknown</dd></div>
      </dl>
    </article>
  </section>
  <section class="panel applications-panel" id="applications" aria-labelledby="applications-title">
    <div class="panel-heading">
      <div><p class="eyebrow">Inventory</p><h2 id="applications-title">Applications and branches</h2><p class="muted">Production data will include branch HEAD, deployed SHA, image digest, route layer, and observed time.</p></div>
      <a class="text-link" href="#delivery">View delivery model <span aria-hidden="true">→</span></a>
    </div>
    ${renderApplications()}
  </section>
  <section class="activity-grid">
    <article class="panel" id="delivery" aria-labelledby="delivery-title">
      <div class="panel-heading"><div><p class="eyebrow">Delivery trace</p><h2 id="delivery-title">Awaiting workflow records</h2></div><span class="status neutral">◌ Not connected</span></div>
      <ol class="delivery-path">
        <li><span>1</span><div><strong>Build</strong><p>Workflow run and commit will appear here.</p></div></li>
        <li><span>2</span><div><strong>Publish</strong><p>Image digest is unknown until collected.</p></div></li>
        <li><span>3</span><div><strong>Reconcile</strong><p>Deployment age is unavailable without preview state.</p></div></li>
        <li><span>4</span><div><strong>Probe</strong><p>Route status distinguishes DNS, Serve, sidecar, and app layers.</p></div></li>
      </ol>
    </article>
    <article class="panel" id="activity" aria-labelledby="activity-title">
      <div class="panel-heading"><div><p class="eyebrow">Activity</p><h2 id="activity-title">Example event timeline</h2></div></div>
      <ol class="activity-list">${activity.map(([title, source, message, time]) => `
        <li><span class="timeline-dot" aria-hidden="true"></span><div><strong>${title}</strong><p><code>${source}</code> ${message}</p></div><time>${time}</time></li>`).join('')}
      </ol>
    </article>
  </section>
`

const renderState = (state) => {
  if (state === 'loading') return `
    <section class="state-panel" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <h2>Loading dashboard sources</h2>
      <p>A production dashboard will request each read-only source independently so one failure does not hide other results.</p>
      <div class="skeleton-grid" aria-hidden="true"><span></span><span></span><span></span></div>
    </section>`

  if (state === 'empty') return `
    <section class="state-panel" role="status">
      <span class="state-icon" aria-hidden="true">◌</span>
      <h2>No records in this result</h2>
      <p>The source responded successfully but did not return records for the selected range. Unknown values remain distinct from zero.</p>
      <button class="button secondary" type="button" data-scenario="sample">Return to sample snapshot</button>
    </section>`

  if (state === 'error') return `
    <section class="state-panel error-state" role="alert">
      <span class="state-icon" aria-hidden="true">!</span>
      <h2>A source could not be read</h2>
      <p>This is a demonstration failure state, not a live request. A production response will name the failed source, error, and last observed time without substituting fixture data.</p>
      <div class="state-actions"><button class="button secondary" type="button" data-scenario="sample">Show sample snapshot</button><a class="text-link" href="#activity">See event model <span aria-hidden="true">→</span></a></div>
    </section>`

  return renderSample()
}

document.title = 'Dashboard | Tabloid Control Center'
document.querySelector('#app').innerHTML = `
  <div class="control-center">
    <a class="skip-link" href="#main-content">Skip to dashboard content</a>
    <div class="sidebar-backdrop" data-sidebar-backdrop hidden></div>
    <aside class="dashboard-sidebar" aria-label="Control Center navigation" data-sidebar>
      <div class="sidebar-brand"><span class="brand-mark" aria-hidden="true">T</span><span><strong>Tabloid</strong><small>Control Center</small></span></div>
      <nav>${navItems.map(([key, label], index) => `<a href="#${key}" class="${index === 0 ? 'active' : ''}"><span aria-hidden="true">${icon(key)}</span>${label}</a>`).join('')}</nav>
      <div class="sidebar-note"><span class="status neutral">◌ Prototype workspace</span><p>Read-only dashboard interface. Changes belong in Admin.</p></div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="topbar-title">
          <button class="menu-button" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="dashboard-sidebar" data-menu-button>☰</button>
          <div><p class="eyebrow">Tabloid Control Center</p><h1>Dashboard</h1></div>
        </div>
        <div class="topbar-actions">
          <span data-shared-nav-slot class="shared-nav-slot"></span>
          <label class="sr-only" for="scenario">Dashboard demonstration state</label>
          <select id="scenario" class="scenario-select" data-scenario-select>
            ${Object.entries(scenarios).map(([value, { label }]) => `<option value="${value}">${label}</option>`).join('')}
          </select>
          <button class="icon-button" type="button" aria-label="Use light theme" aria-pressed="false" data-theme-button>◐</button>
        </div>
      </header>
      <main id="main-content">
        <section class="hero" id="overview" aria-labelledby="overview-title">
          <div><p class="eyebrow">Read-only operational view</p><h2 id="overview-title">Clarity for every branch, without pretending to know.</h2><p>Dashboard will make system freshness, unknowns, and partial failures explicit. It explains operational signals; privileged actions remain in Admin.</p></div>
          <div class="hero-actions"><button class="button primary" type="button" data-refresh>Refresh sample view <span aria-hidden="true">↻</span></button><a class="button secondary" href="#applications">Browse inventory <span aria-hidden="true">↓</span></a></div>
        </section>
        <section class="source-banner" aria-label="Data source status">
          <div><span class="status neutral">◌ ${scenarios.sample.label}</span><p data-scenario-description>${scenarios.sample.description}</p></div>
          <a href="#delivery">How dashboard data is collected <span aria-hidden="true">→</span></a>
        </section>
        <div data-dashboard-content>${renderSample()}</div>
      </main>
      <footer><span>Tabloid Control Center · Prototype interface</span><span>AdminToolkit-inspired layout · attribution in repository notices</span></footer>
    </div>
    <div class="toast" role="status" aria-live="polite" data-toast hidden></div>
  </div>
`

mountSharedNav()
initializeContentAdapter('dashboard')

const root = document.documentElement
const content = document.querySelector('[data-dashboard-content]')
const selector = document.querySelector('[data-scenario-select]')
const description = document.querySelector('[data-scenario-description]')
const toast = document.querySelector('[data-toast]')
const sidebar = document.querySelector('[data-sidebar]')
const backdrop = document.querySelector('[data-sidebar-backdrop]')
const menuButton = document.querySelector('[data-menu-button]')
let toastTimer

const showToast = (message) => {
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.hidden = true }, 4000)
}

const closeMenu = () => {
  sidebar.classList.remove('open')
  backdrop.hidden = true
  menuButton.setAttribute('aria-expanded', 'false')
}

const setScenario = (state) => {
  selector.value = state
  content.innerHTML = renderState(state)
  description.textContent = scenarios[state].description
  if (state !== 'sample') document.querySelector('.source-banner .status').textContent = `◌ ${scenarios[state].label}`
  else document.querySelector('.source-banner .status').textContent = `◌ ${scenarios.sample.label}`
}

selector.addEventListener('change', () => setScenario(selector.value))
document.addEventListener('click', (event) => {
  const scenarioButton = event.target.closest('[data-scenario]')
  if (scenarioButton) setScenario(scenarioButton.dataset.scenario)
})
document.querySelector('[data-refresh]').addEventListener('click', () => {
  setScenario('loading')
  window.setTimeout(() => {
    setScenario('sample')
    showToast('Sample snapshot refreshed. No live dashboard API was called.')
  }, 650)
})
menuButton.addEventListener('click', () => {
  const open = !sidebar.classList.contains('open')
  sidebar.classList.toggle('open', open)
  backdrop.hidden = !open
  menuButton.setAttribute('aria-expanded', String(open))
})
backdrop.addEventListener('click', closeMenu)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu()
})

const savedTheme = localStorage.getItem('tabloid-dashboard-theme')
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const setTheme = (theme) => {
  root.dataset.theme = theme
  const isDark = theme === 'dark'
  const button = document.querySelector('[data-theme-button]')
  button.setAttribute('aria-label', `Use ${isDark ? 'light' : 'dark'} theme`)
  button.setAttribute('aria-pressed', String(isDark))
  button.textContent = isDark ? '☀' : '◐'
}
setTheme(savedTheme || (systemDark ? 'dark' : 'light'))
document.querySelector('[data-theme-button]').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  localStorage.setItem('tabloid-dashboard-theme', next)
  setTheme(next)
})
