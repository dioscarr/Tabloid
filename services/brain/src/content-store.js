import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

const storePath = process.env.BRAIN_CONTENT_STORE || '/data/content.json'
const emptyStore = () => ({ version: 1, pages: {} })

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
const cleanValues = (values) => {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Content values must be an object.')
  const entries = Object.entries(values)
  if (!entries.length || entries.length > 250) throw new Error('A revision must contain between 1 and 250 fields.')
  return Object.fromEntries(entries.map(([key, value]) => {
    if (!/^[a-z0-9][a-z0-9._-]{0,159}$/i.test(key)) throw new Error(`Invalid content key: ${key}`)
    if (typeof value !== 'string' || value.length > 20000) throw new Error(`Invalid content value: ${key}`)
    return [key, value]
  }))
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
    const store = readStore()
    return publicPage(pageRecord(store, appId, pageId))
  },

  saveDraft(appId, pageId, values, actor = 'tailnet-admin') {
    const store = readStore()
    const page = pageRecord(store, appId, pageId)
    page.draft = { id: randomUUID(), values: cleanValues(values), actor, createdAt: new Date().toISOString() }
    writeStore(store)
    return publicPage(page)
  },

  publish(appId, pageId, { draftId, confirmed, actor = 'tailnet-admin', message = 'Published from Brain Studio' }) {
    if (confirmed !== true) throw new Error('Explicit approval is required to publish.')
    const store = readStore()
    const page = pageRecord(store, appId, pageId)
    if (!page.draft || page.draft.id !== draftId) throw new Error('The selected draft is missing or no longer current.')
    const revision = { id: randomUUID(), values: page.draft.values, actor, message: String(message).slice(0, 240), createdAt: new Date().toISOString() }
    page.published = revision
    page.revisions.unshift(revision)
    page.revisions = page.revisions.slice(0, 50)
    page.draft = null
    writeStore(store)
    return publicPage(page)
  },

  rollback(appId, pageId, { revisionId, confirmed, actor = 'tailnet-admin' }) {
    if (confirmed !== true) throw new Error('Explicit approval is required to roll back.')
    const store = readStore()
    const page = pageRecord(store, appId, pageId)
    const target = page.revisions.find(({ id }) => id === revisionId)
    if (!target) throw new Error('Revision not found.')
    const revision = { id: randomUUID(), values: target.values, actor, message: `Rollback to ${revisionId}`, createdAt: new Date().toISOString() }
    page.published = revision
    page.revisions.unshift(revision)
    page.revisions = page.revisions.slice(0, 50)
    page.draft = null
    writeStore(store)
    return publicPage(page)
  }
}
