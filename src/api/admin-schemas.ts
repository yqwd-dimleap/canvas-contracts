import { z } from 'zod'
import {
  type AgentModelProfile,
  agentModelProfileSchema,
  type ModelProvider,
  modelProviderSchema
} from '../agent/profiles.js'

/**
 * Admin API Response Schemas
 * 使用现有的 schema 定义
 */
export const modelsResponseSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      provider: z.string(),
      modelId: z.string(),
      enabled: z.boolean().default(true)
    })
  )
})

export const modelProvidersResponseSchema = z.object({
  providers: z.array(modelProviderSchema)
})

export const agentProfilesResponseSchema = z.object({
  profiles: z.array(agentModelProfileSchema)
})

export const gatewayModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      provider: z.string()
    })
  )
})

export type ModelsResponse = z.infer<typeof modelsResponseSchema>
export type ModelProvidersResponse = z.infer<
  typeof modelProvidersResponseSchema
>
export type AgentProfilesResponse = z.infer<typeof agentProfilesResponseSchema>
export type GatewayModelsResponse = z.infer<typeof gatewayModelsResponseSchema>

// Re-export for convenience
export type { AgentModelProfile, ModelProvider }
