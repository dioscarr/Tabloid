const apps = [
  { id: 'production', name: 'The Daily Echo', branch: 'main', role: 'Publishing surface' },
  { id: 'admin', name: 'Admin', branch: 'admin', role: 'Operations and lifecycle control' },
  { id: 'authorization', name: 'Authorization', branch: 'Authorization', role: 'Identity, policy, and approvals' },
  { id: 'brain', name: 'Brain', branch: 'brain', role: 'Intelligence, orchestration, and tool discovery' },
  { id: 'dashboard', name: 'Dashboard', branch: 'dashboard', role: 'Telemetry and capacity intelligence' },
  { id: 'big-news', name: 'Big News', branch: 'big-news', role: 'Personal technology briefing' },
  { id: 'ai-news', name: 'AI News', branch: 'apps/ai-news', role: 'AI project and engineering news' },
  { id: 'tech', name: 'Tech', branch: 'tech', role: 'Engineering discovery' }
]

const routes = apps.filter(({ id }) => id !== 'brain').flatMap((app) => [
  { id: `brain-${app.id}-tools`, from: 'brain', to: app.id, protocol: 'mcp', path: '/mcp', purpose: `Discover ${app.name} capabilities and invoke approved tools.`, health: 'planned' },
  { id: `${app.id}-brain-content`, from: app.id, to: 'brain', protocol: 'https', path: '/api/v1/content', purpose: `Generate and manage ${app.name} content proposals.`, health: 'prototype' }
])

const surfaces = {
  production: [{ id: 'home-hero', label: 'Homepage hero', fields: ['eyebrow', 'headline', 'summary', 'callToAction'] }],
  'big-news': [{ id: 'daily-brief', label: 'Daily briefing', fields: ['headline', 'takeaways', 'whyItMatters', 'sources'] }],
  tech: [{ id: 'project-showcase', label: 'Project showcase', fields: ['title', 'summary', 'stack', 'learningValue'] }],
  'ai-news': [{ id: 'project-showcase', label: 'Project showcase', fields: ['title', 'summary', 'stack', 'learningValue'] }],
  dashboard: [{ id: 'system-insight', label: 'System insight', fields: ['title', 'finding', 'impact', 'recommendation'] }],
  authorization: [{ id: 'policy-guidance', label: 'Policy guidance', fields: ['title', 'summary', 'risk', 'remediation'] }],
  admin: [{ id: 'operator-notice', label: 'Operator notice', fields: ['title', 'message', 'severity', 'action'] }],
  brain: [{ id: 'topology-insight', label: 'Topology insight', fields: ['title', 'finding', 'affectedRoutes', 'recommendation'] }]
}

const proposals = new Map()
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype

const getApp = (appId) => apps.find(({ id }) => id === appId) || null
const getSurface = (appId, surfaceId) => surfaces[appId]?.find(({ id }) => id === surfaceId) || null

const validateContentValues = (appId, surfaceId, values) => {
  const surface = getSurface(appId, surfaceId)
  if (!surface) throw new Error('Unknown application content surface.')
  if (!isPlainObject(values)) throw new Error('Content values must be an object.')

  const suppliedFields = Object.keys(values)
  if (suppliedFields.length !== surface.fields.length || surface.fields.some((field) => !hasOwn(values, field))) {
    throw new Error('Content values must contain every catalog field exactly once.')
  }

  return Object.fromEntries(surface.fields.map((field) => {
    const value = values[field]
    if (typeof value !== 'string' || value.length > 20000) throw new Error(`Invalid content value: ${field}`)
    return [field, value]
  }))
}

export const catalog = {
  listApps: () => apps.map((app) => ({ ...app })),
  getApp,
  listRoutes: (appId) => appId ? routes.filter(({ from, to }) => from === appId || to === appId) : routes,
  listSurfaces: (appId) => surfaces[appId]?.map((surface) => ({ ...surface, fields: [...surface.fields] })) ?? [],
  getSurface,
  validateContentValues,
  readContent: (appId, surfaceId) => {
    const surface = getSurface(appId, surfaceId)
    if (!surface) return null
    return { appId, surfaceId, status: 'prototype', values: Object.fromEntries(surface.fields.map((field) => [field, 'Connect the app content adapter to read this value.'])) }
  },
  saveProposal: (proposal) => { proposals.set(proposal.id, proposal); return proposal },
  getProposal: (id) => proposals.get(id)
}
