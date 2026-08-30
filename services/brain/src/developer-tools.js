import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const run = promisify(execFile)
const workspace = process.env.BRAIN_WORKSPACE || process.cwd()
const git = async (args, cwd = workspace) => {
  try {
    const { stdout } = await run('git', ['-C', cwd, ...args], { timeout: 5000, maxBuffer: 256 * 1024, windowsHide: true })
    return stdout.trim()
  } catch { return null }
}
const lines = (value) => value ? value.split(/\r?\n/).filter(Boolean) : []

const CONVENTIONAL_TYPES = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  refactor: 'Refactoring',
  docs: 'Documentation',
  style: 'Styles',
  test: 'Tests',
  chore: 'Chores',
  ci: 'CI/CD',
  build: 'Build',
  revert: 'Reverts'
}

const parseConventionalCommit = (commit) => {
  const match = commit.match(/^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i)
  if (!match) return null
  const [, type, scope, breaking, subject] = match
  return {
    type: type.toLowerCase(),
    scope: scope || null,
    breaking: Boolean(breaking),
    subject: subject.trim(),
    raw: commit
  }
}

const formatChangelog = (commits, opts = {}) => {
  const { groupByType = true, includeScope = true, since, until, repo } = opts
  const parsed = commits.map(parseConventionalCommit).filter(Boolean)
  const byType = {}
  for (const c of parsed) {
    const label = CONVENTIONAL_TYPES[c.type] || c.type
    byType[label] ??= []
    byType[label].push(c)
  }
  const order = ['Features', 'Bug Fixes', 'Performance', 'Refactoring', 'Documentation', 'Styles', 'Tests', 'Chores', 'CI/CD', 'Build', 'Reverts']
  const sections = order.filter(o => byType[o]).map(type => {
    const items = byType[type].map(c => {
      const scopeStr = includeScope && c.scope ? `(${c.scope})` : ''
      const breakingStr = c.breaking ? '**BREAKING CHANGE** ' : ''
      return `- ${breakingStr}${c.subject}${scopeStr ? ` ${scopeStr}` : ''}`
    })
    return `### ${type}\n${items.join('\n')}`
  })
  const header = repo ? `## ${repo}\n` : ''
  const dateRange = since || until ? `\n*${since ? `Since ${since}` : ''}${since && until ? ' – ' : ''}${until ? `Until ${until}` : ''}*\n` : ''
  return `${header}${dateRange}${sections.join('\n\n')}`
}

const getCommits = async (repoPath, opts = {}) => {
  const { since, until, limit = 100, author, grep } = opts
  const args = ['log', '--oneline', `--max-count=${limit}`, '--pretty=format:%H|%s|%an|%ai']
  if (since) args.push(`--since=${since}`)
  if (until) args.push(`--until=${until}`)
  if (author) args.push(`--author=${author}`)
  if (grep) args.push(`--grep=${grep}`)
  const output = await git(args, repoPath)
  if (!output) return []
  return lines(output).map(line => {
    const [hash, ...rest] = line.split('|')
    const subject = rest.slice(0, -2).join('|')
    const author = rest[rest.length - 2]
    const date = rest[rest.length - 1]
    return { hash, subject, author, date }
  })
}

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
  },
  async changelog(opts = {}) {
    const { since, until, limit = 100, repoPaths = [workspace] } = opts
    const results = []
    for (const repoPath of repoPaths) {
      const commits = await getCommits(repoPath, { since, until, limit })
      const repoName = repoPath.split(/[\\/]/).pop()
      results.push(formatChangelog(commits.map(c => c.subject), { since, until, repo: repoName }))
    }
    return results.join('\n\n---\n\n')
  }
}