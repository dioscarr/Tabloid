import { CopilotClient } from '@github/copilot-sdk'

let client

const requireConfiguration = () => {
  if (!process.env.COPILOT_GITHUB_TOKEN) {
    const error = new Error('Copilot is not configured. Set COPILOT_GITHUB_TOKEN on the Brain service; never expose it to a browser.')
    error.code = 'COPILOT_NOT_CONFIGURED'
    throw error
  }
}

export async function generateWithCopilot({ appId, surface, intent, context }) {
  requireConfiguration()
  client ??= new CopilotClient({ useLoggedInUser: false })
  await client.start()
  const session = await client.createSession({
    model: process.env.COPILOT_MODEL || 'gpt-5',
    mcpServers: {
      brain: {
        type: 'http',
        url: process.env.BRAIN_MCP_URL || 'http://127.0.0.1:8787/mcp',
        headers: { Authorization: `Bearer ${process.env.BRAIN_MCP_TOKEN}` },
        tools: ['apps_list', 'routes_list', 'content_surfaces_list', 'content_read']
      }
    },
    systemMessage: {
      content: 'You are Brain, the private content and productivity orchestrator. Return valid JSON only. Never publish or mutate content. Use discovered tools for application context and honor the requested surface fields.'
    }
  })
  try {
    const response = await session.sendAndWait({ prompt: `Create a content proposal for app "${appId}", surface "${surface.id}". Fields: ${surface.fields.join(', ')}. Intent: ${intent}. Context: ${JSON.stringify(context ?? {})}` })
    return JSON.parse(response?.data?.content ?? response?.content ?? '{}')
  } finally {
    await session.disconnect()
  }
}

export async function stopCopilot() {
  await client?.stop()
  client = undefined
}
