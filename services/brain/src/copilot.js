import { readFileSync } from 'node:fs'

const openRouterToken = () => process.env.OPENROUTER_API_KEY || (process.env.OPENROUTER_API_KEY_FILE ? readFileSync(process.env.OPENROUTER_API_KEY_FILE, 'utf8').trim() : '')
const openRouterModels = () => (process.env.OPENROUTER_MODELS || 'cohere/north-mini-code:free,poolside/laguna-s-2.1:free,z-ai/glm-5.2:free,nvidia/nemotron-3-super-120b-a12b:free').split(',').map((value) => value.trim()).filter(Boolean)
const dataCollection = () => process.env.OPENROUTER_DATA_COLLECTION === 'allow' ? 'allow' : 'deny'
const systemMessage = 'You are Brain, the private content and productivity orchestrator. Return valid JSON only. Never publish or mutate content. Honor the requested application, surface, fields, and context.'

const parseJson = (value) => {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(text || '{}')
}

export async function generateWithCopilot({ appId, surface, intent, context }) {
  const token = openRouterToken()
  if (!token) {
    const error = new Error('OpenRouter is not configured. Set OPENROUTER_API_KEY_FILE on the Brain service.')
    error.code = 'OPENROUTER_NOT_CONFIGURED'
    throw error
  }
  const outputRule = surface.dynamic
    ? 'Return exactly one JSON object shaped as {"values": {"field-key": "replacement text"}}. Preserve every supplied field key and return only string values.'
    : 'Return a concise JSON object containing a structured proposal using the requested surface fields.'
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'http-referer': process.env.OPENROUTER_SITE_URL || 'https://tabloid-brain-api.tail70b7f1.ts.net',
      'x-title': 'Tabloid Brain',
    },
    body: JSON.stringify({
      model: openRouterModels()[0],
      messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: `Create a content proposal for app "${appId}", surface "${surface.id}". Fields: ${surface.fields.join(', ')}. Intent: ${intent}. Context: ${JSON.stringify(context ?? {})}. ${outputRule}` }],
      provider: { allow_fallbacks: true, data_collection: dataCollection() },
      temperature: 0.2,
      stream: false,
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`OpenRouter returned ${response.status}: ${payload?.error?.message || 'generation failed'}`)
    error.code = 'OPENROUTER_FAILED'
    error.status = response.status
    throw error
  }
  return parseJson(payload?.choices?.[0]?.message?.content)
}

export const stopCopilot = async () => {}
