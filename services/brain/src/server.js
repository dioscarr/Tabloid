import { createServer } from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { catalog } from './catalog.js'
import { decomposeIntentWithCopilot, generateWithCopilot, stopCopilot } from './copilot.js'
import { contentStore } from './content-store.js'
import { controlStore } from './control-store.js'
import { getLiveFeed } from './feed.js'
import { authorize } from './authorization.js'

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'
const maxBodyBytes = 64 * 1024
const browserOrigin = /^https:\/\/tabloid(?:-[a-z0-9-]+)?\.tail70b7f1\.ts\.net$/i
const actorPattern = /^[a-z0-9][a-z0-9._:@/-]{0,127}$/i
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/i
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } })
const textResult = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value })
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype

class RequestError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const readSecret = (value, file, name) => {
  const secret = value || (file ? readFileSync(file, 'utf8') : '')
  if (typeof secret !== 'string') throw new Error(`${name} must be a string.`)
  return secret.trim()
}

const normalizeOrigin = (value) => {
  if (!value) return ''
  let parsed
  try { parsed = new URL(value) } catch { throw new Error('BRAIN_ADMIN_ORIGIN must be an absolute HTTPS origin.') }
  if (parsed.protocol !== 'https:' || parsed.origin !== value.replace(/\/$/, '') || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('BRAIN_ADMIN_ORIGIN must be an HTTPS origin without a path, query, or credentials.')
  }
  return parsed.origin
}

const secretsMatch = (first, second) => {
  if (!first || !second) return false
  const left = Buffer.from(first)
  const right = Buffer.from(second)
  return left.length === right.length && timingSafeEqual(left, right)
}

export const readConfiguration = () => {
  const mcpToken = readSecret(process.env.BRAIN_MCP_TOKEN, process.env.BRAIN_MCP_TOKEN_FILE, 'BRAIN_MCP_TOKEN')
  const adminToken = readSecret(process.env.BRAIN_ADMIN_TOKEN, process.env.BRAIN_ADMIN_TOKEN_FILE, 'BRAIN_ADMIN_TOKEN')
  if (secretsMatch(mcpToken, adminToken)) throw new Error('BRAIN_ADMIN_TOKEN must differ from BRAIN_MCP_TOKEN.')
  return { mcpToken, adminToken, adminOrigin: normalizeOrigin(process.env.BRAIN_ADMIN_ORIGIN || '') }
}

const bearerMatches = (request, expected) => {
  if (!expected) return false
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') || '')
  return Boolean(match && secretsMatch(match[1], expected))
}

const isMcpAuthorized = (request, configuration) => !request.headers.get('origin') && bearerMatches(request, configuration.mcpToken)
const isBrowserReadRequest = (request) => browserOrigin.test(request.headers.get('origin') || '')
const corsHeaders = (origin) => browserOrigin.test(origin || '') ? {
  'access-control-allow-origin': origin,
  vary: 'Origin',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS'
} : {}

const invalidBody = () => { throw new RequestError(400, 'Invalid request body.') }
const readJson = async (request) => {
  const contentType = request.headers.get('content-type') || ''
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw new RequestError(415, 'Content-Type must be application/json.')

  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBodyBytes)) {
    throw new RequestError(413, 'Request body is too large.')
  }
  if (!request.body) invalidBody()

  const reader = request.body.getReader()
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBodyBytes) throw new RequestError(413, 'Request body is too large.')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  try {
    const value = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)))
    if (!isPlainObject(value)) invalidBody()
    return value
  } catch (error) {
    if (error instanceof RequestError) throw error
    invalidBody()
  }
}

const parseBody = (schema, body) => {
  const result = schema.safeParse(body)
  if (!result.success) invalidBody()
  return result.data
}

const validateContext = (value, depth = 0) => {
  if (depth > 4) throw new RequestError(400, 'Context is too deeply nested.')
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    if (value.length > 4000) throw new RequestError(400, 'Context strings cannot exceed 4000 characters.')
    return value
  }
  if (Array.isArray(value)) {
    if (value.length > 50) throw new RequestError(400, 'Context arrays cannot contain more than 50 values.')
    return value.map((entry) => validateContext(entry, depth + 1))
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length > 50 || entries.some(([key]) => !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(key))) throw new RequestError(400, 'Invalid content context.')
    return Object.fromEntries(entries.map(([key, entry]) => [key, validateContext(entry, depth + 1)]))
  }
  throw new RequestError(400, 'Invalid content context.')
}

const toolConfigurationSchema = z.object({
  enabled: z.boolean().optional(),
  approvalMode: z.enum(['automatic', 'review', 'manual', 'blocked']).optional()
}).strict().refine((value) => value.enabled !== undefined || value.approvalMode !== undefined)
const skillConfigurationSchema = z.object({ enabled: z.boolean() }).strict()
const draftSchema = z.object({ values: z.record(z.string(), z.string()) }).strict()
const publishSchema = z.object({
  draftId: z.string().regex(uuidPattern),
  confirmed: z.literal(true),
  message: z.string().trim().min(1).max(240).optional()
}).strict()
const rollbackSchema = z.object({ revisionId: z.string().regex(uuidPattern), confirmed: z.literal(true) }).strict()
const proposalSchema = z.object({
  appId: z.string().regex(idPattern),
  surfaceId: z.string().regex(idPattern),
  intent: z.string().trim().min(1).max(4000),
  context: z.unknown().optional()
}).strict()
const rewriteSchema = z.object({
  values: z.record(z.string(), z.string()),
  intent: z.string().trim().min(1).max(4000)
}).strict()
const intentDecomposeSchema = z.object({
  intent: z.string().trim().min(20).max(8000),
  appIdHint: z.string().trim().regex(idPattern).optional()
}).strict()
const decompositionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(4000),
  audience: z.string().trim().min(1).max(1000),
  pages: z.array(z.object({
    id: z.string().trim().regex(idPattern),
    name: z.string().trim().min(1).max(160),
    purpose: z.string().trim().min(20).max(1000),
    route: z.string().trim().min(1).max(160).regex(/^\/[a-z0-9/_-]*$/i)
  }).strict()).min(1).max(50),
  navigation: z.array(z.string().trim().min(1).max(240)).max(100),
  entities: z.array(z.string().trim().min(1).max(240)).max(100),
  acceptanceCriteria: z.array(z.string().trim().min(1).max(1000)).max(100),
  tasks: z.array(z.object({
    id: z.string().trim().regex(idPattern),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(2000),
    agentHint: z.string().trim().min(1).max(240)
  }).strict()).min(1).max(100)
}).strict().refine((value) => {
  const pageIds = new Set(value.pages.map((page) => page.id))
  const taskIds = new Set(value.tasks.map((task) => task.id))
  return pageIds.size === value.pages.length && taskIds.size === value.tasks.length
}, 'Page and task identifiers must be unique.')

const readQueryAppId = (url, required = false) => {
  const values = url.searchParams.getAll('appId')
  if (values.length > 1 || (required && values.length !== 1)) throw new RequestError(400, 'Provide one application identifier.')
  if (!values.length) return null
  if (!idPattern.test(values[0]) || !catalog.getApp(values[0])) throw new RequestError(404, 'Unknown application.')
  return values[0]
}

const pageFromRoute = (url) => {
  const match = url.pathname.match(/^\/api\/v1\/content\/pages\/([a-z0-9-]+)\/([a-z0-9-]+)(?:\/(draft|publish|rollback|rewrite))?$/i)
  if (!match) return null
  const [, appId, pageId, action] = match
  if (!catalog.getApp(appId) || !catalog.getSurface(appId, pageId)) throw new RequestError(404, 'Unknown application content surface.')
  return { appId, pageId, action }
}

const adminTransport = (request, configuration) => {
  if (!configuration.adminToken || !configuration.adminOrigin) {
    return { error: new RequestError(503, 'The Admin API is not configured.') }
  }
  if (!bearerMatches(request, configuration.adminToken)) return { error: new RequestError(401, 'Admin authentication is required.') }
  if (request.headers.get('origin') !== configuration.adminOrigin) return { error: new RequestError(403, 'A trusted Admin origin is required.') }
  const actor = request.headers.get('x-actor') || ''
  if (!actorPattern.test(actor)) return { error: new RequestError(400, 'A valid X-Actor identity header is required.') }
  return { actor }
}

const authorizeMutation = async ({ request, configuration, authorizeFn, application, action, context }) => {
  const transport = adminTransport(request, configuration)
  if (transport.error) return transport
  try {
    const decision = await authorizeFn({ subject: transport.actor, application, action, context })
    if (!decision || decision.allowed !== true) return { error: new RequestError(403, 'Authorization denied.') }
    return { actor: transport.actor }
  } catch {
    return { error: new RequestError(503, 'Authorization service is unavailable.') }
  }
}

const buildMcpServer = () => {
  const server = new McpServer({ name: 'tabloid-brain', version: '0.1.0' })
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  const register = (id, definition, handler) => { if (controlStore.isToolEnabled(id)) server.registerTool(id, definition, handler) }
  register('apps_list', { description: 'List applications connected to Brain.', annotations: readOnly }, async () => textResult({ apps: catalog.listApps() }))
  register('routes_list', { description: 'List routes and dependencies between Brain and applications.', inputSchema: z.object({ appId: z.string().optional() }), annotations: readOnly }, async ({ appId }) => {
    if (appId && !catalog.getApp(appId)) return { isError: true, content: [{ type: 'text', text: 'Unknown application.' }] }
    return textResult({ routes: catalog.listRoutes(appId) })
  })
  register('content_surfaces_list', { description: 'List admin-editable content surfaces for an application.', inputSchema: z.object({ appId: z.string() }), annotations: readOnly }, async ({ appId }) => {
    if (!catalog.getApp(appId)) return { isError: true, content: [{ type: 'text', text: 'Unknown application.' }] }
    return textResult({ surfaces: catalog.listSurfaces(appId) })
  })
  register('content_read', { description: 'Read the current content adapter view for an application surface.', inputSchema: z.object({ appId: z.string(), surfaceId: z.string() }), annotations: readOnly }, async ({ appId, surfaceId }) => {
    const content = catalog.readContent(appId, surfaceId)
    if (!content) return { isError: true, content: [{ type: 'text', text: 'Unknown application content surface.' }] }
    return textResult(content)
  })
  return server
}

const createApiHandler = (configuration, authorizeFn, decomposeIntentFn) => async (request) => {
  const url = new URL(request.url)
  const origin = request.headers.get('origin') || ''
  const cors = corsHeaders(origin)
  const method = request.method.toUpperCase()
  const isRead = method === 'GET' || method === 'HEAD'

  try {
    if (method === 'OPTIONS') return new Response(null, { status: Object.keys(cors).length ? 204 : 403, headers: cors })
    if (url.pathname === '/health') {
      return json({
        status: 'ok',
        service: 'tabloid-brain',
        copilotConfigured: Boolean(process.env.COPILOT_GITHUB_TOKEN || process.env.COPILOT_GITHUB_TOKEN_FILE),
        mcpConfigured: Boolean(configuration.mcpToken),
        adminConfigured: Boolean(configuration.adminToken && configuration.adminOrigin)
      })
    }

    if (!isRead && origin && origin !== configuration.adminOrigin) {
      return json({ error: 'Browser requests are read-only. Use the Admin server API proxy for mutations.' }, 403, cors)
    }

    if (isRead) {
      const browserRead = isBrowserReadRequest(request)
      const mcpRead = isMcpAuthorized(request, configuration)
      const adminRead = !browserRead && !mcpRead ? adminTransport(request, configuration) : null
      if (!browserRead && !mcpRead && adminRead?.error) throw adminRead.error
    }

    if (url.pathname === '/api/v1/apps' && method === 'GET') return json({ apps: catalog.listApps() }, 200, cors)
    if (url.pathname === '/api/v1/routes' && method === 'GET') return json({ routes: catalog.listRoutes(readQueryAppId(url)) }, 200, cors)
    if (url.pathname === '/api/v1/content/surfaces' && method === 'GET') return json({ surfaces: catalog.listSurfaces(readQueryAppId(url, true)) }, 200, cors)
    if (url.pathname === '/api/v1/tools' && method === 'GET') return json({ tools: controlStore.listTools() }, 200, cors)
    if (url.pathname === '/api/v1/skills' && method === 'GET') return json({ skills: controlStore.listSkills() }, 200, cors)
    if (url.pathname === '/api/v1/activity' && method === 'GET') return json({ activity: controlStore.activity() }, 200, cors)
    if (url.pathname === '/api/v1/feed' && method === 'GET') {
      try { return json(await getLiveFeed(url.searchParams.get('channel') || 'all'), 200, cors) }
      catch { return json({ error: 'Live feed is currently unavailable.' }, 503, cors) }
    }

    if (url.pathname === '/api/v1/intents/decompose' && method === 'POST') {
      const access = await authorizeMutation({ request, configuration, authorizeFn, application: 'brain', action: 'intents.decompose', context: {} })
      if (access.error) throw access.error
      const input = parseBody(intentDecomposeSchema, await readJson(request))
      const result = decompositionSchema.safeParse(await decomposeIntentFn(input))
      if (!result.success) throw new RequestError(502, 'Copilot returned an invalid intent decomposition.')
      const decomposition = controlStore.saveIntent({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        actor: access.actor,
        input,
        decomposition: result.data
      })
      return json({ decomposition }, 201, cors)
    }

    const toolRoute = url.pathname.match(/^\/api\/v1\/tools\/([a-z0-9_-]+)$/i)
    if (toolRoute && method === 'POST') {
      const access = await authorizeMutation({ request, configuration, authorizeFn, application: 'brain', action: 'tools.configure', context: { toolId: toolRoute[1] } })
      if (access.error) throw access.error
      const input = parseBody(toolConfigurationSchema, await readJson(request))
      return json({ tool: controlStore.configureTool(toolRoute[1], input, access.actor) }, 200, cors)
    }

    const skillRoute = url.pathname.match(/^\/api\/v1\/skills\/([a-z0-9_-]+)$/i)
    if (skillRoute && method === 'POST') {
      const access = await authorizeMutation({ request, configuration, authorizeFn, application: 'brain', action: 'skills.configure', context: { skillId: skillRoute[1] } })
      if (access.error) throw access.error
      const input = parseBody(skillConfigurationSchema, await readJson(request))
      return json({ skill: controlStore.configureSkill(skillRoute[1], input, access.actor) }, 200, cors)
    }

    const page = pageFromRoute(url)
    if (page) {
      if (!page.action && method === 'GET') return json(contentStore.get(page.appId, page.pageId), 200, cors)
      if (method !== 'POST') return json({ error: 'Method not allowed.' }, 405, cors)

      const action = page.action
      if (action === 'draft') {
        const access = await authorizeMutation({ request, configuration, authorizeFn, application: page.appId, action: 'content.propose', context: { pageId: page.pageId } })
        if (access.error) throw access.error
        const input = parseBody(draftSchema, await readJson(request))
        return json(contentStore.saveDraft(page.appId, page.pageId, catalog.validateContentValues(page.appId, page.pageId, input.values), access.actor), 201, cors)
      }
      if (action === 'publish') {
        const access = await authorizeMutation({ request, configuration, authorizeFn, application: page.appId, action: 'content.publish', context: { pageId: page.pageId } })
        if (access.error) throw access.error
        const input = parseBody(publishSchema, await readJson(request))
        return json(contentStore.publish(page.appId, page.pageId, { ...input, actor: access.actor }), 200, cors)
      }
      if (action === 'rollback') {
        const access = await authorizeMutation({ request, configuration, authorizeFn, application: page.appId, action: 'content.publish', context: { pageId: page.pageId, rollback: true } })
        if (access.error) throw access.error
        const input = parseBody(rollbackSchema, await readJson(request))
        return json(contentStore.rollback(page.appId, page.pageId, { ...input, actor: access.actor }), 200, cors)
      }
      if (action === 'rewrite') {
        const access = await authorizeMutation({ request, configuration, authorizeFn, application: page.appId, action: 'content.propose', context: { pageId: page.pageId } })
        if (access.error) throw access.error
        const input = parseBody(rewriteSchema, await readJson(request))
        const values = catalog.validateContentValues(page.appId, page.pageId, input.values)
        const surface = catalog.getSurface(page.appId, page.pageId)
        const content = await generateWithCopilot({ appId: page.appId, surface, intent: input.intent, context: { currentValues: values } })
        return json(catalog.saveProposal({ id: randomUUID(), appId: page.appId, surfaceId: page.pageId, intent: input.intent, content, status: 'proposed', createdAt: new Date().toISOString(), actor: access.actor }), 201, cors)
      }
    }

    if (url.pathname === '/api/v1/content/proposals' && method === 'POST') {
      const input = parseBody(proposalSchema, await readJson(request))
      const surface = catalog.getSurface(input.appId, input.surfaceId)
      if (!surface) throw new RequestError(404, 'Unknown application content surface.')
      const access = await authorizeMutation({ request, configuration, authorizeFn, application: input.appId, action: 'content.propose', context: { surfaceId: input.surfaceId } })
      if (access.error) throw access.error
      const content = await generateWithCopilot({ appId: input.appId, surface, intent: input.intent, context: input.context === undefined ? undefined : validateContext(input.context) })
      return json(catalog.saveProposal({ id: randomUUID(), appId: input.appId, surfaceId: input.surfaceId, intent: input.intent, content, status: 'proposed', createdAt: new Date().toISOString(), actor: access.actor }), 201, cors)
    }

    return json({ error: 'Not found.' }, 404, cors)
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status, cors)
    if (error?.code === 'COPILOT_NOT_CONFIGURED') return json({ error: 'Copilot is not configured.' }, 503, cors)
    if (error?.code === 'COPILOT_INVALID_RESPONSE') return json({ error: 'Copilot returned an invalid intent decomposition.' }, 502, cors)
    if (error instanceof SyntaxError || error instanceof z.ZodError) return json({ error: 'Invalid request body.' }, 400, cors)
    return json({ error: 'Content operation failed.' }, 400, cors)
  }
}

export const createBrainServer = ({ configuration = readConfiguration(), authorizeFn = authorize, decomposeIntentFn = decomposeIntentWithCopilot } = {}) => {
  const mcp = createMcpHandler(buildMcpServer, { responseMode: 'json' })
  const mcpNodeHandler = toNodeHandler(mcp)
  const apiHandler = createApiHandler(configuration, authorizeFn, decomposeIntentFn)
  const server = createServer(async (req, res) => {
    const request = new Request(`http://brain.internal${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method || '') ? undefined : req,
      duplex: 'half'
    })

    if (new URL(request.url).pathname === '/mcp') {
      if (!isMcpAuthorized(request, configuration)) {
        res.writeHead(401).end('Unauthorized')
        return
      }
      await mcpNodeHandler(req, res)
      return
    }

    try {
      const response = await apiHandler(request)
      res.writeHead(response.status, Object.fromEntries(response.headers))
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error.' }))
    }
  })

  return {
    server,
    close: async () => {
      await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
      await mcp.close()
      await stopCopilot()
    }
  }
}

export const startBrainServer = () => {
  const application = createBrainServer()
  application.server.listen(port, host, () => console.log(`Tabloid Brain listening on http://${host}:${port}`))
  const shutdown = async () => {
    try { await application.close() } finally { process.exit(0) }
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
  return application
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startBrainServer()
