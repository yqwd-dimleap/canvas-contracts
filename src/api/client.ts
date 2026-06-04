import type { AdminApi } from './admin-api.js'
import type {
  AgentModelProfile,
  AgentProfilesResponse,
  GatewayModelsResponse,
  ModelProvider,
  ModelProvidersResponse,
  ModelsResponse
} from './admin-schemas.js'

/**
 * Canvas Agent Client Interface
 */
export interface CanvasAgentClient {
  admin: AdminApi
}

/**
 * Fetcher function type
 */
type FetcherOptions = RequestInit & {
  params?: Record<string, string>
}

/**
 * Create a type-safe Canvas Agent client
 *
 * @param baseUrl - Base URL of canvas-agent (e.g., http://localhost:8383)
 * @returns Type-safe client instance
 */
export function createCanvasAgentClient(baseUrl: string): CanvasAgentClient {
  const fetcher = async <T>(
    path: string,
    options?: FetcherOptions
  ): Promise<T> => {
    const url = new URL(`${baseUrl}${path}`)

    // Add query params
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const res = await fetch(url.toString(), {
      ...options,
      credentials: 'include', // ✅ 浏览器自动携带 cookie
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${res.status}`)
    }

    return res.json()
  }

  return {
    admin: {
      models: {
        list: (): Promise<ModelsResponse> => fetcher('/api/admin/models'),
        get: (id: string) => fetcher(`/api/admin/models/${id}`)
      },
      modelProviders: {
        list: (): Promise<ModelProvidersResponse> =>
          fetcher('/api/admin/model-providers'),
        get: (id: string): Promise<ModelProvider> =>
          fetcher(`/api/admin/model-providers/${id}`),
        create: (
          data: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>
        ): Promise<ModelProvider> =>
          fetcher('/api/admin/model-providers', {
            method: 'POST',
            body: JSON.stringify(data)
          }),
        update: (
          id: string,
          data: Partial<Omit<ModelProvider, 'id'>>
        ): Promise<ModelProvider> =>
          fetcher(`/api/admin/model-providers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
          }),
        delete: (id: string): Promise<{ ok: boolean }> =>
          fetcher(`/api/admin/model-providers/${id}`, {
            method: 'DELETE'
          })
      },
      agentProfiles: {
        list: (): Promise<AgentProfilesResponse> =>
          fetcher('/api/admin/agent-profiles'),
        get: (id: string): Promise<AgentModelProfile> =>
          fetcher(`/api/admin/agent-profiles/${id}`),
        create: (
          data: Omit<AgentModelProfile, 'id' | 'createdAt' | 'updatedAt'>
        ): Promise<AgentModelProfile> =>
          fetcher('/api/admin/agent-profiles', {
            method: 'POST',
            body: JSON.stringify(data)
          }),
        update: (
          id: string,
          data: Partial<Omit<AgentModelProfile, 'id'>>
        ): Promise<AgentModelProfile> =>
          fetcher(`/api/admin/agent-profiles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
          }),
        delete: (id: string): Promise<{ ok: boolean }> =>
          fetcher(`/api/admin/agent-profiles/${id}`, {
            method: 'DELETE'
          })
      },
      gatewayModels: {
        list: (): Promise<GatewayModelsResponse> =>
          fetcher('/api/admin/gateway-models')
      },
      modelsImport: {
        import: (): Promise<{ ok: boolean; imported: number }> =>
          fetcher('/api/admin/models-import', {
            method: 'POST'
          })
      }
    }
  }
}
