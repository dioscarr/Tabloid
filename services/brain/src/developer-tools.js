import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'

const run = promisify(execFile)
const workspace = process.env.BRAIN_WORKSPACE || process.cwd()
const git = async (args) => {
  try {
    const { stdout } = await run('git', ['-C', workspace, ...args], { timeout: 3000, maxBuffer: 64 * 1024, windowsHide: true })
    return stdout.trim()
  } catch { return null }
}
const lines = (value) => value ? value.split(/\r?\n/).filter(Boolean) : []

export const developerTools = {
  async branchStatus() {
    return { workspace: workspace.split(/[\\/]/).pop(), branch: await git(['branch', '--show-current']), head: await git(['rev-parse', 'HEAD']), upstream: await git(['rev-parse', '--abbrev-ref', '@{upstream}']) }
  },
  async workspaceStatus() {
    return { workspace: workspace.split(/[\\/]/).pop(), available: existsSync(workspace), clean: (await git(['status', '--porcelain'])) === '', changedFiles: lines(await git(['status', '--porcelain'])).length }
  },
  async previewStatus() {
    return { configured: Boolean(process.env.PREVIEW_BRANCH || process.env.PREVIEW_URL), branch: process.env.PREVIEW_BRANCH || null, available: process.env.PREVIEW_STATUS === 'available', observedUrl: process.env.PREVIEW_URL ? new URL(process.env.PREVIEW_URL).origin : null }
  },
  async gitStatus() {
    return { branch: await git(['branch', '--show-current']), status: lines(await git(['status', '--short'])).map((line) => ({ code: line.slice(0, 2), path: line.slice(3) })), diff: { stat: await git(['diff', '--stat']), files: lines(await git(['diff', '--name-status'])).map((line) => line.split(/\s+/, 2)) } }
  },
  async codeServerContext() {
    return { configured: Boolean(process.env.CODE_SERVER_URL || process.env.CODE_SERVER_PORT), origin: process.env.CODE_SERVER_URL ? new URL(process.env.CODE_SERVER_URL).origin : null, port: process.env.CODE_SERVER_PORT ? Number(process.env.CODE_SERVER_PORT) : null, workspace: workspace.split(/[\\/]/).pop() }
  }
}
