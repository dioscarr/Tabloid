import { createHash, randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const REDACTED = '[REDACTED]'
const sensitiveKey = /(?:pass(?:word)?|secret|token|authorization|cookie|csrf|credential|api[_-]?key)/i

export const redact = (value, key = '', seen = new WeakSet()) => {
  if (sensitiveKey.test(key)) return REDACTED
  if (value === null || value === undefined || typeof value !== 'object') return value
  if (seen.has(value)) return '[CIRCULAR]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((item) => redact(item, '', seen))
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey, seen)]))
}

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (file, value) => {
  const temporaryFile = `${file}.${randomUUID()}.new`
  await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporaryFile, file)
}

const requireCollection = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.items)) {
    throw new Error(`${name} data is invalid.`)
  }
  return value.items
}

class SerialWriter {
  #pending = Promise.resolve()

  enqueue(operation) {
    const result = this.#pending.then(operation, operation)
    this.#pending = result.catch(() => {})
    return result
  }
}

export class AdminStore {
  #writer = new SerialWriter()

  constructor(dataDir) {
    this.dataDir = dataDir
    this.usersFile = join(dataDir, 'users.json')
    this.applicationsFile = join(dataDir, 'applications.json')
    this.appProvisionRequestsFile = join(dataDir, 'app-provision-requests.json')
    this.appIntentsFile = join(dataDir, 'app-intents.json')
    this.workspacesFile = join(dataDir, 'workspaces.json')
    this.auditFile = join(dataDir, 'audit-events.ndjson')
    this.appProvisionEventsFile = join(dataDir, 'app-provision-events.ndjson')
    this.workspaceEventsFile = join(dataDir, 'workspace-events.ndjson')
    this.idempotencyFile = join(dataDir, 'idempotency.json')
  }

  async initialize() {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 })
    await this.#writer.enqueue(async () => {
      for (const file of [this.usersFile, this.applicationsFile, this.appProvisionRequestsFile, this.appIntentsFile, this.workspacesFile, this.idempotencyFile]) {
        const current = await readJson(file, null)
        if (current === null) await writeJson(file, { version: 1, items: [] })
      }
    })
  }

  async listUsers() {
    return requireCollection(await readJson(this.usersFile, { items: [] }), 'users')
  }

  async getUser(userId) {
    return (await this.listUsers()).find((user) => user.id === userId) || null
  }

  async listApplications() {
    return requireCollection(await readJson(this.applicationsFile, { items: [] }), 'applications')
  }

  async getApplication(applicationId) {
    return (await this.listApplications()).find((application) => application.id === applicationId) || null
  }

  async setUserStatus({ userId, status, canManageOwners }) {
    return this.#writer.enqueue(async () => {
      const document = await readJson(this.usersFile, { version: 1, items: [] })
      const users = requireCollection(document, 'users')
      const user = users.find((item) => item.id === userId)
      if (!user) return { state: 'not_found' }

      const owner = Array.isArray(user.roles) && user.roles.includes('owner')
      if (owner && !canManageOwners) return { state: 'owner_management_forbidden' }
      if (user.status === status) return { state: 'unchanged', user }
      if (owner && status === 'inactive') {
        const activeOwners = users.filter((item) => item.status === 'active' && Array.isArray(item.roles) && item.roles.includes('owner'))
        if (activeOwners.length <= 1) return { state: 'owner_lockout' }
      }

      user.status = status
      user.updatedAt = new Date().toISOString()
      await writeJson(this.usersFile, document)
      return { state: 'updated', user }
    })
  }

  async setApplicationAccess({ applicationId, bindings }) {
    return this.#writer.enqueue(async () => {
      const document = await readJson(this.applicationsFile, { version: 1, items: [] })
      const application = requireCollection(document, 'applications').find((item) => item.id === applicationId)
      if (!application) return { state: 'not_found' }

      application.access = bindings
      application.updatedAt = new Date().toISOString()
      await writeJson(this.applicationsFile, document)
      return { state: 'updated', application }
    })
  }

  async createAppProvisionRequest({ templateId, appId, branch, actor, idempotencyKey }) {
    const idempotencyKeyHash = createHash('sha256').update(idempotencyKey).digest('hex')
    return this.#writer.enqueue(async () => {
      const [applicationsDocument, requestsDocument] = await Promise.all([
        readJson(this.applicationsFile, { version: 1, items: [] }),
        readJson(this.appProvisionRequestsFile, { version: 1, items: [] }),
      ])
      const applications = requireCollection(applicationsDocument, 'applications')
      const requests = requireCollection(requestsDocument, 'app provision requests')
      const identityTaken = applications.some((application) => (
        application.id === appId || application.slug === appId || application.branch === branch
      )) || requests.some((request) => request.appId === appId || request.branch === branch)
      if (identityTaken) return { state: 'duplicate' }

      const now = new Date().toISOString()
      const request = {
        id: randomUUID(),
        templateId,
        appId,
        branch,
        status: 'queued',
        actor,
        idempotencyKeyHash,
        sequence: 1,
        createdAt: now,
        updatedAt: now,
      }
      requests.push(request)
      await writeJson(this.appProvisionRequestsFile, requestsDocument)
      await appendFile(this.appProvisionEventsFile, `${JSON.stringify({
        requestId: request.id,
        sequence: request.sequence,
        type: 'queued',
        actorId: actor.id,
        occurredAt: now,
      })}\n`, { encoding: 'utf8', mode: 0o600, flag: 'a' })
      return { state: 'created', request }
    })
  }

  async listAppProvisionRequests() {
    return requireCollection(await readJson(this.appProvisionRequestsFile, { items: [] }), 'app provision requests')
  }

  async createAppIntent({ intent, ownerId }) {
    return this.#writer.enqueue(async () => {
      const document = await readJson(this.appIntentsFile, { version: 1, items: [] })
      const now = new Date().toISOString()
      const appIntent = {
        id: randomUUID(),
        intent,
        ownerId,
        status: 'analyzing',
        decomposition: null,
        createdAt: now,
        updatedAt: now,
      }
      requireCollection(document, 'app intents').push(appIntent)
      await writeJson(this.appIntentsFile, document)
      return appIntent
    })
  }

  async listAppIntents() {
    return requireCollection(await readJson(this.appIntentsFile, { items: [] }), 'app intents')
  }

  async getAppIntent(appIntentId) {
    return (await this.listAppIntents()).find((appIntent) => appIntent.id === appIntentId) || null
  }

  async completeAppIntentAnalysis({ appIntentId, status, decomposition = null, error = null }) {
    if (!['draft', 'failed'].includes(status)) {
      throw new Error('App intent analysis status is invalid.')
    }

    return this.#writer.enqueue(async () => {
      const document = await readJson(this.appIntentsFile, { version: 1, items: [] })
      const appIntent = requireCollection(document, 'app intents').find((item) => item.id === appIntentId)
      if (!appIntent) throw new Error('App intent was not found.')

      appIntent.status = status
      appIntent.decomposition = decomposition
      if (error) {
        appIntent.error = error
      } else {
        delete appIntent.error
      }
      appIntent.updatedAt = new Date().toISOString()
      await writeJson(this.appIntentsFile, document)
      return appIntent
    })
  }

  async createWorkspace({ repository, ref, name, ttlHours, requestedBy }) {
    return this.#writer.enqueue(async () => {
      const document = await readJson(this.workspacesFile, { version: 1, items: [] })
      const now = new Date().toISOString()
      const workspace = {
        id: randomUUID(),
        repository,
        ref,
        name,
        ttlHours,
        requestedBy,
        status: 'queued',
        sequence: 1,
        createdAt: now,
        updatedAt: now,
      }
      requireCollection(document, 'workspaces').push(workspace)
      await writeJson(this.workspacesFile, document)
      await appendFile(this.workspaceEventsFile, `${JSON.stringify({
        workspaceId: workspace.id,
        sequence: workspace.sequence,
        type: 'queued',
        occurredAt: now,
        actorId: requestedBy,
      })}\n`, { encoding: 'utf8', mode: 0o600, flag: 'a' })
      return workspace
    })
  }

  async listWorkspaces() {
    return requireCollection(await readJson(this.workspacesFile, { items: [] }), 'workspaces')
  }

  async getWorkspace(workspaceId) {
    return (await this.listWorkspaces()).find((workspace) => workspace.id === workspaceId) || null
  }

  async listWorkspaceEvents(workspaceId) {
    try {
      const content = await readFile(this.workspaceEventsFile, 'utf8')
      return content.split('\n').filter(Boolean).map((line) => JSON.parse(line))
        .filter((event) => event.workspaceId === workspaceId)
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  async transitionWorkspace({ workspaceId, action, actorId }) {
    return this.#writer.enqueue(async () => {
      const document = await readJson(this.workspacesFile, { version: 1, items: [] })
      const workspace = requireCollection(document, 'workspaces').find((item) => item.id === workspaceId)
      if (!workspace) return { state: 'not_found' }
      if (workspace.status === 'deleted') return { state: 'deleted', workspace }

      const nextStatus = action === 'start'
        ? 'queued'
        : action === 'stop'
          ? 'stopped'
          : action === 'delete'
            ? 'deleted'
            : null
      if (!nextStatus) throw new Error('Workspace transition action is invalid.')
      if (workspace.status === nextStatus) return { state: 'unchanged', workspace }

      const now = new Date().toISOString()
      workspace.status = nextStatus
      workspace.sequence = Number(workspace.sequence || 0) + 1
      workspace.updatedAt = now
      await writeJson(this.workspacesFile, document)
      await appendFile(this.workspaceEventsFile, `${JSON.stringify({
        workspaceId,
        sequence: workspace.sequence,
        type: nextStatus,
        occurredAt: now,
        actorId,
      })}\n`, { encoding: 'utf8', mode: 0o600, flag: 'a' })
      return { state: 'updated', workspace }
    })
  }

  async appendAudit(event) {
    const record = {
      id: randomUUID(),
      occurredAt: new Date().toISOString(),
      actor: event.actor || null,
      action: String(event.action || 'unknown'),
      target: event.target || null,
      outcome: String(event.outcome || 'success'),
      context: redact(event.context || {}),
    }
    await this.#writer.enqueue(() => appendFile(this.auditFile, `${JSON.stringify(record)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'a' }))
    return record
  }

  async listAuditEvents({ limit = 100 } = {}) {
    try {
      const content = await readFile(this.auditFile, 'utf8')
      const events = content.split('\n').filter(Boolean).map((line) => JSON.parse(line))
      return events.slice(-limit)
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  async reserveIdempotencyKey({ key, method, path, body }) {
    const keyHash = createHash('sha256').update(key).digest('hex')
    const fingerprint = createHash('sha256').update(`${method}\n${path}\n${JSON.stringify(body || null)}`).digest('hex')

    return this.#writer.enqueue(async () => {
      const document = await readJson(this.idempotencyFile, { version: 1, items: [] })
      const records = requireCollection(document, 'idempotency')
      const existing = records.find((record) => record.keyHash === keyHash)

      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          return { state: 'conflict' }
        }
        if (existing.status !== 'completed') {
          return { state: 'in_progress' }
        }
        return { state: 'replay', response: existing.response || null }
      }

      records.push({
        keyHash,
        fingerprint,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      await writeJson(this.idempotencyFile, document)
      return { state: 'new' }
    })
  }

  async completeIdempotencyKey({ key, response }) {
    const keyHash = createHash('sha256').update(key).digest('hex')
    return this.#writer.enqueue(async () => {
      const document = await readJson(this.idempotencyFile, { version: 1, items: [] })
      const record = requireCollection(document, 'idempotency').find((item) => item.keyHash === keyHash)
      if (!record) throw new Error('Idempotency key was not reserved.')
      record.status = 'completed'
      record.response = response
      record.completedAt = new Date().toISOString()
      await writeJson(this.idempotencyFile, document)
    })
  }
}
