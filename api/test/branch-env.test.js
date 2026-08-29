import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

const previewId = (branch) => {
  let slug = branch.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'branch'
  slug = slug.slice(0, 38).replace(/-$/, '')
  return `${slug}-${createHash('sha256').update(branch).digest('hex').slice(0, 6)}`
}

const readGeneratedEnv = async (branch) => {
  const directory = await mkdtemp(join(tmpdir(), 'tabloid-branch-env-'))
  const output = join(directory, `${branch}.env`)

  try {
    execFileSync(process.execPath, [
      resolve('scripts/generate-branch-env.mjs'),
      '--branch',
      branch,
      '--output',
      output,
    ], {
      cwd: resolve('.'),
      stdio: 'pipe',
    })

    return await readFile(output, 'utf8')
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('generated branch env exposes the stable preview origin and relative API path', async () => {
  const apiOrigin = `https://tabloid-${previewId('api')}.tail70b7f1.ts.net`
  const apiEnv = await readGeneratedEnv('api')
  assert.match(apiEnv, new RegExp(`^APP_SLUG=${JSON.stringify(previewId('api'))}$`, 'm'))
  assert.match(apiEnv, /^VITE_APP_NAME="api"$/m)
  assert.match(apiEnv, /^VITE_API_BASE_URL="\/api\/v1"$/m)

  const adminEnv = await readGeneratedEnv('admin')
  assert.match(adminEnv, /^VITE_API_BASE_URL="\/api\/v1"$/m)
})
