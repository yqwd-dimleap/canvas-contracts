import { z } from 'zod'
import {
  agentModelProfileSchema,
  modelProviderSchema
} from '../agent/profiles.js'

/**
 * Admin - Models List Response
 * 管理后台：模型列表
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

/**
 * Admin - Model Providers List Response
 * 管理后台：模型提供商列表
 */
export const modelProvidersResponseSchema = z.object({
  providers: z.array(modelProviderSchema)
})

/**
 * Admin - Agent Profiles List Response
 * 管理后台：Agent 配置列表
 */
export const agentProfilesResponseSchema = z.object({
  profiles: z.array(agentModelProfileSchema)
})

/**
 * Admin - Gateway Models List Response
 * 管理后台：网关模型列表
 */
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
