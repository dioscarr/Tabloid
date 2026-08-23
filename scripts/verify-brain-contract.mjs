import { readFile } from 'node:fs/promises'

const contract = JSON.parse(await readFile(new URL('../public/app.contract.json', import.meta.url), 'utf8'))
const fail = (message) => { throw new Error(`Brain contract: ${message}`) }

if (contract.contractVersion !== '1.0') fail('contractVersion must be 1.0')
for (const field of ['id', 'name', 'branch', 'description']) {
  if (!contract.app?.[field]) fail(`app.${field} is required`)
}
if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(contract.app.id)) fail('app.id must be a DNS-safe slug')
if (!Array.isArray(contract.routes)) fail('routes must be an array')
if (contract.routes.some((route) => !route.id || !route.direction || !route.protocol || !route.path || !route.purpose)) fail('every route requires id, direction, protocol, path, and purpose')
if (contract.content?.editable !== true) fail('content.editable must be true')
if (!Array.isArray(contract.content.surfaces) || contract.content.surfaces.length === 0) fail('at least one editable content surface is required')
if (contract.content.surfaces.some((surface) => !surface.id || !surface.label || !Array.isArray(surface.fields) || surface.fields.length === 0)) fail('every content surface requires id, label, and fields')

console.log(`Brain contract valid: ${contract.app.name} · ${contract.routes.length} routes · ${contract.content.surfaces.length} content surfaces`)
