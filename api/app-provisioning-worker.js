const terminalStatuses = new Set(['succeeded', 'failed', 'cancelled'])

const phaseStatuses = new Set(['branch_created', 'workflow_pending', 'preview_pending'])
const activeStatuses = ['claiming', 'retryable_failed', ...phaseStatuses]

export class AppProvisioningWorker {
  constructor({ store, provider, leaseOwner = `worker-${process.pid}`, maxAttempts = 3 } = {}) {
    if (!store || !provider?.provisionApplication) throw new Error('A store and provisioning provider are required.')
    this.store = store
    this.provider = provider
    this.leaseOwner = leaseOwner
    this.maxAttempts = maxAttempts
  }

  async runOnce() {
    const request = await this.store.claimNextAppProvisionRequest({
      leaseOwner: this.leaseOwner,
      leaseMs: 15 * 60 * 1000,
    })
    if (!request) return { state: 'idle' }

    const assertLease = async () => {
      if (!(await this.store.assertAppProvisionLease({ requestId: request.id, leaseOwner: this.leaseOwner }))) {
        const error = new Error('Provisioning lease is no longer owned by this worker.')
        error.code = 'provisioning_lease_lost'
        throw error
      }
    }
    const onPhase = async (status, patch = {}) => {
      if (!phaseStatuses.has(status)) throw new Error(`Unsupported provisioning phase: ${status}`)
      await this.store.transitionAppProvisionRequest({
        requestId: request.id,
        status,
        patch,
        expectedStatuses: activeStatuses,
        leaseOwner: this.leaseOwner,
      })
    }

    try {
      const result = await this.provider.provisionApplication(request, { onPhase, assertLease })
      const evidence = result?.evidence && typeof result.evidence === 'object' ? result.evidence : {}
      const completed = await this.store.transitionAppProvisionRequest({
        requestId: request.id,
        status: 'succeeded',
        patch: { evidence, completedAt: new Date().toISOString() },
        expectedStatuses: activeStatuses,
        leaseOwner: this.leaseOwner,
      })
      return { state: completed.state, request: completed.request }
    } catch (error) {
      const retryable = error?.retryable === true && request.attempts < this.maxAttempts
      const status = retryable ? 'retryable_failed' : 'failed'
      const failure = {
        code: String(error?.code || (retryable ? 'provisioning_retryable_failure' : 'provisioning_failed')),
        message: String(error?.message || 'Application provisioning failed.').slice(0, 500),
        retryable,
      }
      const retryDelayMs = Math.min(15 * 60 * 1000, 30000 * (2 ** Math.max(0, request.attempts - 1)))
      const failed = await this.store.transitionAppProvisionRequest({
        requestId: request.id,
        status,
        patch: {
          error: failure,
          ...(retryable
            ? { nextRetryAt: new Date(Date.now() + retryDelayMs).toISOString(), retryDelayMs }
            : { failedAt: new Date().toISOString() }),
        },
        expectedStatuses: activeStatuses,
        leaseOwner: this.leaseOwner,
      })
      return { state: failed.state, request: failed.request }
    }
  }

  async runUntilIdle({ maxJobs = 1 } = {}) {
    const results = []
    for (let index = 0; index < maxJobs; index += 1) {
      const result = await this.runOnce()
      results.push(result)
      if (result.state === 'idle') break
    }
    return results
  }
}

export const isProvisioningTerminal = (status) => terminalStatuses.has(status)
