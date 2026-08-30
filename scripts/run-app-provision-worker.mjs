import { randomUUID } from 'node:crypto'
import { AppProvisioningWorker } from '../api/app-provisioning-worker.js'
import { loadConfig } from '../api/config.js'
import { createProviders } from '../api/providers.js'
import { AdminStore } from '../api/store.js'

const config = loadConfig()
const providers = createProviders({ config })
const store = new AdminStore(config.dataDir)
const worker = new AppProvisioningWorker({
  store,
  provider: providers.appProvisioning,
  leaseOwner: `admin-provision-worker-${randomUUID()}`,
})

await store.initialize()
if (providers.appProvisioning.constructor.name === 'FailClosedAppProvisioningProvider') {
  throw new Error('Application provisioning is not configured; refusing to start the worker.')
}

const intervalMs = 30000
console.log(JSON.stringify({ level: 'info', message: 'app_provision_worker_started', intervalMs }))
while (true) {
  try {
    const result = await worker.runOnce()
    if (result.state !== 'idle') {
      console.log(JSON.stringify({ level: 'info', message: 'app_provision_request_processed', requestId: result.request?.id, status: result.request?.status }))
    }
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'app_provision_worker_iteration_failed', error: error.message }))
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs))
}
