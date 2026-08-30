import * as z from 'zod/v4'

export const capabilitySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  inputSchema: z.record(z.string(), z.unknown()),
  risk: z.enum(['read-only', 'generative', 'write', 'destructive']),
  approvalMode: z.enum(['automatic', 'review', 'manual', 'blocked']),
  endpoint: z.string().min(1).max(500),
  protocol: z.enum(['http', 'https', 'mcp'])
})

export const toolDiscoverySchema = z.object({
  contractVersion: z.literal('1.0'),
  host: z.object({ id: z.string(), name: z.string() }),
  app: z.object({ id: z.string(), name: z.string(), branch: z.string() }),
  capabilities: z.array(capabilitySchema)
})

export const buildToolDiscovery = ({ apps, tools }) => {
  const app = apps.find((entry) => entry.id === 'brain')
  const capabilities = tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    inputSchema: tool.id === 'routes_list'
      ? { type: 'object', properties: { appId: { type: 'string' } }, additionalProperties: false }
      : { type: 'object', properties: {}, additionalProperties: false },
    risk: tool.risk,
    approvalMode: tool.approvalMode,
    endpoint: '/mcp',
    protocol: 'mcp'
  }))
  return toolDiscoverySchema.parse({
    contractVersion: '1.0',
    host: { id: 'brain', name: 'Brain MCP Host' },
    app: { id: app.id, name: app.name, branch: app.branch },
    capabilities
  })
}
