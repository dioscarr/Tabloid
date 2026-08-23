import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { catalog } from './catalog.js'

const storePath = process.env.BRAIN_CONTENT_STORE || '/data/content.json'
const emptyStore = () => ({ version: 1, pages: {} })
const actorPattern = /^[a-z0-9][a-z0-9._:@/-]{0,127}$/i

const readStore = () => {
  try { return JSON.parse(readFileSync(storePath, 'utf8')) }
  catch (error) {
    if (error.code === 'ENOENT') return emptyStore()
    throw error
  }
}

const writeStore = (store) => {
  mkdirSync(dirname(storePath), { recursive: true })
  const temporary = `${storePath}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporary, storePath)
}

const keyFor = (appId, pageId) => `${appId}/${pageId}`
const cleanActor = (actor) => {
  if (typeof actor !== 'string' || !actorPattern.test(actor)) throw new Error('Invalid actor identity.')
  return actor
}
const cleanMessage = (message) => {
  if (typeof message !== 'string' || !message.trim() || message.length > 240) throw new Error('Invalid publication message.')
  return message.trim()
}
const requireSurface = (appId, pageId) => {
  if (!catalog.getSurface(appId, pageId)) throw new Error('Unknown application content surface.')
}

const pageRecord = (store, appId, pageId) => {
  const key = keyFor(appId, pageId)
  store.pages[key] ??= { appId, pageId, published: null, draft: null, revisions: [] }
  return store.pages[key]
}

const publicPage = (page) => ({
  appId: page.appId,
  pageId: page.pageId,
  published: page.published,
  draft: page.draft,
  revisions: page.revisions.map(({ id, createdAt, actor, message }) => ({ id, createdAt, actor, message }))
})

export const contentStore = {
  get(appId, pageId) {
    requireSurface(appId, pageId)
    const store = readStore()
    return publicPage(pageRecord(store, appId, pageId))
  },

  saveDraft(appId, pageId, values, actor) {
    const cleanValues = catalog.validateContentValues(appId, pageId, values)
    const store = readStore()
    const page = pageRecord(store, appId, pageId)
    page.draft = { id: randomUUID(), values: cleanValues, actor: cleanActor(actor), createdAt: new Date().toISOString() }
    writeStore(store)
    return publicPage(page)
  },

  publish(appId, pageId, { draftId, confirmed, actor, message = 'Published from Brain Studio' }) {
    if (confirmed !== true) throw new Error('Explicit approval is required to publish.')
    if (typeof draftId !== 'string' || !draftId) throw new Error('A draft identifier is required.')
    requireSurface(appId, pageId)
    const store = readStore()
    const page = pageRecord(store, appId, pageId)
    if (!page.draft || page.draft.id !== draftId) throw new Error('The selected draft is missing or no longer current.')
    const revision = { id: randomUUID(), values: catalog.validateContentValues(appId, pageId, page.draft.values), actor: cleanActor(actor), message: cleanMessage(message), createdAt: new Date().toISOString() }
    page.published = revision
    page.revisions.unshift(revision)
    page.revisions = page.revisions.slice(0, 50)
    page.draft = null
    writeStore(store)
    return publicPage(page)
  },

  rollback(appId, pageId, { revisionId, confirmed, actor }) {
    if (confirmed !== true) throw new Error('Explicit approval is required to roll back.')
    if (typeof revisionId !== 'string' || !revisionId) throw new Error('A revision identifier is required.')
    requireSurface(appId, pageId)
    const store = readStore()
    const page = pageRecord(store, appId, pageId)
    const target = page.revisions.find(({ id }) => id === revisionId)
    if (!target) throw new Error('Revision not found.')
    const revision = { id: randomUUID(), values: catalog.validateContentValues(appId, pageId, target.values), actor: cleanActor(actor), message: `Rollback to ${revisionId}`, createdAt: new Date().toISOString() }
    page.published = revision
    page.revisions.unshift(revision)
    page.revisions = page.revisions.slice(0, 50)
    page.draft = null
    writeStore(store)
    return publicPage(page)
  }
}
