import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const storePath = process.env.BRAIN_TELEMETRY_STORE || '/data/telemetry.json'
const retentionMs = 25 * 60 * 60 * 1000
const maxEvents = 20000
const maxSubscribers = 32
const subscribers = new Set()
const connections = new Map()
const appIdPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/i
const routePattern = /^\/[a-z0-9][a-z0-9._?=&/-]{0,239}$/i
const presenceTypes = new Set(['connection_open', 'connection_heartbeat', 'connection_close'])

const readStore = () => {
  try { return JSON.parse(readFileSync(storePath, 'utf8')) }
  catch (error) {
    if (error.code === 'ENOENT') return { version: 1, events: [] }
    throw error
  }
}

const writeStore = (store) => {
  mkdirSync(dirname(storePath), { recursive: true })
  const temporary = `${storePath}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporary, storePath)
}

const cleanStore = (store, now = Date.now()) => {
  store.events = (Array.isArray(store.events) ? store.events : [])
    .filter((event) => Date.parse(event.receivedAt) >= now - retentionMs)
    .slice(0, maxEvents)
  return store
}

const cleanString = (value, field, pattern) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 240 || (pattern && !pattern.test(value))) throw new Error(`Invalid ${field}.`)
  return value.trim()
}

const normalizeSignal = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Telemetry signal must be an object.')
  const sourceApp = cleanString(input.sourceApp, 'sourceApp', appIdPattern)
  const targetApp = cleanString(input.targetApp, 'targetApp', appIdPattern)
  const targetRoute = cleanString(input.targetRoute, 'targetRoute', routePattern)
  const eventType = cleanString(input.eventType || 'request', 'eventType', appIdPattern)
  const connectionId = input.connectionId ? cleanString(input.connectionId, 'connectionId', /^[a-z0-9-]{16,80}$/i) : ''
  const status = Number(input.status)
  const durationMs = Number(input.durationMs)
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
  if (!Number.isInteger(status) || status < 100 || status > 599) throw new Error('Invalid status.')
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > 300000) throw new Error('Invalid durationMs.')
  if (Number.isNaN(occurredAt.getTime())) throw new Error('Invalid occurredAt.')
  if (presenceTypes.has(eventType) && !connectionId) throw new Error('connectionId is required for presence signals.')
  return { id: randomUUID(), sourceApp, targetApp, targetRoute, eventType, connectionId, status, durationMs, occurredAt: occurredAt.toISOString(), receivedAt: new Date().toISOString() }
}

const aggregate = (events, observedAt) => {
  const byRoute = new Map()
  for (const event of events) {
    const key = `${event.sourceApp}|${event.targetApp}|${event.targetRoute}`
    const route = byRoute.get(key) || { sourceApp: event.sourceApp, targetApp: event.targetApp, targetRoute: event.targetRoute, requests: 0, errors: 0, durationTotalMs: 0 }
    if (presenceTypes.has(event.eventType)) continue
    route.requests += 1
    route.errors += event.status >= 500 ? 1 : 0
    route.durationTotalMs += event.durationMs
    byRoute.set(key, route)
  }
  for (const connection of connections.values()) {
    const key = `${connection.sourceApp}|${connection.targetApp}|${connection.targetRoute}`
    if (!byRoute.has(key)) byRoute.set(key, { sourceApp: connection.sourceApp, targetApp: connection.targetApp, targetRoute: connection.targetRoute, requests: 0, errors: 0, durationTotalMs: 0 })
  }
  return {
    observedAt,
    freshness: 'live',
    sourceStatus: { source: 'brain-signals', ok: true, observedAt },
    routes: [...byRoute.values()].map(({ durationTotalMs, ...route }) => ({ ...route, averageLatencyMs: route.requests ? Math.round(durationTotalMs / route.requests) : null, activeConnections: [...connections.values()].filter((connection) => connection.sourceApp === route.sourceApp && connection.targetApp === route.targetApp && connection.targetRoute === route.targetRoute).length })),
  }
}

const notify = (payload) => {
  const message = `data: ${JSON.stringify(payload)}\n\n`
  for (const send of subscribers) {
    try { send(message) } catch { subscribers.delete(send) }
  }
}

export const telemetryStore = {
  record(input) {
    const event = normalizeSignal(input)
    if (presenceTypes.has(event.eventType)) {
      if (event.eventType === 'connection_close') connections.delete(event.connectionId)
      else connections.set(event.connectionId, { sourceApp: event.sourceApp, targetApp: event.targetApp, targetRoute: event.targetRoute, lastSeen: Date.now() })
    }
    const store = cleanStore(readStore())
    store.events.unshift(event)
    writeStore(store)
    notify({ type: 'telemetry', event: { sourceApp: event.sourceApp, targetRoute: event.targetRoute, status: event.status, durationMs: event.durationMs }, observedAt: event.receivedAt })
    return { accepted: true, signalId: event.id }
  },

  routes(range = '24h') {
    const now = Date.now()
    for (const [connectionId, connection] of connections) if (now - connection.lastSeen > 45000) connections.delete(connectionId)
    const duration = range === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    const store = cleanStore(readStore(), now)
    const events = store.events.filter((event) => Date.parse(event.receivedAt) >= now - duration)
    const observedAt = new Date().toISOString()
    return aggregate(events, observedAt)
  },

  subscribe(send) {
    if (subscribers.size >= maxSubscribers) throw new Error('Telemetry stream capacity reached.')
    subscribers.add(send)
    return () => subscribers.delete(send)
  },
}
