import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { catalog } from './catalog.js'
import { generateWithCopilot, stopCopilot } from './copilot.js'
import { contentStore } from './content-store.js'
import { controlStore } from './control-store.js'
import { getLiveFeed } from './feed.js'
import { authorize } from './authorization.js'

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'
const readSecret = (value, file) => value || (file ? readFileSync(file, 'utf8').trim() : '')
const token = readSecret(process.env.BRAIN_MCP_TOKEN, process.env.BRAIN_MCP_TOKEN_FILE)
const allowedOrigin = /^https:\/\/tabloid(?:-[a-z0-9-]+)?\.tail70b7f1\.ts\.net$/
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } })
const textResult = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value })

const buildMcpServer = () => {
  const server = new McpServer({ name: 'tabloid-brain', version: '0.1.0' })
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  const register = (id, definition, handler) => { if (controlStore.isToolEnabled(id)) server.registerTool(id, definition, handler) }
  register('apps_list', { description: 'List applications connected to Brain.', annotations: readOnly }, async () => textResult({ apps: catalog.listApps() }))
  register('routes_list', { description: 'List routes and dependencies between Brain and applications.', inputSchema: z.object({ appId: z.string().optional() }), annotations: readOnly }, async ({ appId }) => textResult({ routes: catalog.listRoutes(appId) }))
  register('content_surfaces_list', { description: 'List admin-editable content surfaces for an application.', inputSchema: z.object({ appId: z.string() }), annotations: readOnly }, async ({ appId }) => textResult({ surfaces: catalog.listSurfaces(appId) }))
  register('content_read', { description: 'Read the current content adapter view for an application surface.', inputSchema: z.object({ appId: z.string(), surfaceId: z.string() }), annotations: readOnly }, async ({ appId, surfaceId }) => textResult(catalog.readContent(appId, surfaceId)))
  register('content_propose', { description: 'Generate a reviewable content proposal. This tool does not publish.', inputSchema: z.object({ appId: z.string(), surfaceId: z.string(), intent: z.string(), context: z.record(z.string(), z.unknown()).optional() }) }, async ({ appId, surfaceId, intent, context }) => {
    const decision = await authorize({ subject: context?.subject || 'tailnet-admin', application: appId, action: 'content.propose', context: { surfaceId } })
    if (!decision.allowed) return { isError: true, content: [{ type: 'text', text: `Authorization denied: ${decision.reason}` }] }
    const surface = catalog.listSurfaces(appId).find(({ id }) => id === surfaceId)
    if (!surface) return { isError: true, content: [{ type: 'text', text: `Unknown surface ${appId}/${surfaceId}` }] }
    const content = await generateWithCopilot({ appId, surface, intent, context })
    return textResult(catalog.saveProposal({ id: randomUUID(), appId, surfaceId, intent, content, status: 'proposed', createdAt: new Date().toISOString() }))
  })
  register('content_publish', { description: 'Publish an approved proposal. Disabled until approval storage and GitHub write integration are configured.', inputSchema: z.object({ proposalId: z.string(), approvalId: z.string() }) }, async () => ({ isError: true, content: [{ type: 'text', text: 'Publishing is intentionally disabled. Configure approval storage and a narrowly scoped GitHub App before enabling mutations.' }] }))
  return server
}

const mcp = createMcpHandler(buildMcpServer, { responseMode: 'json' })
const mcpNodeHandler = toNodeHandler(mcp)

const isAuthorized = (request) => token && request.headers.get('authorization') === `Bearer ${token}`
const isTrustedAppRequest = (request) => allowedOrigin.test(request.headers.get('origin') || '')
const corsHeaders = (origin) => allowedOrigin.test(origin || '') ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } : {}

const apiHandler = async (request) => {
  const url = new URL(request.url)
  const origin = request.headers.get('origin') || ''
  const cors = corsHeaders(origin)
  if (request.method === 'OPTIONS') return new Response(null, { status: Object.keys(cors).length ? 204 : 403, headers: cors })
  if (url.pathname === '/health') return json({ status: 'ok', service: 'tabloid-brain', copilotConfigured: Boolean(process.env.COPILOT_GITHUB_TOKEN || process.env.COPILOT_GITHUB_TOKEN_FILE), mcpConfigured: Boolean(token) })
  if (!isAuthorized(request) && !isTrustedAppRequest(request)) return json({ error: 'Unauthorized' }, 401, cors)
  if (url.pathname === '/api/v1/apps' && request.method === 'GET') return json({ apps: catalog.listApps() }, 200, cors)
  if (url.pathname === '/api/v1/routes' && request.method === 'GET') return json({ routes: catalog.listRoutes(url.searchParams.get('appId')) }, 200, cors)
  if (url.pathname === '/api/v1/content/surfaces' && request.method === 'GET') return json({ surfaces: catalog.listSurfaces(url.searchParams.get('appId')) }, 200, cors)
  if (url.pathname === '/api/v1/tools' && request.method === 'GET') return json({ tools: controlStore.listTools() }, 200, cors)
  if (url.pathname === '/api/v1/skills' && request.method === 'GET') return json({ skills: controlStore.listSkills() }, 200, cors)
  if (url.pathname === '/api/v1/activity' && request.method === 'GET') return json({ activity: controlStore.activity() }, 200, cors)
  if (url.pathname === '/api/v1/feed' && request.method === 'GET') {
    try { return json(await getLiveFeed(url.searchParams.get('channel') || 'all'), 200, cors) }
    catch (error) { return json({ error: error.message }, 503, cors) }
  }
  const toolRoute = url.pathname.match(/^\/api\/v1\/tools\/([a-z0-9_-]+)$/i)
  const skillRoute = url.pathname.match(/^\/api\/v1\/skills\/([a-z0-9_-]+)$/i)
  if (toolRoute && request.method === 'POST') {
    try { const decision = await authorize({ subject: request.headers.get('x-actor') || 'tailnet-admin', application: 'brain', action: 'tools.configure', context: { toolId: toolRoute[1] } }); if (!decision.allowed) return json({ error: 'Authorization denied', decision }, 403, cors); return json({ tool: controlStore.configureTool(toolRoute[1], await request.json()) }, 200, cors) }
    catch (error) { return json({ error: error.message }, 400, cors) }
  }
  if (skillRoute && request.method === 'POST') {
    try { const decision = await authorize({ subject: request.headers.get('x-actor') || 'tailnet-admin', application: 'brain', action: 'skills.configure', context: { skillId: skillRoute[1] } }); if (!decision.allowed) return json({ error: 'Authorization denied', decision }, 403, cors); return json({ skill: controlStore.configureSkill(skillRoute[1], await request.json()) }, 200, cors) }
    catch (error) { return json({ error: error.message }, 400, cors) }
  }
  const pageRoute = url.pathname.match(/^\/api\/v1\/content\/pages\/([a-z0-9-]+)\/([a-z0-9._-]+)(?:\/(draft|publish|rollback|rewrite))?$/i)
  if (pageRoute) {
    const [, appId, pageId, action] = pageRoute
    try {
      if (!action && request.method === 'GET') return json(contentStore.get(appId, pageId), 200, cors)
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors)
      const body = await request.json()
      if (action === 'draft') { const decision = await authorize({ subject: body.actor || request.headers.get('x-actor') || 'tailnet-admin', application: appId, action: 'content.propose', context: { pageId } }); if (!decision.allowed) return json({ error: 'Authorization denied', decision }, 403, cors); return json(contentStore.saveDraft(appId, pageId, body.values, body.actor), 201, cors) }
      if (action === 'publish') { const decision = await authorize({ subject: body.actor || request.headers.get('x-actor') || 'tailnet-admin', application: appId, action: 'content.publish', context: { pageId } }); if (!decision.allowed) return json({ error: 'Authorization denied', decision }, 403, cors); return json(contentStore.publish(appId, pageId, body), 200, cors) }
      if (action === 'rollback') { const decision = await authorize({ subject: body.actor || request.headers.get('x-actor') || 'tailnet-admin', application: appId, action: 'content.publish', context: { pageId, rollback: true } }); if (!decision.allowed) return json({ error: 'Authorization denied', decision }, 403, cors); return json(contentStore.rollback(appId, pageId, body), 200, cors) }
      if (action === 'rewrite') {
        const fields = Object.keys(body.values || {})
        if (!fields.length || fields.length > 250) return json({ error: 'Provide between 1 and 250 page fields.' }, 400, cors)
        const surface = { id: pageId, label: `${appId} ${pageId} page`, fields, dynamic: true }
        const content = await generateWithCopilot({ appId, surface, intent: body.intent, context: { currentValues: body.values } })
        return json(catalog.saveProposal({ id: randomUUID(), appId, surfaceId: pageId, intent: body.intent, content, status: 'proposed', createdAt: new Date().toISOString() }), 201, cors)
      }
    } catch (error) {
      const generation = error.code === 'COPILOT_NOT_CONFIGURED' || error.code === 'GENERATION_FAILED'
      return json({ error: error.message, code: error.code || (generation ? 'GENERATION_FAILED' : 'CONTENT_OPERATION_FAILED') }, generation ? 503 : 400, cors)
    }
  }
  if (url.pathname === '/api/v1/content/proposals' && request.method === 'POST') {
    const body = await request.json()
    const surface = catalog.listSurfaces(body.appId).find(({ id }) => id === body.surfaceId)
    if (!surface) return json({ error: 'Unknown application content surface' }, 404, cors)
    try {
      const content = await generateWithCopilot({ appId: body.appId, surface, intent: body.intent, context: body.context })
      return json(catalog.saveProposal({ id: randomUUID(), ...body, content, status: 'proposed', createdAt: new Date().toISOString() }), 201, cors)
    } catch (error) {
      return json({ error: error.message, code: error.code || 'GENERATION_FAILED' }, error.code === 'COPILOT_NOT_CONFIGURED' ? 503 : 500, cors)
    }
  }
  return json({ error: 'Not found' }, 404, cors)
}

const server = createServer(async (req, res) => {
  const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : req, duplex: 'half' })
  if (new URL(request.url).pathname === '/mcp') {
    if (!isAuthorized(request)) { res.writeHead(401).end('Unauthorized'); return }
    await mcpNodeHandler(req, res)
    return
  }
  const response = await apiHandler(request)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
})

server.listen(port, host, () => console.log(`Tabloid Brain listening on http://${host}:${port}`))
const shutdown = async () => { server.close(); await mcp.close(); await stopCopilot() }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
