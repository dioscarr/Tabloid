import { CopilotClient } from '@github/copilot-sdk'
import { readFileSync } from 'node:fs'

let client

const copilotToken = () => process.env.COPILOT_GITHUB_TOKEN || (process.env.COPILOT_GITHUB_TOKEN_FILE ? readFileSync(process.env.COPILOT_GITHUB_TOKEN_FILE, 'utf8').trim() : '')
const brainToken = () => process.env.BRAIN_MCP_TOKEN || (process.env.BRAIN_MCP_TOKEN_FILE ? readFileSync(process.env.BRAIN_MCP_TOKEN_FILE, 'utf8').trim() : '')
const allowedContextTools = new Set(['apps_list', 'routes_list', 'content_surfaces_list', 'content_read'])

const approveBrainContextTools = (request) => {
  if (request.managedApprovalRequired) return { kind: 'no-result' }
  if (request.kind === 'mcp' && request.serverName === 'brain' && allowedContextTools.has(request.toolName)) {
    return { kind: 'approve-once' }
  }
  return { kind: 'reject', feedback: 'Brain only permits its allow-listed, read-only context tools during content generation.' }
}

const requireConfiguration = () => {
  const token = copilotToken()
  if (!token) {
    const error = new Error('Copilot is not configured. Set COPILOT_GITHUB_TOKEN on the Brain service; never expose it to a browser.')
    error.code = 'COPILOT_NOT_CONFIGURED'
    throw error
  }
  return token
}

export async function generateWithCopilot({ appId, surface, intent, context }) {
  const gitHubToken = requireConfiguration()
  client ??= new CopilotClient({ gitHubToken, useLoggedInUser: false })
  await client.start()
  const session = await client.createSession({
    model: process.env.COPILOT_MODEL || 'gpt-5.4',
    onPermissionRequest: approveBrainContextTools,
    mcpServers: {
      brain: {
        type: 'http',
        url: process.env.BRAIN_MCP_URL || 'http://127.0.0.1:8787/mcp',
        headers: { Authorization: `Bearer ${brainToken()}` },
        tools: ['apps_list', 'routes_list', 'content_surfaces_list', 'content_read']
      }
    },
    systemMessage: {
      content: 'You are Brain, the private content and productivity orchestrator. Return valid JSON only. Never publish or mutate content. Use discovered tools for application context and honor the requested surface fields.'
    }
  })
  try {
    const outputRule = surface.dynamic
      ? `Return exactly one JSON object shaped as {"values": {"field-key": "replacement text"}}. Preserve every supplied field key and return only string values.`
      : 'Return a concise structured proposal using the requested surface fields.'
    const response = await session.sendAndWait({ prompt: `Create a content proposal for app "${appId}", surface "${surface.id}". Fields: ${surface.fields.join(', ')}. Intent: ${intent}. Context: ${JSON.stringify(context ?? {})}. ${outputRule}` })
    return JSON.parse(response?.data?.content ?? response?.content ?? '{}')
  } finally {
    await session.disconnect()
  }
}

export async function stopCopilot() {
  await client?.stop()
  client = undefined
}
