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
      name: z.string().optional(),
      provider: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      tags: z.array(z.string()).default([]),
      vendorId: z.number().optional(),
      vendorName: z.string().optional(),
      vendorIcon: z.string().optional(),
      quotaType: z.number().optional(),
      modelRatio: z.number().optional(),
      completionRatio: z.number().optional(),
      cacheRatio: z.number().optional(),
      modelPrice: z.number().optional(),
      priceDescription: z.string().optional(),
      enableGroups: z.array(z.string()).default([]),
      supportedEndpointTypes: z.array(z.string()).default([]),
      contextWindow: z.number().optional(),
      category: z.enum([
        'image',
        'video',
        'chat',
        'embedding',
        'audio',
        'other'
      ]),
      pricing: z.unknown().optional(),
      pricingAvailable: z.boolean().optional(),
      pricingError: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  ),
  groupRatio: z.record(z.string(), z.number()).default({}),
  vendors: z
    .array(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        icon: z.string().optional()
      })
    )
    .default([]),
  supportedEndpoint: z.record(z.string(), z.unknown()).default({}),
  usableGroup: z.record(z.string(), z.string()).default({}),
  autoGroups: z.array(z.string()).default([]),
  pricingVersion: z.string().optional(),
  success: z.boolean().optional()
})

export type ModelsResponse = z.infer<typeof modelsResponseSchema>
export type ModelProvidersResponse = z.infer<
  typeof modelProvidersResponseSchema
>
export type AgentProfilesResponse = z.infer<typeof agentProfilesResponseSchema>
export type GatewayModelsResponse = z.infer<typeof gatewayModelsResponseSchema>
