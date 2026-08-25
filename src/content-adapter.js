const BRAIN_API = 'https://tabloid-brain-api.tail70b7f1.ts.net'
const EDITABLE_SELECTOR = 'h1,h2,h3,h4,p,span,a,button,label,figcaption,li'

const visibleTextNode = (element) => [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
const pageId = () => (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index'
const sendTelemetrySignal = (appId) => {
  const sourceApp = appId.split('/').pop()
  fetch(`${BRAIN_API}/api/v1/telemetry/signals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sourceApp, targetRoute: '/api/v1/content', eventType: 'page_view', status: 200, durationMs: 0 }),
    keepalive: true,
  }).catch(() => {})
}

export async function initializeContentAdapter(appId) {
  const elements = [...document.querySelectorAll(`#app ${EDITABLE_SELECTOR}`)].filter((element) => {
    if (element.closest('tabloid-shared-nav,tabloid-brain-studio')) return false
    return Boolean(visibleTextNode(element))
  })
  const fields = elements.map((element, index) => {
    const node = visibleTextNode(element)
    const key = `${pageId()}.${element.tagName.toLowerCase()}.${String(index + 1).padStart(3, '0')}`
    element.dataset.cmsKey = key
    return { key, label: node.textContent.trim().slice(0, 100), value: node.textContent.trim(), element, node }
  })

  const apply = (values = {}) => fields.forEach((field) => {
    if (typeof values[field.key] === 'string') field.node.textContent = values[field.key]
  })
  const values = () => Object.fromEntries(fields.map((field) => [field.key, field.node.textContent.trim()]))

  let publishedValues = values()
  try {
    const response = await fetch(`${BRAIN_API}/api/v1/content/pages/${appId}/${pageId()}`, { cache: 'no-store' })
    if (response.ok) {
      const page = await response.json()
      if (page.published?.values) {
        apply(page.published.values)
        publishedValues = values()
      }
    }
  } catch { /* The static app remains usable when Brain is offline. */ }

  window.TabloidCMS = {
    appId,
    pageId: pageId(),
    fields: () => fields.map(({ key, label, node }) => ({ key, label, value: node.textContent.trim() })),
    values,
    apply,
    reset: () => apply(publishedValues),
    setPublished: (nextValues) => { apply(nextValues); publishedValues = values() }
  }
  sendTelemetrySignal(appId)
  window.dispatchEvent(new CustomEvent('tabloid:cms-ready'))
}
