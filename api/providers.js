export class ProviderUnavailableError extends Error {
  constructor(provider, operation) {
    super(`${provider} provider is not configured for ${operation}.`)
    this.name = 'ProviderUnavailableError'
    this.provider = provider
    this.operation = operation
  }
}

export class FailClosedIdentityProvider {
  async getIdentity() {
    return null
  }
}

export class TailscaleIdentityProvider {
  constructor({ trustedLogins = [] } = {}) {
    this.trustedLogins = new Set(trustedLogins.map((login) => login.toLowerCase()))
  }

  async getIdentity({ request }) {
    const login = String(request.headers['tailscale-user-login'] || '').trim().toLowerCase()
    if (!login || !this.trustedLogins.has(login)) return null
    const displayName = String(request.headers['tailscale-user-name'] || login).trim().slice(0, 160) || login
    return { id: login, displayName, roles: ['owner'] }
  }
}

export class FailClosedAuthentikProvider {
  async synchronizeIdentity() {
    throw new ProviderUnavailableError('authentik', 'identity synchronization')
  }

  async applyApplicationAccess() {
    throw new ProviderUnavailableError('authentik', 'application access synchronization')
  }
}

export class FailClosedGitHubProvider {
  async createInstallationToken() {
    throw new ProviderUnavailableError('github', 'installation token exchange')
  }
}

export class FailClosedPodmanProvider {
  async provisionWorkspace() {
    throw new ProviderUnavailableError('podman', 'workspace provisioning')
  }

  async startWorkspace() {
    throw new ProviderUnavailableError('podman', 'workspace start')
  }

  async stopWorkspace() {
    throw new ProviderUnavailableError('podman', 'workspace stop')
  }

  async deleteWorkspace() {
    throw new ProviderUnavailableError('podman', 'workspace deletion')
  }
}

export class FailClosedAppProvisioningProvider {
  async provisionApplication() {
    throw new ProviderUnavailableError('app-provisioning', 'application provisioning')
  }
}

export class FailClosedBrainProvider {
  async decomposeIntent() {
    throw new ProviderUnavailableError('brain', 'intent decomposition')
  }
}

export class BrainProvider {
  constructor({ apiUrl, adminToken, adminOrigin, fetchImpl = globalThis.fetch }) {
    this.apiUrl = apiUrl
    this.adminToken = adminToken
    this.adminOrigin = adminOrigin
    this.fetchImpl = fetchImpl
  }

  async decomposeIntent({ intent, actor }) {
    let response
    try {
      response = await this.fetchImpl(new URL('/api/v1/intents/decompose', this.apiUrl), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json',
          'X-Actor': actor.id,
          Origin: this.adminOrigin,
        },
        body: JSON.stringify({ intent }),
      })
    } catch {
      throw new Error('Brain intent decomposition request could not be completed.')
    }

    if (!response.ok) {
      throw new Error(`Brain intent decomposition request failed with HTTP ${response.status}.`)
    }

    let body
    try {
      body = await response.json()
    } catch {
      throw new Error('Brain intent decomposition response was not valid JSON.')
    }
    if (
      !body
      || typeof body !== 'object'
      || Array.isArray(body)
      || !Object.hasOwn(body, 'decomposition')
      || body.decomposition === null
    ) {
      throw new Error('Brain intent decomposition response did not include a decomposition.')
    }
    return body.decomposition
  }
}

export const createFailClosedProviders = () => Object.freeze({
  identity: new FailClosedIdentityProvider(),
  authentik: new FailClosedAuthentikProvider(),
  github: new FailClosedGitHubProvider(),
  podman: new FailClosedPodmanProvider(),
  appProvisioning: new FailClosedAppProvisioningProvider(),
  brain: new FailClosedBrainProvider(),
})

export const createProviders = ({ config = {}, fetchImpl } = {}) => Object.freeze({
  ...createFailClosedProviders(),
  identity: config.trustedLogins?.length
    ? new TailscaleIdentityProvider({ trustedLogins: config.trustedLogins })
    : new FailClosedIdentityProvider(),
  brain: config.brainApiUrl && config.brainAdminToken
    ? new BrainProvider({
      apiUrl: config.brainApiUrl,
      adminToken: config.brainAdminToken,
      ...(config.brainAdminOrigin ? { adminOrigin: config.brainAdminOrigin } : {}),
      ...(fetchImpl ? { fetchImpl } : {}),
    })
    : new FailClosedBrainProvider(),
})
