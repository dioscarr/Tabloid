import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const contentStorePath = resolve('test', `.brain-content-${process.pid}.json`)
process.env.BRAIN_CONTENT_STORE = contentStorePath
process.env.BRAIN_MCP_TOKEN = 'mcp-test-token'
process.env.BRAIN_ADMIN_TOKEN = 'brain-admin-test-token'
process.env.BRAIN_ADMIN_ORIGIN = 'https://tabloid-admin.example.test'

const { createBrainServer } = await import('../src/server.js')
const authorizationCalls = []
const application = createBrainServer({
  authorizeFn: async (request) => {
    authorizationCalls.push(request)
    if (request.subject === 'outage-user') throw new Error('Authorization unavailable')
    return { allowed: request.subject === 'operator-123' }
  }
})

let baseUrl
const adminHeaders = (actor = 'operator-123') => ({
  authorization: 'Bearer brain-admin-test-token',
  origin: 'https://tabloid-admin.example.test',
  'x-actor': actor,
  'content-type': 'application/json'
})
const jsonRequest = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, options)
  return { response, body: await response.json() }
}

before(async () => {
  await new Promise((resolveListen) => application.server.listen(0, '127.0.0.1', resolveListen))
  const { port } = application.server.address()
  baseUrl = `http://127.0.0.1:${port}`
})

after(async () => {
  await application.close()
  rmSync(contentStorePath, { force: true })
})

test('browser origins are limited to read-only requests and CORS excludes POST', async () => {
  const browserOrigin = 'https://tabloid-brain.tail70b7f1.ts.net'
  const read = await jsonRequest('/api/v1/apps', { headers: { origin: browserOrigin } })
  assert.equal(read.response.status, 200)
  assert.equal(read.response.headers.get('access-control-allow-origin'), browserOrigin)

  const mutation = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: { origin: browserOrigin, 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false })
  })
  assert.equal(mutation.response.status, 403)

  const preflight = await fetch(`${baseUrl}/api/v1/tools/apps_list`, {
    method: 'OPTIONS',
    headers: { origin: browserOrigin, 'access-control-request-method': 'POST' }
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS')
})

test('Admin mutations require the distinct token, trusted origin, and header actor', async () => {
  const noToken = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: { origin: 'https://tabloid-admin.example.test', 'x-actor': 'operator-123', 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false })
  })
  assert.equal(noToken.response.status, 401)

  const noOrigin = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: { authorization: 'Bearer brain-admin-test-token', 'x-actor': 'operator-123', 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false })
  })
  assert.equal(noOrigin.response.status, 403)

  const noActor = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: { authorization: 'Bearer brain-admin-test-token', origin: 'https://tabloid-admin.example.test', 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false })
  })
  assert.equal(noActor.response.status, 400)

  const deniedActor = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: adminHeaders('denied-user'),
    body: JSON.stringify({ enabled: false, actor: 'operator-123' })
  })
  assert.equal(deniedActor.response.status, 403)
  assert.equal(authorizationCalls.at(-1).subject, 'denied-user')

  const bodyActor = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ enabled: false, actor: 'denied-user' })
  })
  assert.equal(bodyActor.response.status, 400)

  const unavailable = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: adminHeaders('outage-user'),
    body: JSON.stringify({ enabled: false })
  })
  assert.equal(unavailable.response.status, 503)

  const accepted = await jsonRequest('/api/v1/tools/apps_list', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ enabled: false })
  })
  assert.equal(accepted.response.status, 200)
  assert.equal(accepted.body.tool.enabled, false)

  const activity = await jsonRequest('/api/v1/activity', { headers: { origin: 'https://tabloid-brain.tail70b7f1.ts.net' } })
  assert.equal(activity.body.activity[0].actor, 'operator-123')
})

test('content writes require catalog pages, catalog fields, and explicit approval', async () => {
  const unknownPage = await jsonRequest('/api/v1/content/pages/production/not-a-page/draft', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ values: { headline: 'Unsafe' } })
  })
  assert.equal(unknownPage.response.status, 404)

  const invalidFields = await jsonRequest('/api/v1/content/pages/production/home-hero/draft', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ values: { headline: 'Missing required fields' } })
  })
  assert.equal(invalidFields.response.status, 400)

  const values = {
    eyebrow: 'Test',
    headline: 'A secure Admin-to-Brain boundary',
    summary: 'Content writes are only accepted from the trusted Admin service.',
    callToAction: 'Read more'
  }
  const draft = await jsonRequest('/api/v1/content/pages/production/home-hero/draft', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ values })
  })
  assert.equal(draft.response.status, 201)

  const missingApproval = await jsonRequest('/api/v1/content/pages/production/home-hero/publish', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ draftId: draft.body.draft.id })
  })
  assert.equal(missingApproval.response.status, 400)

  const published = await jsonRequest('/api/v1/content/pages/production/home-hero/publish', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ draftId: draft.body.draft.id, confirmed: true, message: 'Approved in Admin' })
  })
  assert.equal(published.response.status, 200)
  assert.equal(published.body.published.actor, 'operator-123')

  const missingRollbackApproval = await jsonRequest('/api/v1/content/pages/production/home-hero/rollback', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ revisionId: published.body.published.id, confirmed: false })
  })
  assert.equal(missingRollbackApproval.response.status, 400)

  const rollback = await jsonRequest('/api/v1/content/pages/production/home-hero/rollback', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ revisionId: published.body.published.id, confirmed: true })
  })
  assert.equal(rollback.response.status, 200)
  assert.equal(authorizationCalls.at(-1).action, 'content.publish')
  assert.equal(authorizationCalls.at(-1).subject, 'operator-123')
})
