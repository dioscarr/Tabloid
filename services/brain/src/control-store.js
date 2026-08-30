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
  { id: 'changelog', name: 'Changelog', category: 'Developer', description: 'Generate a formatted changelog from git history across repositories.', risk: 'read-only', defaultEnabled: true, approvalMode: 'automatic' },
  { id: 'content_propose', name: 'Propose content', category: 'AI workflow', description: 'Generate reviewable content without publishing.', risk: 'generative', defaultEnabled: true, approvalMode: 'review' },
  { id: 'content_publish', name: 'Publish content', category: 'Publishing', description: 'Publish an explicitly approved content revision.', risk: 'write', defaultEnabled: false, approvalMode: 'manual' }
]

export const skillDefinitions = [
  { id: 'content-strategist', name: 'Content strategist', description: 'Rewrites page copy while preserving app voice and field contracts.', instructions: '# Content strategist\n\nRead the current content and propose revised copy that preserves the application voice, required fields, and factual meaning. Never publish without explicit approval.', capabilities: ['content_read', 'content_propose'], apps: ['all'], defaultEnabled: true },
  { id: 'topology-analyst', name: 'Topology analyst', description: 'Explains routes, dependencies, degraded links, and architectural gaps.', instructions: '# Topology analyst\n\nInspect registered applications and routes, then explain dependencies, degraded links, and concrete architectural gaps with supporting route evidence.', capabilities: ['apps_list', 'routes_list'], apps: ['brain', 'dashboard'], defaultEnabled: true },
  { id: 'briefing-editor', name: 'Briefing editor', description: 'Shapes useful, source-aware technology briefings for Big News.', instructions: '# Briefing editor\n\nTurn verified source material into a concise technology briefing. Separate facts from interpretation and preserve source attribution.', capabilities: ['content_read', 'content_propose'], apps: ['big-news'], defaultEnabled: true },
  { id: 'release-manager', name: 'Release manager', description: 'Coordinates branch readiness, approval evidence, deployment, and rollback.', instructions: '# Release manager\n\nReview branch and route readiness, collect approval evidence, and produce a deployment and rollback checklist. Do not deploy automatically.', capabilities: ['apps_list', 'routes_list'], apps: ['admin', 'dashboard'], defaultEnabled: false },
  { id: 'incident-triage', name: 'Incident triage', description: 'Correlates route health and logs into actionable recovery guidance.', instructions: '# Incident triage\n\nCorrelate route health signals, identify likely impact, and recommend reversible recovery steps with clear uncertainty.', capabilities: ['routes_list'], apps: ['dashboard', 'brain'], defaultEnabled: false },
  { id: 'changelog-generator', name: 'Changelog generator', description: 'Produces structured release notes from conventional commit history across Tabloid repositories.', instructions: '# Changelog generator\n\nGenerate release notes by querying the Brain changelog tool across all Tabloid repositories. Filter by date range, repository, or commit type. Format as markdown grouped by conventional commit types (Features, Bug Fixes, etc.). Include breaking changes prominently. Output ready for CHANGELOG.md or release announcements.', capabilities: ['changelog', 'apps_list', 'git_status'], apps: ['admin', 'brain', 'dashboard'], defaultEnabled: true }
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
    const builtIn = skillDefinitions.flatMap((definition) => {
      const saved = state.skills[definition.id] || {}
      if (saved.deleted) return []
      return [{
        ...definition,
        ...Object.fromEntries(['name', 'description', 'instructions', 'capabilities', 'apps'].filter((key) => saved[key] !== undefined).map((key) => [key, saved[key]])),
        enabled: saved.enabled ?? definition.defaultEnabled,
        builtIn: true,
        updatedAt: saved.updatedAt ?? null
      }]
    })
    const custom = Object.values(state.skills).filter((skill) => skill.custom && !skill.deleted).map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      capabilities: [...skill.capabilities],
      apps: [...skill.apps],
      enabled: skill.enabled,
      builtIn: false,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt
    }))
    return [...builtIn, ...custom]
  },
  getSkill(id) { return this.listSkills().find((skill) => skill.id === id) || null },
  configureSkill(id, input, actor) {
    const existing = this.getSkill(id)
    if (!existing) throw new Error('Unknown skill.')
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.hasOwn(input, 'enabled') || typeof input.enabled !== 'boolean') throw new Error('Invalid skill configuration.')
    const store = readStore(); const state = control(store)
    state.skills[id] = { ...(state.skills[id] || {}), enabled: input.enabled, updatedAt: new Date().toISOString() }
    addActivity(state, actor, { type: 'skill.configuration', subject: id, message: `${input.enabled ? 'Enabled' : 'Disabled'} ${existing.name}` })
    writeStore(store)
    return this.getSkill(id)
  },
  createSkill(input, actor) {
    if (this.getSkill(input.id) || skillDefinitions.some((skill) => skill.id === input.id)) throw new Error('Skill already exists.')
    const store = readStore(); const state = control(store); const timestamp = new Date().toISOString()
    state.skills[input.id] = { ...input, capabilities: [...input.capabilities], apps: [...input.apps], custom: true, createdAt: timestamp, updatedAt: timestamp }
    addActivity(state, actor, { type: 'skill.created', subject: input.id, message: `Created ${input.name}` })
    writeStore(store)
    return this.getSkill(input.id)
  },
  updateSkill(id, input, actor) {
    const existing = this.getSkill(id)
    if (!existing) throw new Error('Unknown skill.')
    if (input.id !== id) throw new Error('Skill identifier cannot be changed.')
    const store = readStore(); const state = control(store); const saved = state.skills[id] || {}
    const editable = { name: input.name, description: input.description, instructions: input.instructions, capabilities: [...input.capabilities], apps: [...input.apps], enabled: input.enabled }
    state.skills[id] = { ...saved, ...editable, ...(existing.builtIn ? {} : { id, custom: true, createdAt: saved.createdAt || new Date().toISOString() }), updatedAt: new Date().toISOString() }
    addActivity(state, actor, { type: 'skill.updated', subject: id, message: `Updated ${input.name}` })
    writeStore(store)
    return this.getSkill(id)
  },
  deleteSkill(id, actor) {
    const existing = this.getSkill(id)
    if (!existing) throw new Error('Unknown skill.')
    const store = readStore(); const state = control(store)
    if (existing.builtIn) state.skills[id] = { ...(state.skills[id] || {}), deleted: true, updatedAt: new Date().toISOString() }
    else delete state.skills[id]
    addActivity(state, actor, { type: 'skill.deleted', subject: id, message: `Deleted ${existing.name}` })
    writeStore(store)
    return { id, name: existing.name }
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
