import { z } from 'zod'
import {
  modelPricingConfigSchema,
  modelProviderModelSchema,
  modelProviderSchema
} from '../agent/model-provider.js'
import { agentRuntimeConfigViewSchema } from '../agent/runtime-config.js'
import { apiSuccessResponseSchema } from '../api/response.js'

export const adminModelSchema = modelProviderModelSchema.extend({
  provider: z.string().trim().min(1)
})

export const updateAdminModelRequestSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    modelId: z.string().trim().min(1).optional(),
    provider: z.string().trim().min(1).optional(),
    displayName: z.string().optional(),
    enabled: z.boolean().optional(),
    pricing: modelPricingConfigSchema.optional(),
    modelKind: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .refine((value) => Boolean(value.modelId || value.id), {
    message: 'modelId or id is required',
    path: ['modelId']
  })

export const updateAdminModelResponseSchema = z.object({
  success: z.literal(true)
})

export const createAdminModelRequestSchema = z
  .object({
    modelId: z.string().trim().min(1),
    provider: z.string().trim().min(1).default('gateway'),
    displayName: z.string().optional(),
    enabled: z.boolean().optional(),
    pricing: modelPricingConfigSchema,
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()

export const createAdminModelResponseSchema = z.object({
  success: z.literal(true),
  id: z.string().min(1)
})

export const createModelProviderRequestSchema = modelProviderSchema
  .omit({
    createdAt: true,
    updatedAt: true
  })
  .extend({
    id: z.string().trim().min(1).optional()
  })
  .strict()

export const updateModelProviderRequestSchema = modelProviderSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .partial()
  .strict()

export const modelProviderResponseSchema = z.object({
  provider: modelProviderSchema
})

export const modelProviderDeleteResponseSchema = z.object({
  success: z.literal(true)
})

export const importGatewayModelsRequestSchema = z
  .object({
    provider: z.string().trim().min(1).optional(),
    modelIds: z.array(z.string().trim().min(1)).min(1),
    enabled: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    pricingGroup: z.string().trim().min(1).optional(),
    markup: z.number().min(0).optional(),
    centsPerCredit: z.number().positive().optional()
  })
  .strict()

export const importGatewayModelsResponseSchema = z.object({
  imported: z.number().int().min(0),
  synced: z.number().int().min(0)
})

/**
 * Admin - Models List Response
 * 管理后台：模型列表
 */
export const modelsResponseSchema = z.object({
  models: z.array(adminModelSchema)
})

/**
 * Admin - Delete Models Request
 * 管理后台：批量删除已配置模型
 */
export const deleteModelsRequestSchema = z
  .object({
    models: z
      .array(
        z
          .object({
            provider: z.string().trim().min(1),
            modelId: z.string().trim().min(1)
          })
          .strict()
      )
      .min(1)
  })
  .strict()

/**
 * Admin - Delete Models Response
 * 管理后台：批量删除已配置模型结果
 */
export const deleteModelsResponseSchema = z.object({
  success: z.boolean(),
  requested: z.number().int().min(0),
  deleted: z.number().int().min(0)
})

/**
 * Admin - Model Providers List Response
 * 管理后台：模型提供商列表
 */
export const modelProvidersResponseSchema = z.object({
  providers: z.array(modelProviderSchema)
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

/**
 * Admin - Agent Runtime Config Response
 * 管理后台：单一 Agent 运行模型配置
 */
export const agentRuntimeConfigResponseSchema = z.object({
  config: agentRuntimeConfigViewSchema
})

export const modelsApiResponseSchema =
  apiSuccessResponseSchema(modelsResponseSchema)

export const updateAdminModelApiResponseSchema = apiSuccessResponseSchema(
  updateAdminModelResponseSchema
)

export const createAdminModelApiResponseSchema = apiSuccessResponseSchema(
  createAdminModelResponseSchema
)

export const deleteModelsApiResponseSchema = apiSuccessResponseSchema(
  deleteModelsResponseSchema
)

export const modelProvidersApiResponseSchema = apiSuccessResponseSchema(
  modelProvidersResponseSchema
)

export const modelProviderApiResponseSchema = apiSuccessResponseSchema(
  modelProviderResponseSchema
)

export const modelProviderDeleteApiResponseSchema = apiSuccessResponseSchema(
  modelProviderDeleteResponseSchema
)

export const gatewayModelsApiResponseSchema = apiSuccessResponseSchema(
  gatewayModelsResponseSchema
)

export const agentRuntimeConfigApiResponseSchema = apiSuccessResponseSchema(
  agentRuntimeConfigResponseSchema
)

export const importGatewayModelsApiResponseSchema = apiSuccessResponseSchema(
  importGatewayModelsResponseSchema
)

export type AdminModel = z.infer<typeof adminModelSchema>
export type UpdateAdminModelRequest = z.infer<
  typeof updateAdminModelRequestSchema
>
export type UpdateAdminModelResponse = z.infer<
  typeof updateAdminModelResponseSchema
>
export type CreateAdminModelRequest = z.infer<
  typeof createAdminModelRequestSchema
>
export type CreateAdminModelResponse = z.infer<
  typeof createAdminModelResponseSchema
>
export type CreateModelProviderRequest = z.infer<
  typeof createModelProviderRequestSchema
>
export type UpdateModelProviderRequest = z.infer<
  typeof updateModelProviderRequestSchema
>
export type ModelProviderResponse = z.infer<typeof modelProviderResponseSchema>
export type ModelProviderDeleteResponse = z.infer<
  typeof modelProviderDeleteResponseSchema
>
export type ImportGatewayModelsRequest = z.infer<
  typeof importGatewayModelsRequestSchema
>
export type ImportGatewayModelsResponse = z.infer<
  typeof importGatewayModelsResponseSchema
>
export type ModelsResponse = z.infer<typeof modelsResponseSchema>
export type DeleteModelsRequest = z.infer<typeof deleteModelsRequestSchema>
export type DeleteModelsResponse = z.infer<typeof deleteModelsResponseSchema>
export type ModelProvidersResponse = z.infer<
  typeof modelProvidersResponseSchema
>
export type GatewayModelsResponse = z.infer<typeof gatewayModelsResponseSchema>
export type AgentRuntimeConfigResponse = z.infer<
  typeof agentRuntimeConfigResponseSchema
>
