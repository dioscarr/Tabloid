import assert from 'node:assert/strict'
import { buildVibeHref, VIBE_URL } from '../src/vibe-handoff.js'

const featureHref = buildVibeHref({ id: 'feature/new-story', name: 'New Story' })
const featureUrl = new URL(featureHref)
assert.equal(featureUrl.origin, VIBE_URL)
assert.equal(featureUrl.searchParams.get('model'), 'vibe-feature/new-story')
assert.equal(featureUrl.searchParams.get('q'), 'Help me improve New Story. Start by understanding this app and ask what I want to change.')

const mainHref = buildVibeHref({ id: 'main', name: 'Production' })
assert.equal(new URL(mainHref).searchParams.get('model'), 'vibe-main')

assert.equal(buildVibeHref(undefined), VIBE_URL)
assert.equal(buildVibeHref(null), VIBE_URL)

console.log('Vibe handoff URL smoke test passed')
