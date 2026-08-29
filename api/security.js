import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpError } from './http.js'

const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const isMutation = (method) => mutationMethods.has(method)

export const validateOrigin = (origin, allowedOrigins) => {
  if (!origin) return true
  return allowedOrigins.includes(origin)
}

export const createCsrfToken = (identityId, secret) => {
  if (!identityId || !secret) throw new Error('An identity and CSRF secret are required.')
  return createHmac('sha256', secret).update(`csrf:${identityId}`).digest('base64url')
}

const safeEqual = (first, second) => {
  const firstBuffer = Buffer.from(first)
  const secondBuffer = Buffer.from(second)
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer)
}

export const requireMutationProtection = ({ method, headers, identity, csrfSecret }) => {
  if (!isMutation(method)) return
  if (!csrfSecret) {
    throw new HttpError(503, 'mutation_security_unconfigured', 'Mutation security is not configured.')
  }
  if (!identity) {
    throw new HttpError(401, 'unauthenticated', 'Authentication is required.')
  }

  const csrfToken = headers['x-csrf-token']
  const idempotencyKey = headers['idempotency-key']
  const expected = createCsrfToken(identity.id, csrfSecret)

  if (typeof csrfToken !== 'string' || !safeEqual(csrfToken, expected)) {
    throw new HttpError(403, 'csrf_invalid', 'A valid CSRF token is required.')
  }
  if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9._~-]{8,200}$/.test(idempotencyKey)) {
    throw new HttpError(400, 'idempotency_key_required', 'A valid Idempotency-Key is required.')
  }
}

export const applyCorsHeaders = (response, origin) => {
  if (!origin) return
  response.setHeader('Access-Control-Allow-Origin', origin)
  response.setHeader('Access-Control-Allow-Credentials', 'true')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Idempotency-Key, X-Confirm-Access-Change')
  response.setHeader('Access-Control-Max-Age', '600')
  response.setHeader('Vary', 'Origin')
}

export const applySecurityHeaders = (response, { api = false } = {}) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('X-Frame-Options', 'SAMEORIGIN')
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
  if (api) {
    response.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'")
    response.setHeader('Cache-Control', 'no-store')
  }
}
