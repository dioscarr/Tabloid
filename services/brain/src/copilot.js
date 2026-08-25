import { readFileSync } from 'node:fs'

const openRouterToken = () => process.env.OPENROUTER_API_KEY || (process.env.OPENROUTER_API_KEY_FILE ? readFileSync(process.env.OPENROUTER_API_KEY_FILE, 'utf8').trim() : '')
const openRouterModels = () => (process.env.OPENROUTER_MODELS || 'cohere/north-mini-code:free,poolside/laguna-s-2.1:free,z-ai/glm-5.2:free,nvidia/nemotron-3-super-120b-a12b:free').split(',').map((value) => value.trim()).filter(Boolean)
const dataCollection = () => process.env.OPENROUTER_DATA_COLLECTION === 'allow' ? 'allow' : 'deny'
const systemMessage = 'You are Brain, the private content and productivity orchestrator. Return valid JSON only. Never publish or mutate content. Honor the requested application, surface, fields, and context.'

const parseJson = (value) => {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(text || '{}')
}

const usableProposal = (proposal, surface) => {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return false
  if (!surface.dynamic) return Object.keys(proposal).length > 0
  if (!proposal.values || typeof proposal.values !== 'object' || Array.isArray(proposal.values)) return false
  return surface.fields.every((field) => typeof proposal.values[field] === 'string')
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
  let lastStatus
  for (const model of openRouterModels()) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'http-referer': process.env.OPENROUTER_SITE_URL || 'https://tabloid-brain-api.tail70b7f1.ts.net',
          'x-title': 'Tabloid Brain',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: `Create a content proposal for app "${appId}", surface "${surface.id}". Fields: ${surface.fields.join(', ')}. Intent: ${intent}. Context: ${JSON.stringify(context ?? {})}. ${outputRule}` }],
          provider: { allow_fallbacks: true, data_collection: dataCollection() },
          temperature: 0.2,
          stream: false,
        }),
      })
      lastStatus = response.status
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !usableProposal(parseJson(payload?.choices?.[0]?.message?.content), surface)) continue
      return parseJson(payload.choices[0].message.content)
    } catch {
      // Try the next configured model; callers receive one stable error if all fail.
    }
  }
  const error = new Error(`OpenRouter generation failed for all configured models${lastStatus ? ` (last status ${lastStatus})` : ''}`)
  error.code = 'OPENROUTER_FAILED'
  if (lastStatus) error.status = lastStatus
  throw error
}

export const stopCopilot = async () => {}
