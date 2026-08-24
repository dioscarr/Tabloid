import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const storePath = process.env.BRAIN_ENGAGEMENT_STORE || '/data/engagement.json'
const eventTypes = new Set(['project_click', 'project_bookmark', 'project_unbookmark'])
const maxEvents = 10000

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

const requiredString = (value, field, maxLength) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`Invalid ${field}.`)
  }
  return value.trim()
}

const normalizeEvent = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Event must be an object.')
  const type = requiredString(input.type, 'event type', 40)
  if (!eventTypes.has(type)) throw new Error('Unsupported engagement event type.')
  const appId = requiredString(input.appId, 'appId', 80)
  if (appId !== 'ai-news') throw new Error('Engagement events are limited to ai-news.')
  const visitorId = requiredString(input.visitorId, 'visitorId', 100)
  const occurredAt = requiredString(input.occurredAt, 'occurredAt', 40)
  if (Number.isNaN(Date.parse(occurredAt))) throw new Error('Invalid occurredAt.')
  const project = input.project
  if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Invalid project.')
  const topics = Array.isArray(project.topics) && project.topics.length <= 20
    ? project.topics.map((topic) => requiredString(topic, 'project topic', 80))
    : []
  return {
    id: randomUUID(),
    type,
    visitorId,
    appId,
    project: {
      name: requiredString(project.name, 'project name', 240),
      url: requiredString(project.url, 'project URL', 1000),
      topics,
    },
    occurredAt,
    receivedAt: new Date().toISOString(),
  }
}

export const engagementStore = {
  record(input) {
    const event = normalizeEvent(input)
    const store = readStore()
    store.events = Array.isArray(store.events) ? store.events : []
    store.events.unshift(event)
    store.events = store.events.slice(0, maxEvents)
    writeStore(store)
    return { accepted: true, eventId: event.id }
  },
}
