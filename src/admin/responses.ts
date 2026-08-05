import { z } from 'zod'
import {
  modelCategorySchema,
  modelPricingConfigSchema,
  modelPricingConfigSupportsCategory,
  modelProviderSchema
} from '../agent/model-provider.js'
import {
  AI_MODEL_SHOWCASE_METADATA_KEY,
  modelShowcaseConfigSchema
} from '../agent/model-showcase.js'
import { agentRuntimeConfigViewSchema } from '../agent/runtime-config.js'
import { webSearchConfigViewSchema } from '../agent/web-search.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import { generationPayloadConfigSchema } from '../models/payload.js'

function validateGenerationPayloadMetadata(
  metadata: Record<string, unknown> | undefined,
  context: z.RefinementCtx
) {
  if (!metadata || !Object.hasOwn(metadata, 'payload')) return
  const parsed = generationPayloadConfigSchema.safeParse(metadata.payload)
  if (parsed.success) return
  context.addIssue({
    code: 'custom',
    path: ['metadata', 'payload'],
    message: parsed.error.issues[0]?.message ?? 'Invalid generation payload.'
  })
}

function validateModelShowcaseMetadata(
  metadata: Record<string, unknown> | undefined,
  context: z.RefinementCtx
) {
  if (!metadata || !Object.hasOwn(metadata, AI_MODEL_SHOWCASE_METADATA_KEY)) {
    return
  }
  const parsed = modelShowcaseConfigSchema.safeParse(
    metadata[AI_MODEL_SHOWCASE_METADATA_KEY]
  )
  if (parsed.success) return
  context.addIssue({
    code: 'custom',
    path: ['metadata', AI_MODEL_SHOWCASE_METADATA_KEY],
    message: parsed.error.issues[0]?.message ?? 'Invalid model showcase.'
  })
}

function validateModelMetadata(
  metadata: Record<string, unknown> | undefined,
  context: z.RefinementCtx
) {
  validateGenerationPayloadMetadata(metadata, context)
  validateModelShowcaseMetadata(metadata, context)
}

function validateCategoryPricing(
  modelKind: z.infer<typeof modelCategorySchema>,
  pricing: z.infer<typeof modelPricingConfigSchema>,
  context: z.RefinementCtx
) {
  if (modelPricingConfigSupportsCategory(modelKind, pricing)) return
  context.addIssue({
    code: 'custom',
    path: ['pricing', 'unit'],
    message: `Pricing unit is not supported for ${modelKind} models.`
  })
}

export const updateAdminModelRequestSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    modelId: z.string().trim().min(1).optional(),
    provider: z.string().trim().min(1).optional(),
    displayName: z.string().optional(),
    enabled: z.boolean().optional(),
    pricing: modelPricingConfigSchema.optional(),
    modelKind: modelCategorySchema.nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .refine((value) => Boolean(value.modelId || value.id), {
    message: 'modelId or id is required',
    path: ['modelId']
  })
  .superRefine((value, context) => {
    validateModelMetadata(value.metadata, context)
    if (value.modelKind && value.pricing) {
      validateCategoryPricing(value.modelKind, value.pricing, context)
    }
  })

/** PATCH body for a model identified by provider and modelId in the URL. */
export const adminModelPatchRequestSchema = z
  .object({
    displayName: z.string().optional(),
    enabled: z.boolean().optional(),
    pricing: modelPricingConfigSchema.optional(),
    modelKind: modelCategorySchema.nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .superRefine((value, context) => {
    validateModelMetadata(value.metadata, context)
    if (value.modelKind && value.pricing) {
      validateCategoryPricing(value.modelKind, value.pricing, context)
    }
  })

export const updateAdminModelResponseSchema = z.object({
  success: z.literal(true)
})

export const registerGatewayModelRequestSchema = z
  .object({
    modelId: z.string().trim().min(1),
    displayName: z.string().trim().min(1),
    modelKind: modelCategorySchema,
    pricing: modelPricingConfigSchema,
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .superRefine((value, context) => {
    validateModelMetadata(value.metadata, context)
    validateCategoryPricing(value.modelKind, value.pricing, context)
  })

export const registerGatewayModelResponseSchema = z.object({
  registered: z.literal(true)
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
export const gatewayModelsResponseSchema = z
  .object({
    models: z.array(
      z
        .object({
          id: z.string().trim().min(1),
          ownedBy: z.string().trim().min(1).optional(),
          created: z.number().int().nonnegative().optional()
        })
        .strict()
    )
  })
  .strict()

/**
 * Admin - Agent Runtime Config Response
 * 管理后台：单一 Agent 运行模型配置
 */
export const agentRuntimeConfigResponseSchema = z.object({
  config: agentRuntimeConfigViewSchema
})

export const updateAdminModelApiResponseSchema = apiSuccessResponseSchema(
  updateAdminModelResponseSchema
)

export const deleteModelsApiResponseSchema = apiSuccessResponseSchema(
  deleteModelsResponseSchema
)

export const modelProvidersApiResponseSchema = apiSuccessResponseSchema(
  modelProvidersResponseSchema
)

export const gatewayModelsApiResponseSchema = apiSuccessResponseSchema(
  gatewayModelsResponseSchema
)

export const agentRuntimeConfigApiResponseSchema = apiSuccessResponseSchema(
  agentRuntimeConfigResponseSchema
)

export const webSearchConfigResponseSchema = z.object({
  config: webSearchConfigViewSchema
})

export const webSearchConfigApiResponseSchema = apiSuccessResponseSchema(
  webSearchConfigResponseSchema
)

export const registerGatewayModelApiResponseSchema = apiSuccessResponseSchema(
  registerGatewayModelResponseSchema
)

export type UpdateAdminModelRequest = z.infer<
  typeof updateAdminModelRequestSchema
>
export type AdminModelPatchRequest = z.infer<
  typeof adminModelPatchRequestSchema
>
export type UpdateAdminModelResponse = z.infer<
  typeof updateAdminModelResponseSchema
>
export type RegisterGatewayModelRequest = z.infer<
  typeof registerGatewayModelRequestSchema
>
export type RegisterGatewayModelResponse = z.infer<
  typeof registerGatewayModelResponseSchema
>
export type DeleteModelsRequest = z.infer<typeof deleteModelsRequestSchema>
export type DeleteModelsResponse = z.infer<typeof deleteModelsResponseSchema>
export type ModelProvidersResponse = z.infer<
  typeof modelProvidersResponseSchema
>
export type GatewayModelsResponse = z.infer<typeof gatewayModelsResponseSchema>
export type AgentRuntimeConfigResponse = z.infer<
  typeof agentRuntimeConfigResponseSchema
>
export type WebSearchConfigResponse = z.infer<
  typeof webSearchConfigResponseSchema
>
