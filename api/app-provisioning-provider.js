import { ProviderUnavailableError } from './providers.js'

const githubApi = 'https://api.github.com'
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const encodeRef = (ref) => ref.split('/').map((part) => encodeURIComponent(part)).join('/')
const readJsonWithTimeout = async (response, milliseconds) => Promise.race([
  response.json(),
  new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('Response body timed out.'), { code: 'response_timeout' })), milliseconds)),
])

export class GitHubAppProvisioningProvider {
  constructor({
    repository,
    token,
    deploymentUrl,
    deploymentOrigin,
    deploymentLogin,
    fetchImpl = globalThis.fetch,
    sleepImpl = sleep,
    pollIntervalMs = 30000,
    maxWorkflowPolls = 20,
    requestTimeoutMs = 30000,
  } = {}) {
    if (!repository || !token || !deploymentUrl || !deploymentOrigin || !deploymentLogin) {
      throw new ProviderUnavailableError('app-provisioning', 'configuration')
    }
    this.repository = repository
    this.token = token
    this.deploymentUrl = deploymentUrl
    this.deploymentOrigin = deploymentOrigin
    this.deploymentLogin = deploymentLogin
    this.fetchImpl = fetchImpl
    this.sleepImpl = sleepImpl
    this.pollIntervalMs = Math.max(30000, pollIntervalMs)
    this.maxWorkflowPolls = Math.min(20, Math.max(1, maxWorkflowPolls))
    this.requestTimeoutMs = Math.max(1000, requestTimeoutMs)
  }

  async github(path, options = {}) {
    let response
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    try {
      response = await this.fetchImpl(new URL(path, githubApi), {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + this.token,
          'User-Agent': 'tabloid-admin-provisioner',
          ...(options.headers || {}),
        },
      })
    } catch (error) {
      const failure = new Error('GitHub request could not be completed.')
      failure.retryable = true
      failure.code = 'github_network_error'
      failure.cause = error
      throw failure
    } finally {
      clearTimeout(timeout)
    }
    if (response.status === 408 || response.status === 429 || response.status >= 500 || (response.status === 403 && response.headers?.get?.('x-ratelimit-remaining') === '0')) {
      const failure = new Error(`GitHub returned transient HTTP ${response.status}.`)
      failure.retryable = true
      failure.code = 'github_transient_error'
      throw failure
    }
    if (!response.ok) {
      const failure = new Error(`GitHub returned HTTP ${response.status}.`)
      failure.code = response.status === 404
        ? 'github_not_found'
        : response.status === 409 ? 'github_branch_conflict'
          : response.status === 422 ? 'github_unprocessable' : 'github_request_failed'
      throw failure
    }
    return response
  }

  async getBranch(branch) {
    const response = await this.github(`/repos/${this.repository}/branches/${encodeRef(branch)}`)
    return readJsonWithTimeout(response, this.requestTimeoutMs)
  }

  async createOrReuseBranch({ branch, sourceBranch }) {
    const source = await this.getBranch(sourceBranch)
    try {
      const existing = await this.getBranch(branch)
      if (existing.commit?.sha !== source.commit?.sha) {
        const failure = new Error('The target branch already exists at a different commit.')
        failure.code = 'github_branch_conflict'
        throw failure
      }
      return { sha: existing.commit.sha, reused: true }
    } catch (error) {
      if (error.code !== 'github_not_found') {
        throw error
      }
    }

    try {
      const response = await this.github(`/repos/${this.repository}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: source.commit.sha }),
      })
      const created = await readJsonWithTimeout(response, this.requestTimeoutMs)
      return { sha: created.object?.sha || source.commit.sha, reused: false }
    } catch (error) {
      if (!['github_branch_conflict', 'github_unprocessable'].includes(error.code)) throw error
      const existing = await this.getBranch(branch)
      if (existing.commit?.sha !== source.commit?.sha) throw error
      return { sha: existing.commit.sha, reused: true }
    }
  }

  async waitForWorkflow({ branch, commitSha }) {
    for (let poll = 0; poll < this.maxWorkflowPolls; poll += 1) {
      const response = await this.github(`/repos/${this.repository}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=10`, {
        headers: { 'If-None-Match': '' },
      })
      const body = await readJsonWithTimeout(response, this.requestTimeoutMs)
      const run = body.workflow_runs?.find((item) => item.head_sha === commitSha && item.name === 'Publish preview')
      if (run?.status === 'completed') {
        if (run.conclusion !== 'success') {
          const failure = new Error('The preview GitHub Actions workflow failed.')
          failure.code = 'preview_workflow_failed'
          throw failure
        }
        return { workflowRunId: run.id, completedAt: run.updated_at }
      }
      if (poll + 1 < this.maxWorkflowPolls) await this.sleepImpl(this.pollIntervalMs)
    }
    const failure = new Error('The preview GitHub Actions workflow is still pending.')
    failure.retryable = true
    failure.code = 'preview_workflow_pending'
    throw failure
  }

  async getDeployment(branch) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    let response
    try {
      response = await this.fetchImpl(`${this.deploymentUrl}/api/v1/branches`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Origin: this.deploymentOrigin,
          'Tailscale-User-Login': this.deploymentLogin,
        },
      })
      if (response.status === 404 || response.status === 408 || response.status === 429 || response.status >= 500) {
        const failure = new Error('The preview reconciler has not reported a deployment yet.')
        failure.retryable = true
        failure.code = 'preview_deployment_pending'
        throw failure
      }
      if (!response.ok) {
        const failure = new Error(`The preview reconciler returned HTTP ${response.status}.`)
        failure.code = 'preview_deployment_http_error'
        throw failure
      }
      const body = await readJsonWithTimeout(response, this.requestTimeoutMs)
      const deployment = body.branches?.find((item) => item.branch === branch)
      if (!deployment) {
        const failure = new Error('The preview reconciler has not reported this branch yet.')
        failure.retryable = true
        failure.code = 'preview_deployment_pending'
        throw failure
      }
      return deployment
    } catch (error) {
      if (error.retryable || error.code === 'preview_deployment_http_error') throw error
      const failure = new Error('The preview reconciler request could not be completed.')
      failure.retryable = true
      failure.code = 'preview_deployment_network_error'
      failure.cause = error
      throw failure
    } finally {
      clearTimeout(timeout)
    }
  }

  async provisionApplication(request, { onPhase, assertLease = async () => {} }) {
    await assertLease()
    const branch = await this.createOrReuseBranch({ branch: request.branch, sourceBranch: request.sourceBranch })
    await onPhase('branch_created', { commitSha: branch.sha, branchReused: branch.reused })
    await assertLease()
    const workflow = await this.waitForWorkflow({ branch: request.branch, commitSha: branch.sha })
    await onPhase('workflow_pending', workflow)
    await assertLease()
    const deployment = await this.getDeployment(request.branch)
    if (!deployment.staticHosting || !deployment.tailscaleContainer || !deployment.appUrl) {
      const failure = new Error('The preview deployment is not healthy yet.')
      failure.retryable = true
      failure.code = 'preview_deployment_unhealthy'
      throw failure
    }
    await onPhase('preview_pending', { previewId: deployment.id, image: deployment.image })
    return {
      evidence: {
        branch: request.branch,
        sourceBranch: request.sourceBranch,
        commitSha: branch.sha,
        workflowRunId: workflow.workflowRunId,
        image: deployment.image,
        previewId: deployment.id,
        previewUrl: deployment.appUrl,
        tailscaleContainer: deployment.tailscaleContainer,
        verifiedAt: new Date().toISOString(),
      },
    }
  }
}
