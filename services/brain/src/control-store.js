import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const storePath = process.env.BRAIN_CONTENT_STORE || '/data/content.json'

export const toolDefinitions = [
  { id: 'apps_list', name: 'Applications', category: 'Discovery', description: 'List applications connected to Brain.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'routes_list', name: 'Routes', category: 'Discovery', description: 'Trace routes and dependencies across applications.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'telemetry_routes', name: 'Telemetry', category: 'Discovery', description: 'Read measured application traffic received by Brain.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'content_surfaces_list', name: 'Content surfaces', category: 'Content', description: 'Discover app-owned editable content surfaces.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'content_read', name: 'Read content', category: 'Content', description: 'Read the published content view for an app surface.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'branch_status', name: 'Branch status', category: 'Developer', description: 'Read current branch and commit status.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'workspace_status', name: 'Workspace status', category: 'Developer', description: 'Read workspace availability and change count.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'preview_status', name: 'Preview status', category: 'Developer', description: 'Read configured preview availability.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'git_status', name: 'Git status', category: 'Developer', description: 'Read Git status and diff metadata.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'code_server_context', name: 'Code-server context', category: 'Developer', description: 'Read sanitized code-server launch context.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'content_propose', name: 'Propose content', category: 'AI workflow', description: 'Generate reviewable content without publishing.', risk: 'generative', defaultEnabled: true, approvalMode: 'review' },
  { id: 'content_publish', name: 'Publish content', category: 'Publishing', description: 'Publish an explicitly approved content revision.', risk: 'write', defaultEnabled: false, approvalMode: 'manual' }
]

export const skillDefinitions = [
  { id: 'content-strategist', name: 'Content strategist', description: 'Rewrites page copy while preserving app voice and field contracts.', capabilities: ['content_read', 'content_propose'], apps: ['all'], defaultEnabled: true },
  { id: 'topology-analyst', name: 'Topology analyst', description: 'Explains routes, dependencies, degraded links, and architectural gaps.', capabilities: ['apps_list', 'routes_list'], apps: ['brain', 'dashboard'], defaultEnabled: true },
  { id: 'briefing-editor', name: 'Briefing editor', description: 'Shapes useful, source-aware technology briefings for Big News.', capabilities: ['content_read', 'content_propose'], apps: ['big-news'], defaultEnabled: true },
  { id: 'release-manager', name: 'Release manager', description: 'Coordinates branch readiness, approval evidence, deployment, and rollback.', capabilities: ['apps_list', 'routes_list'], apps: ['admin', 'dashboard'], defaultEnabled: false },
  { id: 'incident-triage', name: 'Incident triage', description: 'Correlates route health and logs into actionable recovery guidance.', capabilities: ['routes_list'], apps: ['dashboard', 'brain'], defaultEnabled: false }
]

const readStore = () => {
  try { return JSON.parse(readFileSync(storePath, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return { version: 1, pages: {} }; throw error }
}
const writeStore = (store) => {
  mkdirSync(dirname(storePath), { recursive: true })
  const temporary = `${storePath}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporary, storePath)
}
const control = (store) => {
  const state = (store.control ??= { tools: {}, skills: {}, activity: [], intents: [] })
  state.intents ??= []
  return state
}
const actorPattern = /^[a-z0-9][a-z0-9._:@/-]{0,127}$/i
const cleanActor = (actor) => {
  if (typeof actor !== 'string' || !actorPattern.test(actor)) throw new Error('Invalid actor identity.')
  return actor
}
const addActivity = (state, actor, event) => {
  state.activity.unshift({ id: randomUUID(), createdAt: new Date().toISOString(), actor: cleanActor(actor), ...event })
  state.activity = state.activity.slice(0, 100)
}

export const controlStore = {
  listTools() {
    const state = control(readStore())
    return toolDefinitions.map((definition) => ({ ...definition, enabled: state.tools[definition.id]?.enabled ?? definition.defaultEnabled, approvalMode: state.tools[definition.id]?.approvalMode ?? definition.approvalMode, updatedAt: state.tools[definition.id]?.updatedAt ?? null }))
  },
  isToolEnabled(id) { return this.listTools().find((tool) => tool.id === id)?.enabled === true },
  configureTool(id, input, actor) {
    const definition = toolDefinitions.find((tool) => tool.id === id)
    if (!definition) throw new Error('Unknown tool.')
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).every((key) => ['enabled', 'approvalMode'].includes(key)) || !Object.keys(input).length) throw new Error('Invalid tool configuration.')
    if (Object.hasOwn(input, 'enabled') && typeof input.enabled !== 'boolean') throw new Error('Tool enabled must be a boolean.')
    if (Object.hasOwn(input, 'approvalMode') && typeof input.approvalMode !== 'string') throw new Error('Invalid approval mode.')
    if (id === 'content_publish' && input.enabled === true) throw new Error('The MCP publish tool remains locked; use the explicit revision API until identity roles are enforced.')
    const store = readStore(); const state = control(store)
    const previous = state.tools[id] || {}
    const approvalMode = input.approvalMode ?? previous.approvalMode ?? definition.approvalMode
    if (!['automatic', 'review', 'manual', 'blocked'].includes(approvalMode)) throw new Error('Invalid approval mode.')
    state.tools[id] = { enabled: input.enabled ?? previous.enabled ?? definition.defaultEnabled, approvalMode, updatedAt: new Date().toISOString() }
    addActivity(state, actor, { type: 'tool.configuration', subject: id, message: `${state.tools[id].enabled ? 'Enabled' : 'Disabled'} ${definition.name} · ${approvalMode}` })
    writeStore(store)
    return this.listTools().find((tool) => tool.id === id)
  },
  listSkills() {
    const state = control(readStore())
    return skillDefinitions.map((definition) => ({ ...definition, enabled: state.skills[definition.id]?.enabled ?? definition.defaultEnabled, updatedAt: state.skills[definition.id]?.updatedAt ?? null }))
  },
  configureSkill(id, input, actor) {
    const definition = skillDefinitions.find((skill) => skill.id === id)
    if (!definition) throw new Error('Unknown skill.')
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'enabled') || typeof input.enabled !== 'boolean') throw new Error('Invalid skill configuration.')
    const store = readStore(); const state = control(store)
    state.skills[id] = { enabled: input.enabled, updatedAt: new Date().toISOString() }
    addActivity(state, actor, { type: 'skill.configuration', subject: id, message: `${state.skills[id].enabled ? 'Enabled' : 'Disabled'} ${definition.name}` })
    writeStore(store)
    return this.listSkills().find((skill) => skill.id === id)
  },
  saveIntent({ id, createdAt, actor, input, decomposition }) {
    if (typeof id !== 'string' || !id || typeof createdAt !== 'string' || !createdAt || !input || typeof input !== 'object' || !decomposition || typeof decomposition !== 'object') {
      throw new Error('Invalid intent decomposition.')
    }
    const store = readStore(); const state = control(store)
    const record = { id, createdAt, actor: cleanActor(actor), input, decomposition }
    state.intents.unshift(record)
    state.intents = state.intents.slice(0, 100)
    writeStore(store)
    return record
  },
  activity() { return control(readStore()).activity }
}
