import { createServer } from 'node:http'
import { stat, readFile } from 'node:fs/promises'
import { extname, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { appTemplates, getAppTemplate, reservedAppIdentities } from './app-templates.js'
import { bootstrapCookie, bootstrapTokenMatches, canUseInteractiveApi, createBootstrapSession, getRequestIdentity, hasAnyRole } from './auth.js'
import { loadConfig, validRoles } from './config.js'
import { HttpError } from './http.js'
import { createProviders } from './providers.js'
import {
  applyCorsHeaders,
  applySecurityHeaders,
  createCsrfToken,
  requireMutationProtection,
  validateOrigin,
} from './security.js'
import { AdminStore } from './store.js'

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

const endpointRoles = {
  '/api/v1/session': ['owner', 'admin', 'editor', 'viewer'],
  '/api/v1/overview': ['owner', 'admin', 'editor', 'viewer'],
  '/api/v1/users': ['owner', 'admin'],
  '/api/v1/applications': ['owner', 'admin', 'editor'],
  '/api/v1/app-templates': ['owner', 'admin'],
  '/api/v1/app-intents': ['owner', 'admin'],
  '/api/v1/audit-events': ['owner', 'admin'],
  '/api/v1/workspaces': ['owner'],
}
const validRoleSet = new Set(validRoles)

const isInside = (candidate, parent) => {
  const path = relative(parent, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !path.includes(`..${sep}`))
}

const sendJson = (response, status, payload) => {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  response.end(body)
}

const sendError = (response, error, requestId) => {
  sendJson(response, error.status || 500, {
    error: {
      code: error.code || 'internal_error',
      message: error.status ? error.message : 'An unexpected server error occurred.',
      requestId,
    },
  })
}

const parseLimit = (value) => {
  if (value === null) return 100
  if (!/^\d+$/.test(value)) throw new HttpError(400, 'invalid_limit', 'limit must be a positive integer.')
  const limit = Number(value)
  if (limit < 1 || limit > 200) throw new HttpError(400, 'invalid_limit', 'limit must be between 1 and 200.')
  return limit
}

const readJsonBody = async (request) => {
  const contentType = String(request.headers['content-type'] || '')
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'content_type_required', 'Content-Type must be application/json.')
  }

  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 64 * 1024) throw new HttpError(413, 'payload_too_large', 'Request payload exceeds 64 KiB.')
    chunks.push(chunk)
  }

  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Body is not an object.')
    }
    return body
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be a JSON object.')
  }
}

const resourceId = (value, name) => {
  let id
  try {
    id = decodeURIComponent(value)
  } catch {
    throw new HttpError(400, 'invalid_resource_id', `${name} ID is invalid.`)
  }
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(id)) {
    throw new HttpError(400, 'invalid_resource_id', `${name} ID is invalid.`)
  }
  return id
}

const requireOnlyKeys = (body, keys) => {
  if (Object.keys(body).some((key) => !keys.includes(key))) {
    throw new HttpError(400, 'invalid_request', 'Request contains unsupported fields.')
  }
}

const parseUserStatus = (body) => {
  requireOnlyKeys(body, ['status'])
  if (!['active', 'inactive'].includes(body.status)) {
    throw new HttpError(400, 'invalid_status', 'status must be active or inactive.')
  }
  return body.status
}

const parseAccessBindings = (body) => {
  requireOnlyKeys(body, ['bindings'])
  if (!Array.isArray(body.bindings) || body.bindings.length > 100) {
    throw new HttpError(400, 'invalid_access_bindings', 'bindings must contain at most 100 entries.')
  }

  const subjectKeys = new Set()
  return body.bindings.map((binding) => {
    if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
      throw new HttpError(400, 'invalid_access_bindings', 'Each access binding must be an object.')
    }
    requireOnlyKeys(binding, ['subjectType', 'subjectId', 'role'])
    const { subjectType, subjectId, role } = binding
    if (!['user', 'group'].includes(subjectType) || typeof subjectId !== 'string' || !/^[A-Za-z0-9._:@-]{1,128}$/.test(subjectId) || !validRoleSet.has(role)) {
      throw new HttpError(400, 'invalid_access_bindings', 'An access binding is invalid.')
    }
    const subjectKey = `${subjectType}:${subjectId}`
    if (subjectKeys.has(subjectKey)) {
      throw new HttpError(400, 'duplicate_access_binding', 'A subject may have only one application role.')
    }
    subjectKeys.add(subjectKey)
    return { subjectType, subjectId, role }
  })
}

const parseWorkspaceRequest = (body, workspaceRepositories) => {
  requireOnlyKeys(body, ['repository', 'ref', 'name', 'ttlHours'])
  const { repository, ref, name } = body
  const ttlHours = body.ttlHours === undefined ? 24 : body.ttlHours
  if (
    typeof repository !== 'string'
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    || !workspaceRepositories.includes(repository)
  ) {
    throw new HttpError(422, 'workspace_repository_not_allowed', 'The workspace repository is not allowlisted.')
  }
  if (typeof ref !== 'string' || !/^refs\/heads\/[A-Za-z0-9._/-]{1,160}$/.test(ref) || ref.includes('..')) {
    throw new HttpError(400, 'invalid_workspace_ref', 'ref must be a supported branch reference.')
  }
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(name)) {
    throw new HttpError(400, 'invalid_workspace_name', 'name must be a lowercase slug.')
  }
  if (!Number.isInteger(ttlHours) || ttlHours < 1 || ttlHours > 168) {
    throw new HttpError(400, 'invalid_workspace_ttl', 'ttlHours must be an integer between 1 and 168.')
  }
  return { repository, ref, name, ttlHours }
}

const parseAppProvisionRequest = (body) => {
  requireOnlyKeys(body, ['templateId', 'appId', 'branch'])
  const { templateId, appId, branch } = body
  if (typeof templateId !== 'string' || !getAppTemplate(templateId)) {
    throw new HttpError(422, 'app_template_not_found', 'templateId must identify a governed application template.')
  }
  for (const value of [appId, branch]) {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{1,62}$/.test(value)) {
      throw new HttpError(400, 'invalid_app_identity', 'appId and branch must be lowercase identifiers.')
    }
    if (reservedAppIdentities.has(value)) {
      throw new HttpError(409, 'reserved_app_identity', 'appId and branch may not use a reserved identity.')
    }
  }
  return { templateId, appId, branch }
}

const parseAppIntent = (body) => {
  requireOnlyKeys(body, ['intent'])
  if (typeof body.intent !== 'string') {
    throw new HttpError(400, 'invalid_app_intent', 'intent must be a string between 20 and 8000 characters.')
  }

  const intent = body.intent.trim()
  if (intent.length < 20 || intent.length > 8000) {
    throw new HttpError(400, 'invalid_app_intent', 'intent must be between 20 and 8000 characters.')
  }
  return { intent }
}

const mutationRoute = (method, pathname) => {
  let match
  if (method === 'PATCH' && (match = pathname.match(/^\/api\/v1\/users\/([^/]+)\/status$/))) {
    return { kind: 'user_status', roles: ['owner', 'admin'], userId: resourceId(match[1], 'User') }
  }
  if (method === 'PUT' && (match = pathname.match(/^\/api\/v1\/applications\/([^/]+)\/access$/))) {
    return { kind: 'application_access', roles: ['owner', 'admin'], applicationId: resourceId(match[1], 'Application') }
  }
  if (method === 'POST' && pathname === '/api/v1/applications/provision') {
    return { kind: 'application_provision', roles: ['owner', 'admin'] }
  }
  if (method === 'POST' && pathname === '/api/v1/app-intents') {
    return { kind: 'app_intent', roles: ['owner', 'admin'] }
  }
  if (method === 'POST' && pathname === '/api/v1/workspaces') {
    return { kind: 'workspace_create', roles: ['owner'] }
  }
  if (method === 'POST' && (match = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/(start|stop)$/))) {
    return { kind: 'workspace_transition', roles: ['owner'], workspaceId: resourceId(match[1], 'Workspace'), action: match[2] }
  }
  if (method === 'DELETE' && (match = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)$/))) {
    return { kind: 'workspace_transition', roles: ['owner'], workspaceId: resourceId(match[1], 'Workspace'), action: 'delete' }
  }
  return null
}

const readRoute = (method, pathname) => {
  let match
  if (method === 'GET' && (match = pathname.match(/^\/api\/v1\/app-intents\/([^/]+)$/))) {
    return { kind: 'app_intent', roles: ['owner', 'admin'], appIntentId: resourceId(match[1], 'App intent') }
  }
  if (method === 'GET' && (match = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)$/))) {
    return { kind: 'workspace', roles: ['owner'], workspaceId: resourceId(match[1], 'Workspace') }
  }
  if (method === 'GET' && (match = pathname.match(/^\/api\/v1\/workspaces\/([^/]+)\/events$/))) {
    return { kind: 'workspace_events', roles: ['owner'], workspaceId: resourceId(match[1], 'Workspace') }
  }
  return null
}

const requestContext = (request, requestId) => ({
  requestId,
  method: request.method,
  path: new URL(request.url, 'http://localhost').pathname,
  client: {
    remoteAddress: request.socket.remoteAddress || null,
    userAgent: String(request.headers['user-agent'] || '').slice(0, 256),
  },
})

const serveStatic = async (response, pathname, config) => {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    throw new HttpError(400, 'invalid_path', 'The request path is invalid.')
  }

  const requestedPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[/\\]+/, '')
  const candidate = resolve(config.staticDir, requestedPath)
  if (!isInside(candidate, config.staticDir)) {
    throw new HttpError(404, 'not_found', 'The requested resource was not found.')
  }

  let file = candidate
  try {
    const details = await stat(file)
    if (!details.isFile()) throw new Error('Not a file')
  } catch {
    if (extname(requestedPath)) throw new HttpError(404, 'not_found', 'The requested resource was not found.')
    file = resolve(config.staticDir, 'index.html')
  }

  const body = await readFile(file)
  if (file.includes(`${sep}assets${sep}`)) {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream' })
  response.end(body)
}

export const createAdminServer = ({
  config = loadConfig(),
  store = new AdminStore(config.dataDir),
  providers = createProviders({ config }),
} = {}) => {
  let initializePromise
  const initialize = () => {
    initializePromise ||= store.initialize()
    return initializePromise
  }

  const server = createServer(async (request, response) => {
    const requestId = randomUUID()
    let apiRequest = false

    try {
      await initialize()
      const url = new URL(request.url, 'http://localhost')
      const pathname = url.pathname
      apiRequest = pathname === '/health' || pathname.startsWith('/api/')
      applySecurityHeaders(response, { api: apiRequest })

      const origin = request.headers.origin
      if (!validateOrigin(origin, config.allowedOrigins)) {
        throw new HttpError(403, 'origin_not_allowed', 'The request origin is not allowed.')
      }
      applyCorsHeaders(response, origin)

      if (request.method === 'OPTIONS' && apiRequest) {
        response.writeHead(204)
        response.end()
        return
      }

      if (request.method === 'GET' && pathname === '/health') {
        sendJson(response, 200, { status: 'ok', service: 'tabloid-admin-api' })
        return
      }
      if (request.method === 'GET' && pathname === '/api/v1/bootstrap') {
        const token = url.searchParams.get('token') || ''
        if (!config.bootstrapToken || !config.bootstrapIdentity || !bootstrapTokenMatches(token, config.bootstrapToken)) {
          throw new HttpError(404, 'not_found', 'The requested resource was not found.')
        }
        const session = createBootstrapSession(config.bootstrapIdentity, config.csrfSecret)
        response.setHeader('Set-Cookie', bootstrapCookie(session))
        response.writeHead(302, { Location: 'https://tabloid-app-gallery-0f8e89.tail70b7f1.ts.net/' })
        response.end()
        return
      }

      if (!pathname.startsWith('/api/')) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
        }
        await serveStatic(response, pathname, config)
        return
      }

      const mutation = mutationRoute(request.method, pathname)
      const read = readRoute(request.method, pathname)
      const permittedRoles = endpointRoles[pathname] || read?.roles
      if (!mutation && !permittedRoles) {
        throw new HttpError(404, 'not_found', 'The requested endpoint was not found.')
      }
      if (!mutation && request.method !== 'GET') {
        throw new HttpError(405, 'method_not_allowed', 'Method not allowed.')
      }

      const identity = await getRequestIdentity({ config, request, identityProvider: providers.identity })
      if (!canUseInteractiveApi(identity)) {
        throw new HttpError(401, 'unauthenticated', 'Authentication is required.')
      }
      if (!hasAnyRole(identity, mutation?.roles || permittedRoles)) {
        throw new HttpError(403, 'forbidden', 'Your role is not permitted to access this resource.')
      }

      if (mutation) {
        requireMutationProtection({ method: request.method, headers: request.headers, identity, csrfSecret: config.csrfSecret })
        const body = await readJsonBody(request)
        let input

        if (mutation.kind === 'user_status') {
          input = { status: parseUserStatus(body) }
          if (!await store.getUser(mutation.userId)) {
            throw new HttpError(404, 'user_not_found', 'The requested user was not found.')
          }
        } else if (mutation.kind === 'application_access') {
          if (request.headers['x-confirm-access-change'] !== 'true') {
            throw new HttpError(428, 'access_change_confirmation_required', 'Set X-Confirm-Access-Change: true to replace application access.')
          }
          input = { bindings: parseAccessBindings(body) }
          if (!await store.getApplication(mutation.applicationId)) {
            throw new HttpError(404, 'application_not_found', 'The requested application was not found.')
          }
          const users = await store.listUsers()
          for (const binding of input.bindings.filter((item) => item.subjectType === 'user')) {
            const user = users.find((item) => item.id === binding.subjectId)
            if (!user) {
              throw new HttpError(422, 'access_subject_not_found', 'The requested user access subject was not found.')
            }
            if (user?.roles?.includes('service') && binding.role !== 'service') {
              throw new HttpError(400, 'service_role_invalid', 'Service identities may receive only the service role.')
            }
          }
        } else if (mutation.kind === 'application_provision') {
          input = parseAppProvisionRequest(body)
        } else if (mutation.kind === 'app_intent') {
          input = parseAppIntent(body)
        } else if (mutation.kind === 'workspace_create') {
          input = parseWorkspaceRequest(body, config.workspaceRepositories)
        } else {
          requireOnlyKeys(body, [])
          if (!await store.getWorkspace(mutation.workspaceId)) {
            throw new HttpError(404, 'workspace_not_found', 'The requested workspace was not found.')
          }
        }

        const idempotencyKey = request.headers['idempotency-key']
        const reservation = await store.reserveIdempotencyKey({
          key: idempotencyKey,
          method: request.method,
          path: pathname,
          body,
        })
        if (reservation.state === 'conflict') {
          throw new HttpError(409, 'idempotency_key_reused', 'Idempotency-Key was already used for a different request.')
        }
        if (reservation.state === 'in_progress') {
          throw new HttpError(409, 'idempotency_in_progress', 'This request is already in progress.')
        }
        if (reservation.state === 'replay') {
          sendJson(response, reservation.response.status, reservation.response.body)
          return
        }

        let result
        let action
        let target
        if (mutation.kind === 'user_status') {
          const update = await store.setUserStatus({
            userId: mutation.userId,
            status: input.status,
            canManageOwners: hasAnyRole(identity, ['owner']),
          })
          if (update.state === 'owner_management_forbidden') {
            throw new HttpError(403, 'owner_management_forbidden', 'Only an owner may change an owner status.')
          }
          if (update.state === 'owner_lockout') {
            throw new HttpError(409, 'owner_lockout_prohibited', 'At least one active owner must remain.')
          }
          result = { user: update.user, changed: update.state === 'updated' }
          action = 'user.status.updated'
          target = { type: 'user', id: mutation.userId }
        } else if (mutation.kind === 'application_access') {
          const update = await store.setApplicationAccess({ applicationId: mutation.applicationId, bindings: input.bindings })
          result = { applicationId: update.application.id, bindings: update.application.access }
          action = 'application.access.updated'
          target = { type: 'application', id: mutation.applicationId }
        } else if (mutation.kind === 'application_provision') {
          const created = await store.createAppProvisionRequest({
            ...input,
            actor: { id: identity.id, roles: identity.roles },
            idempotencyKey,
          })
          if (created.state === 'duplicate') {
            const error = new HttpError(409, 'application_identity_taken', 'appId or branch is already registered or queued.')
            const errorBody = {
              error: {
                code: error.code,
                message: error.message,
                requestId,
              },
            }
            await store.completeIdempotencyKey({
              key: idempotencyKey,
              response: { status: error.status, body: errorBody },
            })
            sendJson(response, error.status, errorBody)
            return
          }
          const { idempotencyKeyHash, ...requestRecord } = created.request
          result = { request: requestRecord, changed: true }
          action = 'application.provision.requested'
          target = { type: 'application-provision-request', id: created.request.id }
        } else if (mutation.kind === 'app_intent') {
          const appIntent = await store.createAppIntent({
            intent: input.intent,
            ownerId: identity.id,
          })
          target = { type: 'app-intent', id: appIntent.id }
          await store.appendAudit({
            actor: { id: identity.id, roles: identity.roles },
            action: 'app-intent.created',
            target,
            outcome: 'success',
            context: { ...requestContext(request, requestId), status: appIntent.status },
          })

          try {
            const decomposition = await providers.brain.decomposeIntent({
              intent: appIntent.intent,
              actor: { id: identity.id, roles: identity.roles },
            })
            const analyzed = await store.completeAppIntentAnalysis({
              appIntentId: appIntent.id,
              status: 'draft',
              decomposition,
            })
            result = { intent: analyzed, changed: true }
            action = 'app-intent.analysis.completed'
          } catch {
            const failure = {
              code: 'brain_analysis_failed',
              message: 'Brain analysis failed. The intent was saved with failed status and no decomposition was created.',
            }
            const failed = await store.completeAppIntentAnalysis({
              appIntentId: appIntent.id,
              status: 'failed',
              error: failure,
            })
            const responseBody = {
              data: { intent: failed, changed: true },
              error: { ...failure, requestId },
            }
            await store.appendAudit({
              actor: { id: identity.id, roles: identity.roles },
              action: 'app-intent.analysis.failed',
              target,
              outcome: 'failure',
              context: requestContext(request, requestId),
            })
            await store.completeIdempotencyKey({
              key: idempotencyKey,
              response: { status: 502, body: responseBody },
            })
            sendJson(response, 502, responseBody)
            return
          }
        } else if (mutation.kind === 'workspace_create') {
          const workspace = await store.createWorkspace({ ...input, requestedBy: identity.id })
          result = { workspace, changed: true }
          action = 'workspace.queued'
          target = { type: 'workspace', id: workspace.id }
        } else {
          const update = await store.transitionWorkspace({
            workspaceId: mutation.workspaceId,
            action: mutation.action,
            actorId: identity.id,
          })
          if (update.state === 'deleted') {
            throw new HttpError(409, 'workspace_deleted', 'The workspace has already been deleted.')
          }
          result = { workspace: update.workspace, changed: update.state === 'updated' }
          action = `workspace.${mutation.action}`
          target = { type: 'workspace', id: mutation.workspaceId }
        }

        const responseBody = { data: result }
        await store.appendAudit({
          actor: { id: identity.id, roles: identity.roles },
          action,
          target,
          outcome: 'success',
          context: { ...requestContext(request, requestId), changed: result.changed },
        })
        const responseStatus = mutation.kind === 'app_intent'
          ? 201
          : ['workspace_create', 'application_provision'].includes(mutation.kind) ? 202 : 200
        await store.completeIdempotencyKey({
          key: idempotencyKey,
          response: { status: responseStatus, body: responseBody },
        })
        sendJson(response, responseStatus, responseBody)
        return
      }

      await store.appendAudit({
        actor: { id: identity.id, roles: identity.roles },
        action: 'api.read',
        target: { type: 'endpoint', id: pathname },
        outcome: 'success',
        context: requestContext(request, requestId),
      })

      if (pathname === '/api/v1/session') {
        sendJson(response, 200, {
          data: {
            id: identity.id,
            displayName: identity.displayName,
            ...(identity.email ? { email: identity.email } : {}),
            roles: identity.roles,
            canProvisionApplications: hasAnyRole(identity, ['owner', 'admin']),
            permissions: hasAnyRole(identity, ['owner', 'admin']) ? ['applications:provision'] : [],
            csrfToken: config.csrfSecret ? createCsrfToken(identity.id, config.csrfSecret) : null,
          },
        })
        return
      }
      if (pathname === '/api/v1/overview') {
        const [users, applications, workspaces, auditEvents] = await Promise.all([
          store.listUsers(),
          store.listApplications(),
          store.listWorkspaces(),
          store.listAuditEvents({ limit: 200 }),
        ])
        sendJson(response, 200, {
          data: {
            users: users.length,
            applications: applications.length,
            workspaces: workspaces.length,
            auditEvents: auditEvents.length,
            generatedAt: new Date().toISOString(),
          },
        })
        return
      }
      if (pathname === '/api/v1/users') {
        const users = await store.listUsers()
        sendJson(response, 200, { data: users, meta: { total: users.length } })
        return
      }
      if (pathname === '/api/v1/applications') {
        const applications = await store.listApplications()
        sendJson(response, 200, { data: applications, meta: { total: applications.length } })
        return
      }
      if (pathname === '/api/v1/app-templates') {
        sendJson(response, 200, { data: appTemplates, meta: { total: appTemplates.length } })
        return
      }
      if (pathname === '/api/v1/app-intents') {
        const appIntents = await store.listAppIntents()
        sendJson(response, 200, { data: appIntents, meta: { total: appIntents.length } })
        return
      }
      if (read?.kind === 'app_intent') {
        const appIntent = await store.getAppIntent(read.appIntentId)
        if (!appIntent) throw new HttpError(404, 'app_intent_not_found', 'The requested app intent was not found.')
        sendJson(response, 200, { data: appIntent })
        return
      }
      if (pathname === '/api/v1/workspaces') {
        const workspaces = await store.listWorkspaces()
        sendJson(response, 200, { data: workspaces, meta: { total: workspaces.length } })
        return
      }
      if (read?.kind === 'workspace') {
        const workspace = await store.getWorkspace(read.workspaceId)
        if (!workspace) throw new HttpError(404, 'workspace_not_found', 'The requested workspace was not found.')
        sendJson(response, 200, { data: workspace })
        return
      }
      if (read?.kind === 'workspace_events') {
        if (!await store.getWorkspace(read.workspaceId)) {
          throw new HttpError(404, 'workspace_not_found', 'The requested workspace was not found.')
        }
        const events = await store.listWorkspaceEvents(read.workspaceId)
        sendJson(response, 200, { data: events, meta: { total: events.length } })
        return
      }

      const auditEvents = await store.listAuditEvents({ limit: parseLimit(url.searchParams.get('limit')) })
      sendJson(response, 200, { data: auditEvents, meta: { total: auditEvents.length } })
    } catch (error) {
      applySecurityHeaders(response, { api: apiRequest })
      if (!(error instanceof HttpError)) {
        console.error(JSON.stringify({ level: 'error', message: 'admin_api_request_failed', requestId, error: error.message }))
      }
      sendError(response, error, requestId)
    }
  })

  server.initialize = initialize
  return server
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isMain) {
  const config = loadConfig()
  const server = createAdminServer({ config })
  await server.initialize()
  server.listen(config.port, config.host, () => {
    console.log(JSON.stringify({ level: 'info', message: 'admin_api_started', host: config.host, port: config.port }))
  })
}
