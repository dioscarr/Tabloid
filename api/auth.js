import { createHmac, timingSafeEqual } from 'node:crypto'

const interactiveRoles = new Set(['owner', 'admin', 'editor', 'viewer'])
const sessionCookieName = 'tabloid_admin_session'

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const decode = (value) => {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) } catch { return null }
}
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url')
const safeEqual = (first, second) => {
  const left = Buffer.from(first || '')
  const right = Buffer.from(second || '')
  return left.length === right.length && timingSafeEqual(left, right)
}
const readCookie = (header, name) => String(header || '').split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1)

export const createBootstrapSession = (identity, secret) => {
  const payload = encode({ ...identity, expiresAt: Date.now() + 15 * 60 * 1000 })
  return `${payload}.${sign(payload, secret)}`
}

export const bootstrapTokenMatches = (token, expected) => safeEqual(token, expected)

const readBootstrapSession = (request, secret) => {
  const token = readCookie(request.headers.cookie, sessionCookieName)
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature || !safeEqual(sign(payload, secret), signature)) return null
  const identity = decode(payload)
  if (!identity || !Number.isSafeInteger(identity.expiresAt) || identity.expiresAt < Date.now() || !/^[A-Za-z0-9._:@-]{1,128}$/.test(identity.id) || !Array.isArray(identity.roles) || identity.roles.some((role) => !interactiveRoles.has(role))) return null
  return { id: identity.id, displayName: String(identity.displayName || identity.id).slice(0, 160), roles: identity.roles }
}

export const getRequestIdentity = async ({ config, request, identityProvider }) => {
  if (config.developmentIdentity) return config.developmentIdentity
  if (config.csrfSecret) {
    const sessionIdentity = readBootstrapSession(request, config.csrfSecret)
    if (sessionIdentity) return sessionIdentity
  }
  return identityProvider.getIdentity({ request })
}

export const canUseInteractiveApi = (identity) => Boolean(
  identity && !identity.roles.includes('service') && identity.roles.some((role) => interactiveRoles.has(role)),
)

export const hasAnyRole = (identity, permittedRoles) => Boolean(
  identity && identity.roles.some((role) => permittedRoles.includes(role)),
)

export const bootstrapCookie = (session) => `${sessionCookieName}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`
