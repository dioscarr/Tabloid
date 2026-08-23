import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import * as z from 'zod/v4'
import { catalog } from './catalog.js'
import { generateWithCopilot, stopCopilot } from './copilot.js'

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'
const token = process.env.BRAIN_MCP_TOKEN
const allowedOrigin = /^https:\/\/tabloid(?:-[a-z0-9-]+)?\.tail70b7f1\.ts\.net$/
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } })
const textResult = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value })

const buildMcpServer = () => {
  const server = new McpServer({ name: 'tabloid-brain', version: '0.1.0' })
  server.registerTool('apps_list', { description: 'List applications connected to Brain.' }, async () => textResult({ apps: catalog.listApps() }))
  server.registerTool('routes_list', { description: 'List routes and dependencies between Brain and applications.', inputSchema: z.object({ appId: z.string().optional() }) }, async ({ appId }) => textResult({ routes: catalog.listRoutes(appId) }))
  server.registerTool('content_surfaces_list', { description: 'List admin-editable content surfaces for an application.', inputSchema: z.object({ appId: z.string() }) }, async ({ appId }) => textResult({ surfaces: catalog.listSurfaces(appId) }))
  server.registerTool('content_read', { description: 'Read the current content adapter view for an application surface.', inputSchema: z.object({ appId: z.string(), surfaceId: z.string() }) }, async ({ appId, surfaceId }) => textResult(catalog.readContent(appId, surfaceId)))
  server.registerTool('content_propose', { description: 'Generate a reviewable content proposal. This tool does not publish.', inputSchema: z.object({ appId: z.string(), surfaceId: z.string(), intent: z.string(), context: z.record(z.string(), z.unknown()).optional() }) }, async ({ appId, surfaceId, intent, context }) => {
    const surface = catalog.listSurfaces(appId).find(({ id }) => id === surfaceId)
    if (!surface) return { isError: true, content: [{ type: 'text', text: `Unknown surface ${appId}/${surfaceId}` }] }
    const content = await generateWithCopilot({ appId, surface, intent, context })
    return textResult(catalog.saveProposal({ id: randomUUID(), appId, surfaceId, intent, content, status: 'proposed', createdAt: new Date().toISOString() }))
  })
  server.registerTool('content_publish', { description: 'Publish an approved proposal. Disabled until approval storage and GitHub write integration are configured.', inputSchema: z.object({ proposalId: z.string(), approvalId: z.string() }) }, async () => ({ isError: true, content: [{ type: 'text', text: 'Publishing is intentionally disabled. Configure approval storage and a narrowly scoped GitHub App before enabling mutations.' }] }))
  return server
}

const mcp = createMcpHandler(buildMcpServer, { responseMode: 'json' })
const mcpNodeHandler = toNodeHandler(mcp)

const isAuthorized = (request) => token && request.headers.get('authorization') === `Bearer ${token}`
const corsHeaders = (origin) => allowedOrigin.test(origin || '') ? { 'access-control-allow-origin': origin, vary: 'Origin', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } : {}

const apiHandler = async (request) => {
  const url = new URL(request.url)
  const origin = request.headers.get('origin') || ''
  const cors = corsHeaders(origin)
  if (request.method === 'OPTIONS') return new Response(null, { status: Object.keys(cors).length ? 204 : 403, headers: cors })
  if (url.pathname === '/health') return json({ status: 'ok', service: 'tabloid-brain', copilotConfigured: Boolean(process.env.COPILOT_GITHUB_TOKEN) })
  if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401, cors)
  if (url.pathname === '/api/v1/apps' && request.method === 'GET') return json({ apps: catalog.listApps() }, 200, cors)
  if (url.pathname === '/api/v1/routes' && request.method === 'GET') return json({ routes: catalog.listRoutes(url.searchParams.get('appId')) }, 200, cors)
  if (url.pathname === '/api/v1/content/surfaces' && request.method === 'GET') return json({ surfaces: catalog.listSurfaces(url.searchParams.get('appId')) }, 200, cors)
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
