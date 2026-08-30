import assert from 'node:assert/strict'
import { buildVibeHref, VIBE_URL } from '../src/vibe-handoff.js'

const featureUrl = new URL(buildVibeHref({ id: 'feature/new-story', name: 'New Story' }))
assert.equal(featureUrl.origin, VIBE_URL)
assert.equal(featureUrl.searchParams.get('model'), 'vibe-feature/new-story')
assert.equal(featureUrl.searchParams.get('q'), 'Help me improve New Story. Start by understanding this app and ask what I want to change.')

assert.equal(new URL(buildVibeHref({ id: 'main', name: 'Production' })).searchParams.get('model'), 'vibe-main')
assert.equal(buildVibeHref(), VIBE_URL)
assert.equal(buildVibeHref(null), VIBE_URL)

console.log('Vibe handoff URL smoke test passed')
