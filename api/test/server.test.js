import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { rm, readFile, writeFile } from 'node:fs/promises'
import test from 'node:test'
import { resolve } from 'node:path'
import { loadConfig } from '../config.js'
import { createAdminServer } from '../server.js'
import { createFailClosedProviders, createProviders, ProviderUnavailableError } from '../providers.js'
import { createCsrfToken, requireMutationProtection } from '../security.js'
import { AdminStore } from '../store.js'

const workspaceRoot = resolve('api/.test-data')

const identity = (roles) => JSON.stringify({
  id: 'test-user',
  displayName: 'Test User',
  roles,
})

const withApi = async ({
  roles = ['owner'],
  origins = 'https://admin.example.test',
  csrfSecret = 'test-csrf-secret',
  workspaceRepositories = 'dioscarr/Tabloid',
  brainApiUrl,
  brainAdminToken,
  providers,
  seed,
} = {}, callback) => {
  const dataDir = resolve(workspaceRoot, randomUUID())
  const config = loadConfig({
    env: {
      NODE_ENV: 'development',
      ADMIN_DATA_DIR: dataDir,
      ADMIN_STATIC_DIR: resolve('dist'),
      ADMIN_ALLOWED_ORIGINS: origins,
      ADMIN_CSRF_SECRET: csrfSecret,
      ADMIN_WORKSPACE_REPOSITORIES: workspaceRepositories,
      ADMIN_DEV_IDENTITY: identity(roles),
      ...(brainApiUrl ? { BRAIN_API_URL: brainApiUrl } : {}),
      ...(brainAdminToken ? { BRAIN_ADMIN_TOKEN: brainAdminToken } : {}),
    },
  })
  const app = createAdminServer({ config, ...(providers ? { providers } : {}) })
  await app.initialize()
  if (seed) await seed(dataDir)
  await new Promise((resolveListen, rejectListen) => {
    app.once('error', rejectListen)
    app.listen(0, '127.0.0.1', resolveListen)
  })

  try {
    const port = app.address().port
    await callback(`http://127.0.0.1:${port}`, dataDir)
  } finally {
    await new Promise((resolveClose, rejectClose) => app.close((error) => error ? rejectClose(error) : resolveClose()))
    await rm(dataDir, { recursive: true, force: true })
  }
}

const seedControlPlane = async (dataDir, { users = [], applications = [] } = {}) => {
  await Promise.all([
    writeFile(resolve(dataDir, 'users.json'), `${JSON.stringify({ version: 1, items: users })}\n`),
    writeFile(resolve(dataDir, 'applications.json'), `${JSON.stringify({ version: 1, items: applications })}\n`),
  ])
}

const mutation = async (baseUrl, path, { method, body = {}, key, confirmAccessChange = false }) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': createCsrfToken('test-user', 'test-csrf-secret'),
      'Idempotency-Key': key,
      ...(confirmAccessChange ? { 'X-Confirm-Access-Change': 'true' } : {}),
    },
    body: JSON.stringify(body),
  })
  return { response, body: await response.json() }
}

test('health is public but API requests default to unauthenticated', async () => {
  const dataDir = resolve(workspaceRoot, randomUUID())
  const config = loadConfig({
    env: { NODE_ENV: 'production', ADMIN_DATA_DIR: dataDir, ADMIN_STATIC_DIR: resolve('dist') },
  })
  const app = createAdminServer({ config })
  await app.initialize()
  await new Promise((resolveListen) => app.listen(0, '127.0.0.1', resolveListen))

  try {
    const baseUrl = `http://127.0.0.1:${app.address().port}`
    const health = await fetch(`${baseUrl}/health`)
    assert.equal(health.status, 200)
    assert.deepEqual(await health.json(), { status: 'ok', service: 'tabloid-admin-api' })

    const session = await fetch(`${baseUrl}/api/v1/session`)
    assert.equal(session.status, 401)
    assert.equal((await session.json()).error.code, 'unauthenticated')
  } finally {
    await new Promise((resolveClose, rejectClose) => app.close((error) => error ? rejectClose(error) : resolveClose()))
    await rm(dataDir, { recursive: true, force: true })
  }
})

test('development identity returns session and authorized collections', async () => {
  await withApi({ roles: ['owner'] }, async (baseUrl) => {
    const session = await fetch(`${baseUrl}/api/v1/session`)
    assert.equal(session.status, 200)
    const sessionBody = await session.json()
    assert.equal(sessionBody.data.id, 'test-user')
    assert.ok(sessionBody.data.csrfToken)

    for (const endpoint of ['overview', 'users', 'applications', 'audit-events', 'app-intents', 'workspaces']) {
      const response = await fetch(`${baseUrl}/api/v1/${endpoint}`)
      assert.equal(response.status, 200, endpoint)
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
      assert.equal(response.headers.get('cache-control'), 'no-store')
    }
  })
})

test('roles restrict users, applications, and audit events', async () => {
  await withApi({ roles: ['editor'] }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/overview`)).status, 200)
    assert.equal((await fetch(`${baseUrl}/api/v1/applications`)).status, 200)
    assert.equal((await fetch(`${baseUrl}/api/v1/users`)).status, 403)
    assert.equal((await fetch(`${baseUrl}/api/v1/audit-events`)).status, 403)
  })
  await withApi({ roles: ['viewer'] }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/applications`)).status, 403)
  })
  await withApi({ roles: ['editor'] }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/app-templates`)).status, 403)
    assert.equal((await fetch(`${baseUrl}/api/v1/app-intents`)).status, 403)
  })
  await withApi({ roles: ['service'] }, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/v1/session`)).status, 401)
  })
})

test('CORS validates exact configured origins', async () => {
  await withApi({}, async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/api/v1/session`, { headers: { Origin: 'https://admin.example.test' } })
    assert.equal(allowed.status, 200)
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://admin.example.test')

    const rejected = await fetch(`${baseUrl}/api/v1/session`, { headers: { Origin: 'https://evil.example.test' } })
    assert.equal(rejected.status, 403)
    assert.equal((await rejected.json()).error.code, 'origin_not_allowed')
  })
})

test('mutation protection requires a configured CSRF token and idempotency key', () => {
  const csrfSecret = 'test-csrf-secret'
  const validToken = createCsrfToken('test-user', csrfSecret)
  const request = {
    method: 'POST',
    identity: { id: 'test-user' },
    csrfSecret,
    headers: {
      'x-csrf-token': validToken,
      'idempotency-key': 'request-key-123',
    },
  }

  assert.doesNotThrow(() => requireMutationProtection(request))
  assert.throws(
    () => requireMutationProtection({ ...request, headers: { 'x-csrf-token': validToken } }),
    { code: 'idempotency_key_required' },
  )
  assert.throws(
    () => requireMutationProtection({ ...request, headers: { ...request.headers, 'x-csrf-token': 'invalid' } }),
    { code: 'csrf_invalid' },
  )
})

test('production rejects development identity and public data paths', () => {
  assert.throws(
    () => loadConfig({
      env: {
        NODE_ENV: 'production',
        ADMIN_DEV_IDENTITY: identity(['owner']),
      },
    }),
    /only permitted when NODE_ENV=development/,
  )
  assert.throws(
    () => loadConfig({
      env: {
        NODE_ENV: 'development',
        ADMIN_STATIC_DIR: 'dist',
        ADMIN_DATA_DIR: 'dist/admin-data',
      },
    }),
    /must not be inside ADMIN_STATIC_DIR/,
  )
  const brainConfig = loadConfig({
    env: {
      BRAIN_API_URL: 'https://brain.example.test/',
      BRAIN_ADMIN_TOKEN: 'server-only-brain-token',
    },
  })
  assert.equal(brainConfig.brainApiUrl, 'https://brain.example.test')
  assert.equal(brainConfig.brainAdminToken, 'server-only-brain-token')
  assert.throws(
    () => loadConfig({
      env: { BRAIN_API_URL: 'https://brain.example.test/api/v1', BRAIN_ADMIN_TOKEN: 'server-only-brain-token' },
    }),
    /BRAIN_API_URL must be an HTTP\(S\) origin/,
  )
})

test('audit persistence is append-only and redacts sensitive context', async () => {
  const dataDir = resolve(workspaceRoot, randomUUID())
  const store = new AdminStore(dataDir)
  try {
    await store.initialize()
    await store.appendAudit({
      actor: { id: 'test-user' },
      action: 'test.write',
      target: { type: 'test', id: 'redaction' },
      context: {
        authorization: 'Bearer must-not-persist',
        nested: { apiToken: 'must-not-persist', safe: 'kept' },
      },
    })
    const raw = await readFile(resolve(dataDir, 'audit-events.ndjson'), 'utf8')
    assert.ok(!raw.includes('must-not-persist'))
    const [event] = await store.listAuditEvents()
    assert.equal(event.context.authorization, '[REDACTED]')
    assert.equal(event.context.nested.apiToken, '[REDACTED]')
    assert.equal(event.context.nested.safe, 'kept')
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
})

test('idempotency persistence detects in-progress, replayed, and conflicting requests', async () => {
  const dataDir = resolve(workspaceRoot, randomUUID())
  const store = new AdminStore(dataDir)
  try {
    await store.initialize()
    const request = { key: 'request-key-123', method: 'POST', path: '/api/v1/workspaces', body: { name: 'alpha' } }
    assert.deepEqual(await store.reserveIdempotencyKey(request), { state: 'new' })
    assert.deepEqual(await store.reserveIdempotencyKey(request), { state: 'in_progress' })
    await store.completeIdempotencyKey({ key: request.key, response: { status: 202, body: { id: 'workspace-1' } } })
    assert.deepEqual(await store.reserveIdempotencyKey(request), {
      state: 'replay',
      response: { status: 202, body: { id: 'workspace-1' } },
    })
    assert.deepEqual(
      await store.reserveIdempotencyKey({ ...request, body: { name: 'different' } }),
      { state: 'conflict' },
    )
  } finally {
    await rm(dataDir, { recursive: true, force: true })
  }
})

test('user status mutation enforces authorization, owner lockout, idempotency, and audit', async () => {
  const users = [
    { id: 'owner-1', status: 'active', roles: ['owner'] },
    { id: 'viewer-1', status: 'active', roles: ['viewer'] },
  ]
  await withApi({ seed: (dataDir) => seedControlPlane(dataDir, { users }) }, async (baseUrl) => {
    const lockout = await mutation(baseUrl, '/api/v1/users/owner-1/status', {
      method: 'PATCH',
      body: { status: 'inactive' },
      key: 'lockout-key-123',
    })
    assert.equal(lockout.response.status, 409)
    assert.equal(lockout.body.error.code, 'owner_lockout_prohibited')

    const update = await mutation(baseUrl, '/api/v1/users/viewer-1/status', {
      method: 'PATCH',
      body: { status: 'inactive' },
      key: 'viewer-status-123',
    })
    assert.equal(update.response.status, 200)
    assert.equal(update.body.data.user.status, 'inactive')
    assert.equal(update.body.data.changed, true)

    const replay = await mutation(baseUrl, '/api/v1/users/viewer-1/status', {
      method: 'PATCH',
      body: { status: 'inactive' },
      key: 'viewer-status-123',
    })
    assert.equal(replay.response.status, 200)
    assert.deepEqual(replay.body, update.body)

    const audit = await fetch(`${baseUrl}/api/v1/audit-events`)
    assert.ok((await audit.json()).data.some((event) => event.action === 'user.status.updated'))
  })
  await withApi({ roles: ['admin'], seed: (dataDir) => seedControlPlane(dataDir, { users }) }, async (baseUrl) => {
    const response = await mutation(baseUrl, '/api/v1/users/owner-1/status', {
      method: 'PATCH',
      body: { status: 'inactive' },
      key: 'admin-owner-status-123',
    })
    assert.equal(response.response.status, 403)
    assert.equal(response.body.error.code, 'owner_management_forbidden')
  })
})

test('application access replacement is confirmed, idempotent, audited, and service-safe', async () => {
  const users = [
    { id: 'viewer-1', status: 'active', roles: ['viewer'] },
    { id: 'service-1', status: 'active', roles: ['service'] },
  ]
  const applications = [{ id: 'app-1', slug: 'admin', name: 'Admin', access: [] }]
  await withApi({ seed: (dataDir) => seedControlPlane(dataDir, { users, applications }) }, async (baseUrl) => {
    const request = {
      method: 'PUT',
      body: { bindings: [{ subjectType: 'user', subjectId: 'viewer-1', role: 'viewer' }] },
      key: 'app-access-123',
    }
    const unconfirmed = await mutation(baseUrl, '/api/v1/applications/app-1/access', request)
    assert.equal(unconfirmed.response.status, 428)

    const update = await mutation(baseUrl, '/api/v1/applications/app-1/access', { ...request, confirmAccessChange: true })
    assert.equal(update.response.status, 200)
    assert.deepEqual(update.body.data.bindings, request.body.bindings)

    const replay = await mutation(baseUrl, '/api/v1/applications/app-1/access', { ...request, confirmAccessChange: true })
    assert.equal(replay.response.status, 200)
    assert.deepEqual(replay.body, update.body)

    const unsafeService = await mutation(baseUrl, '/api/v1/applications/app-1/access', {
      method: 'PUT',
      body: { bindings: [{ subjectType: 'user', subjectId: 'service-1', role: 'viewer' }] },
      key: 'service-access-123',
      confirmAccessChange: true,
    })
    assert.equal(unsafeService.response.status, 400)
    assert.equal(unsafeService.body.error.code, 'service_role_invalid')

    const unknownUser = await mutation(baseUrl, '/api/v1/applications/app-1/access', {
      method: 'PUT',
      body: { bindings: [{ subjectType: 'user', subjectId: 'unknown-user', role: 'viewer' }] },
      key: 'unknown-user-access-123',
      confirmAccessChange: true,
    })
    assert.equal(unknownUser.response.status, 422)
    assert.equal(unknownUser.body.error.code, 'access_subject_not_found')
  })
})

test('workspace state transitions persist desired state without external provisioning', async () => {
  await withApi({}, async (baseUrl) => {
    const create = await mutation(baseUrl, '/api/v1/workspaces', {
      method: 'POST',
      body: { repository: 'dioscarr/Tabloid', ref: 'refs/heads/admin', name: 'admin-backend', ttlHours: 24 },
      key: 'workspace-create-123',
    })
    assert.equal(create.response.status, 202)
    const workspace = create.body.data.workspace
    assert.equal(workspace.status, 'queued')

    const stop = await mutation(baseUrl, `/api/v1/workspaces/${workspace.id}/stop`, {
      method: 'POST',
      key: 'workspace-stop-123',
    })
    assert.equal(stop.response.status, 200)
    assert.equal(stop.body.data.workspace.status, 'stopped')

    const start = await mutation(baseUrl, `/api/v1/workspaces/${workspace.id}/start`, {
      method: 'POST',
      key: 'workspace-start-123',
    })
    assert.equal(start.response.status, 200)
    assert.equal(start.body.data.workspace.status, 'queued')

    const remove = await mutation(baseUrl, `/api/v1/workspaces/${workspace.id}`, {
      method: 'DELETE',
      key: 'workspace-delete-123',
    })
    assert.equal(remove.response.status, 200)
    assert.equal(remove.body.data.workspace.status, 'deleted')

    const workspaces = await fetch(`${baseUrl}/api/v1/workspaces`)
    assert.equal((await workspaces.json()).data[0].status, 'deleted')
    const events = await fetch(`${baseUrl}/api/v1/workspaces/${workspace.id}/events`)
    assert.deepEqual((await events.json()).data.map((event) => event.type), ['queued', 'stopped', 'queued', 'deleted'])
  })
})

test('application gallery requests are governed, idempotent, persisted, and audited', async () => {
  await withApi({}, async (baseUrl, dataDir) => {
    const templates = await fetch(`${baseUrl}/api/v1/app-templates`)
    assert.equal(templates.status, 200)
    assert.ok((await templates.json()).data.some((template) => template.id === 'tabloid-vite'))

    const request = {
      method: 'POST',
      body: { templateId: 'tabloid-vite', appId: 'gallery-demo', branch: 'gallery-demo' },
      key: 'gallery-provision-123',
    }
    const created = await mutation(baseUrl, '/api/v1/applications/provision', request)
    assert.equal(created.response.status, 202)
    assert.equal(created.body.data.request.status, 'queued')
    assert.equal(created.body.data.request.actor.id, 'test-user')

    const persisted = JSON.parse(await readFile(resolve(dataDir, 'app-provision-requests.json'), 'utf8'))
    assert.equal(persisted.items.length, 1)
    assert.equal(persisted.items[0].appId, 'gallery-demo')
    assert.ok(persisted.items[0].idempotencyKeyHash)

    const replay = await mutation(baseUrl, '/api/v1/applications/provision', request)
    assert.equal(replay.response.status, 202)
    assert.deepEqual(replay.body, created.body)

    const duplicate = await mutation(baseUrl, '/api/v1/applications/provision', {
      ...request,
      key: 'gallery-duplicate-123',
    })
    assert.equal(duplicate.response.status, 409)
    assert.equal(duplicate.body.error.code, 'application_identity_taken')

    const reserved = await mutation(baseUrl, '/api/v1/applications/provision', {
      method: 'POST',
      body: { templateId: 'tabloid-vite', appId: 'valid-gallery', branch: 'main' },
      key: 'gallery-reserved-123',
    })
    assert.equal(reserved.response.status, 409)
    assert.equal(reserved.body.error.code, 'reserved_app_identity')

    const invalid = await mutation(baseUrl, '/api/v1/applications/provision', {
      method: 'POST',
      body: { templateId: 'unknown-template', appId: 'Gallery', branch: 'gallery' },
      key: 'gallery-invalid-123',
    })
    assert.equal(invalid.response.status, 422)
    assert.equal(invalid.body.error.code, 'app_template_not_found')

    const uppercase = await mutation(baseUrl, '/api/v1/applications/provision', {
      method: 'POST',
      body: { templateId: 'tabloid-vite', appId: 'Uppercase', branch: 'gallery' },
      key: 'gallery-uppercase-123',
    })
    assert.equal(uppercase.response.status, 400)
    assert.equal(uppercase.body.error.code, 'invalid_app_identity')

    const audit = await fetch(`${baseUrl}/api/v1/audit-events`)
    assert.ok((await audit.json()).data.some((event) => event.action === 'application.provision.requested'))
    const applications = await fetch(`${baseUrl}/api/v1/applications`)
    assert.deepEqual((await applications.json()).data, [])
  })
  await withApi({ roles: ['admin'] }, async (baseUrl) => {
    const created = await mutation(baseUrl, '/api/v1/applications/provision', {
      method: 'POST',
      body: { templateId: 'tabloid-vite', appId: 'admin-gallery', branch: 'admin-gallery' },
      key: 'admin-gallery-provision-123',
    })
    assert.equal(created.response.status, 202)
  })
  await withApi({ roles: ['editor'] }, async (baseUrl) => {
    const denied = await mutation(baseUrl, '/api/v1/applications/provision', {
      method: 'POST',
      body: { templateId: 'tabloid-vite', appId: 'editor-gallery', branch: 'editor-gallery' },
      key: 'editor-gallery-provision-123',
    })
    assert.equal(denied.response.status, 403)
  })
})

test('app intents persist Brain decompositions, audit analysis, and replay idempotently', async () => {
  const calls = []
  const providers = {
    ...createFailClosedProviders(),
    brain: {
      async decomposeIntent(request) {
        calls.push(request)
        return { applications: [{ name: 'Neighborhood Bulletin' }], phases: ['design', 'review'] }
      },
    },
  }
  const request = {
    method: 'POST',
    body: { intent: 'Create a neighborhood bulletin with editorial workflow.' },
    key: 'app-intent-create-123',
  }

  await withApi({ providers }, async (baseUrl, dataDir) => {
    const invalid = await mutation(baseUrl, '/api/v1/app-intents', {
      method: 'POST',
      body: { intent: 'too short' },
      key: 'app-intent-invalid-123',
    })
    assert.equal(invalid.response.status, 400)
    assert.equal(invalid.body.error.code, 'invalid_app_intent')

    const created = await mutation(baseUrl, '/api/v1/app-intents', request)
    assert.equal(created.response.status, 201)
    assert.equal(created.body.data.intent.status, 'draft')
    assert.equal(created.body.data.intent.ownerId, 'test-user')
    assert.deepEqual(created.body.data.intent.decomposition, {
      applications: [{ name: 'Neighborhood Bulletin' }],
      phases: ['design', 'review'],
    })
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0], {
      intent: request.body.intent,
      actor: { id: 'test-user', roles: ['owner'] },
    })

    const persisted = JSON.parse(await readFile(resolve(dataDir, 'app-intents.json'), 'utf8'))
    assert.equal(persisted.items.length, 1)
    assert.equal(persisted.items[0].status, 'draft')

    const listed = await fetch(`${baseUrl}/api/v1/app-intents`)
    assert.equal(listed.status, 200)
    assert.equal((await listed.json()).data.length, 1)
    const detail = await fetch(`${baseUrl}/api/v1/app-intents/${created.body.data.intent.id}`)
    assert.equal(detail.status, 200)
    assert.deepEqual((await detail.json()).data, created.body.data.intent)

    const replay = await mutation(baseUrl, '/api/v1/app-intents', request)
    assert.equal(replay.response.status, 201)
    assert.deepEqual(replay.body, created.body)
    assert.equal(calls.length, 1)

    const audit = await fetch(`${baseUrl}/api/v1/audit-events`)
    const actions = (await audit.json()).data.map((event) => event.action)
    assert.ok(actions.includes('app-intent.created'))
    assert.ok(actions.includes('app-intent.analysis.completed'))
  })
  await withApi({ roles: ['admin'], providers }, async (baseUrl) => {
    const created = await mutation(baseUrl, '/api/v1/app-intents', {
      method: 'POST',
      body: { intent: 'Create an admin-managed publication dashboard.' },
      key: 'admin-app-intent-123',
    })
    assert.equal(created.response.status, 201)
  })
})

test('app intents fail closed when Brain analysis is unavailable', async () => {
  const request = {
    method: 'POST',
    body: { intent: 'Create a private community news application.' },
    key: 'app-intent-failed-123',
  }
  await withApi({}, async (baseUrl, dataDir) => {
    const failed = await mutation(baseUrl, '/api/v1/app-intents', request)
    assert.equal(failed.response.status, 502)
    assert.equal(failed.body.data.intent.status, 'failed')
    assert.equal(failed.body.data.intent.decomposition, null)
    assert.equal(failed.body.data.intent.error.code, 'brain_analysis_failed')
    assert.match(failed.body.error.message, /no decomposition was created/)

    const persisted = JSON.parse(await readFile(resolve(dataDir, 'app-intents.json'), 'utf8'))
    assert.deepEqual(persisted.items[0].decomposition, null)
    assert.equal(persisted.items[0].status, 'failed')

    const detail = await fetch(`${baseUrl}/api/v1/app-intents/${failed.body.data.intent.id}`)
    assert.equal((await detail.json()).data.status, 'failed')
    const replay = await mutation(baseUrl, '/api/v1/app-intents', request)
    assert.equal(replay.response.status, 502)
    assert.deepEqual(replay.body, failed.body)

    const audit = await fetch(`${baseUrl}/api/v1/audit-events`)
    const actions = (await audit.json()).data.map((event) => event.action)
    assert.ok(actions.includes('app-intent.created'))
    assert.ok(actions.includes('app-intent.analysis.failed'))
  })
})

test('configured Brain provider uses its server token and authenticated actor', async () => {
  let call
  const providers = createProviders({
    config: {
      brainApiUrl: 'https://brain.example.test',
      brainAdminToken: 'brain-admin-token',
    },
    fetchImpl: async (url, options) => {
      call = { url: String(url), options }
      return {
        ok: true,
        json: async () => ({ decomposition: { workflow: ['draft'] } }),
      }
    },
  })

  assert.deepEqual(
    await providers.brain.decomposeIntent({
      intent: 'Create a securely managed community newspaper.',
      actor: { id: 'test-user' },
    }),
    { workflow: ['draft'] },
  )
  assert.equal(call.url, 'https://brain.example.test/api/v1/intents/decompose')
  assert.equal(call.options.method, 'POST')
  assert.equal(call.options.headers.Authorization, 'Bearer brain-admin-token')
  assert.equal(call.options.headers['X-Actor'], 'test-user')
  assert.deepEqual(JSON.parse(call.options.body), {
    intent: 'Create a securely managed community newspaper.',
  })
})

test('unconfigured external providers fail closed without accepting client credentials', async () => {
  const providers = createFailClosedProviders()
  assert.equal(await providers.identity.getIdentity(), null)
  await assert.rejects(
    providers.authentik.applyApplicationAccess(),
    (error) => error instanceof ProviderUnavailableError && error.provider === 'authentik',
  )
  await assert.rejects(
    providers.github.createInstallationToken(),
    (error) => error instanceof ProviderUnavailableError && error.provider === 'github',
  )
  await assert.rejects(
    providers.podman.startWorkspace(),
    (error) => error instanceof ProviderUnavailableError && error.provider === 'podman',
  )
  await assert.rejects(
    providers.appProvisioning.provisionApplication(),
    (error) => error instanceof ProviderUnavailableError && error.provider === 'app-provisioning',
  )
  await assert.rejects(
    providers.brain.decomposeIntent(),
    (error) => error instanceof ProviderUnavailableError && error.provider === 'brain',
  )
  await withApi({}, async (baseUrl) => {
    const rejected = await mutation(baseUrl, '/api/v1/workspaces', {
      method: 'POST',
      body: {
        repository: 'dioscarr/Tabloid',
        ref: 'refs/heads/admin',
        name: 'credentials-rejected',
        token: 'client-provided-secret',
      },
      key: 'workspace-credentials-123',
    })
    assert.equal(rejected.response.status, 400)
    assert.equal(rejected.body.error.code, 'invalid_request')
  })
})
