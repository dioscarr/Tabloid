import { readFileSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'

const roles = new Set(['owner', 'admin', 'editor', 'viewer', 'service'])

const isInside = (candidate, parent) => {
  const path = relative(parent, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !path.includes(`..${sep}`))
}

const parsePort = (value) => {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('ADMIN_PORT must be an integer between 1 and 65535.')
  }
  return port
}

const parseOrigins = (value, mode) => {
  if (!value) return []

  return [...new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean).map((origin) => {
    let url
    try {
      url = new URL(origin)
    } catch {
      throw new Error(`ADMIN_ALLOWED_ORIGINS contains an invalid origin: ${origin}`)
    }

    if (url.origin !== origin || url.username || url.password || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`ADMIN_ALLOWED_ORIGINS must contain origins without paths: ${origin}`)
    }
    if (mode === 'production' && url.protocol !== 'https:') {
      throw new Error('ADMIN_ALLOWED_ORIGINS must use HTTPS in production.')
    }
    return url.origin
  }))]
}

const parseRepositories = (value) => [...new Set(
  value.split(',').map((repository) => repository.trim()).filter(Boolean).map((repository) => {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
      throw new Error(`ADMIN_WORKSPACE_REPOSITORIES contains an invalid repository: ${repository}`)
    }
    return repository
  }),
)]

const parseTrustedLogins = (value) => [...new Set(
  value.split(',').map((login) => login.trim().toLowerCase()).filter(Boolean).map((login) => {
    if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(login)) {
      throw new Error(`ADMIN_TRUSTED_LOGINS contains an invalid login: ${login}`)
    }
    return login
  }),
)]

const parseBootstrapIdentity = (value) => {
  if (!value) return null
  let identity
  try {
    identity = JSON.parse(value)
  } catch {
    throw new Error('ADMIN_BOOTSTRAP_IDENTITY must be valid JSON.')
  }
  const id = String(identity?.id || '').trim()
  const displayName = String(identity?.displayName || id).trim()
  if (!/^[A-Za-z0-9._:@-]{1,128}$/.test(id) || !displayName || displayName.length > 160 || !Array.isArray(identity?.roles) || !identity.roles.length || identity.roles.some((role) => !roles.has(role) || role === 'service')) {
    throw new Error('ADMIN_BOOTSTRAP_IDENTITY must include a valid interactive identity and roles.')
  }
  return Object.freeze({ id, displayName, roles: Object.freeze([...new Set(identity.roles)]) })
}

const parseServiceOrigin = (value, name) => {
  if (!value) return null

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) origin.`)
  }

  if (
    url.username
    || url.password
    || !['http:', 'https:'].includes(url.protocol)
    || url.pathname !== '/'
    || url.search
    || url.hash
  ) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials or a path.`)
  }
  return url.origin
}

const readOptionalSecret = (value, file, name) => {
  if (value && file) throw new Error(`${name} and ${name}_FILE cannot both be configured.`)
  if (file) return readFileSync(file, 'utf8').trim() || null
  return value || null
}

const parseDevIdentity = (value) => {
  let identity
  try {
    identity = JSON.parse(value)
  } catch {
    throw new Error('ADMIN_DEV_IDENTITY must be valid JSON.')
  }

  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    throw new Error('ADMIN_DEV_IDENTITY must be an object.')
  }

  const id = String(identity.id || '').trim()
  const displayName = String(identity.displayName || identity.name || id).trim()
  const email = identity.email === undefined ? undefined : String(identity.email).trim()
  const identityRoles = Array.isArray(identity.roles) ? [...new Set(identity.roles.map((role) => String(role)))] : []

  if (!/^[A-Za-z0-9._:@-]{1,128}$/.test(id)) {
    throw new Error('ADMIN_DEV_IDENTITY.id is invalid.')
  }
  if (
    !displayName
    || displayName.length > 160
    || identityRoles.length === 0
    || identityRoles.some((role) => !roles.has(role))
    || (identityRoles.includes('service') && identityRoles.length > 1)
  ) {
    throw new Error('ADMIN_DEV_IDENTITY must include a displayName and one or more valid roles.')
  }
  if (email !== undefined && (email.length > 254 || !email.includes('@'))) {
    throw new Error('ADMIN_DEV_IDENTITY.email is invalid.')
  }

  return Object.freeze({ id, displayName, ...(email ? { email } : {}), roles: Object.freeze(identityRoles) })
}

export const loadConfig = ({ env = process.env, cwd = process.cwd() } = {}) => {
  const mode = env.NODE_ENV || 'production'
  const staticDir = resolve(cwd, env.ADMIN_STATIC_DIR || 'dist')
  const dataDir = resolve(cwd, env.ADMIN_DATA_DIR || 'data/admin-api')
  const developmentIdentityValue = env.ADMIN_DEV_IDENTITY
  const brainApiUrl = parseServiceOrigin(env.BRAIN_API_URL || '', 'BRAIN_API_URL')
  const brainAdminToken = readOptionalSecret(env.BRAIN_ADMIN_TOKEN, env.BRAIN_ADMIN_TOKEN_FILE, 'BRAIN_ADMIN_TOKEN')
  const brainAdminOrigin = parseServiceOrigin(env.BRAIN_ADMIN_ORIGIN || '', 'BRAIN_ADMIN_ORIGIN')
  const bootstrapToken = env.ADMIN_BOOTSTRAP_TOKEN || null
  const bootstrapIdentity = parseBootstrapIdentity(env.ADMIN_BOOTSTRAP_IDENTITY || '')

  if (developmentIdentityValue && mode !== 'development') {
    throw new Error('ADMIN_DEV_IDENTITY is only permitted when NODE_ENV=development.')
  }
  if (isInside(dataDir, staticDir)) {
    throw new Error('ADMIN_DATA_DIR must not be inside ADMIN_STATIC_DIR.')
  }
  if (Boolean(bootstrapToken) !== Boolean(bootstrapIdentity)) {
    throw new Error('ADMIN_BOOTSTRAP_TOKEN and ADMIN_BOOTSTRAP_IDENTITY must be configured together.')
  }

  return Object.freeze({
    mode,
    host: env.ADMIN_HOST || '0.0.0.0',
    port: parsePort(env.ADMIN_PORT || '8080'),
    staticDir,
    dataDir,
    allowedOrigins: Object.freeze(parseOrigins(env.ADMIN_ALLOWED_ORIGINS || '', mode)),
    workspaceRepositories: Object.freeze(parseRepositories(env.ADMIN_WORKSPACE_REPOSITORIES || '')),
    trustedLogins: Object.freeze(parseTrustedLogins(env.ADMIN_TRUSTED_LOGINS || '')),
    bootstrapToken,
    bootstrapIdentity,
    csrfSecret: env.ADMIN_CSRF_SECRET || null,
    brainApiUrl,
    brainAdminToken,
    brainAdminOrigin,
    developmentIdentity: developmentIdentityValue ? parseDevIdentity(developmentIdentityValue) : null,
  })
}

export const validRoles = Object.freeze([...roles])
