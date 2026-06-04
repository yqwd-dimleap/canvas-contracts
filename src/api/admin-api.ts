import type {
  AgentModelProfile,
  AgentProfilesResponse,
  GatewayModelsResponse,
  ModelProvider,
  ModelProvidersResponse,
  ModelsResponse
} from './admin-schemas.js'

/**
 * Admin Models API
 */
export interface AdminModelsApi {
  list(): Promise<ModelsResponse>
  get(id: string): Promise<{
    id: string
    name: string
    provider: string
    modelId: string
    enabled: boolean
  }>
}

/**
 * Admin Model Providers API
 */
export interface AdminModelProvidersApi {
  list(): Promise<ModelProvidersResponse>
  get(id: string): Promise<ModelProvider>
  create(
    data: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ModelProvider>
  update(
    id: string,
    data: Partial<Omit<ModelProvider, 'id'>>
  ): Promise<ModelProvider>
  delete(id: string): Promise<{ ok: boolean }>
}

/**
 * Admin Agent Profiles API
 */
export interface AdminAgentProfilesApi {
  list(): Promise<AgentProfilesResponse>
  get(id: string): Promise<AgentModelProfile>
  create(
    data: Omit<AgentModelProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<AgentModelProfile>
  update(
    id: string,
    data: Partial<Omit<AgentModelProfile, 'id'>>
  ): Promise<AgentModelProfile>
  delete(id: string): Promise<{ ok: boolean }>
}

/**
 * Admin Gateway Models API
 */
export interface AdminGatewayModelsApi {
  list(): Promise<GatewayModelsResponse>
}

/**
 * Admin Models Import API
 */
export interface AdminModelsImportApi {
  import(): Promise<{ ok: boolean; imported: number }>
}

/**
 * Admin API
 */
export interface AdminApi {
  models: AdminModelsApi
  modelProviders: AdminModelProvidersApi
  agentProfiles: AdminAgentProfilesApi
  gatewayModels: AdminGatewayModelsApi
  modelsImport: AdminModelsImportApi
}
