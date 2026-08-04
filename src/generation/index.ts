import { z } from 'zod'
import {
  generationModelCategorySchema,
  modelPricingConfigSchema,
  modelProviderModelSchema
} from '../agent/model-provider.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  generationModelPreferencesSchema,
  userGenerationModelPreferenceRowSchema
} from '../auth/user-settings.js'
import { canvasResourceStorageSchema } from '../canvas/resources/types.js'
import { timestampSchema } from '../shared/timestamp.js'
import { workspaceAssetMediaMetadataSchema } from '../storage/workspace-assets.js'

// ============================================================================
// Generation Status (single source of truth)
// ============================================================================

/**
 * 生成任务/结果的统一状态枚举。
 * 单一真相源：图片/视频生成结果、生成任务（generation_tasks）共用同一组取值，
 * 避免历史上 result 用 'processing'、task 用 'polling' 的分叉。
 *
 * - pending   ：已受理，尚未开始
 * - polling   ：处理中 / 轮询第三方任务
 * - completed ：成功
 * - failed    ：失败
 */
export const generationTaskStatusSchema = z.enum([
  'pending',
  'polling',
  'completed',
  'failed'
])

// ============================================================================
// Generation Tasks
// ============================================================================

export const generationTaskTypeSchema = z.enum(['image', 'video', 'lyrics'])

export const generationTaskResultSchema = z.object({
  url: z.string().optional(),
  // Lightweight derivatives surfaced before/while the full asset uploads.
  posterUrl: z.string().optional(),
  previewUrl: z.string().optional(),
  assetId: z.string().optional(),
  storage: canvasResourceStorageSchema.nullable().optional(),
  mediaMetadata: workspaceAssetMediaMetadataSchema.nullable().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  durationMs: z.number().optional(),
  // Text output for non-media generations (e.g. lyrics). No asset URL.
  text: z.string().optional(),
  title: z.string().optional(),
  errorInfo: z.string().optional()
})

/** Canonical synchronous response for the Lyrics generation use case. */
export const lyricsGenerationResultSchema = z
  .object({ text: z.string().trim().min(1) })
  .strict()

export const generationTaskSchema = z.object({
  id: z.string().min(1),
  type: generationTaskTypeSchema,
  /** Upstream/provider task id. `id` remains the canonical Canvas task id. */
  taskId: z.string().optional(),
  providerTaskId: z.string().optional(),
  documentId: z.string().optional(),
  elementId: z.string().optional(),
  actionId: z.string().optional(),
  projectId: z.string().optional(),
  workspaceId: z.string().min(1),
  createdByUserId: z.string().min(1),
  status: generationTaskStatusSchema,
  progress: z.number().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  result: generationTaskResultSchema.optional()
})

export const generationTaskDocumentSchema = generationTaskSchema.extend({
  projectId: z.string().nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const createGenerationTaskRequestSchema = z.object({
  type: generationTaskTypeSchema,
  documentId: z.string().optional(),
  elementId: z.string().optional(),
  actionId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional()
})

export const updateGenerationTaskRequestSchema = z.object({
  taskId: z.string().optional(),
  providerTaskId: z.string().optional(),
  status: generationTaskStatusSchema.optional(),
  progress: z.number().optional(),
  result: generationTaskResultSchema.optional()
})

export const listGenerationTasksResponseSchema = z.object({
  tasks: z.array(generationTaskSchema)
})

export const listGenerationTasksQuerySchema = z.object({
  projectId: z.string().optional(),
  includeTerminal: z.boolean().optional(),
  updatedAfter: z.string().optional(),
  limit: z.number().int().positive().max(200).optional()
})

export const listGenerationTasksApiResponseSchema = apiSuccessResponseSchema(
  listGenerationTasksResponseSchema
)

// ============================================================================
// Types
// ============================================================================

export type GenerationTaskType = z.infer<typeof generationTaskTypeSchema>
export type GenerationTaskStatus = z.infer<typeof generationTaskStatusSchema>
export type GenerationTaskResult = z.infer<typeof generationTaskResultSchema>
export type LyricsGenerationResult = z.infer<
  typeof lyricsGenerationResultSchema
>
export type GenerationTask = z.infer<typeof generationTaskSchema>
export type GenerationTaskDocument = z.infer<
  typeof generationTaskDocumentSchema
>
export type CreateGenerationTaskRequest = z.infer<
  typeof createGenerationTaskRequestSchema
>
export type UpdateGenerationTaskRequest = z.infer<
  typeof updateGenerationTaskRequestSchema
>
export type ListGenerationTasksResponse = z.infer<
  typeof listGenerationTasksResponseSchema
>

// ============================================================================
// Generation Model Catalog (single model-fetch shape)
// ============================================================================

/**
 * 一条可用于生成的模型记录：模型定义 + 其所属 provider。
 */
export const generationCatalogModelSchema = modelProviderModelSchema.extend({
  provider: z.string().min(1)
})

/**
 * 模型获取的唯一响应形状。来源与登录态无关：
 * - 未登录：`generationModelPreferences` 为空，每个 row 的 `selectedModelId`
 *   等于 `systemDefaultModelId`，`userModelId` 为 null。
 * - 已登录：在同一份目录上叠加该用户的个性化选择。
 *
 * `models` 是扁平目录（含 metadata，供首页展示等只读消费）；`rows` 是按生成
 * 用例分组的可选模型与当前选择。两者派生自同一份启用模型，不得各自成源。
 */
export const generationModelCatalogViewSchema = z.object({
  models: z.array(generationCatalogModelSchema).default([]),
  rows: z.array(userGenerationModelPreferenceRowSchema).default([]),
  generationModelPreferences: generationModelPreferencesSchema,
  agentRuntimePricing: z
    .object({
      modelId: z.string().min(1),
      pricing: modelPricingConfigSchema
    })
    .optional()
})

export const generationModelCatalogQuerySchema = z.object({
  /** 仅过滤 `models`；`rows` 始终覆盖全部生成用例。 */
  mediaType: generationModelCategorySchema.optional()
})

export const generationModelCatalogApiResponseSchema = apiSuccessResponseSchema(
  generationModelCatalogViewSchema
)

export type GenerationCatalogModel = z.infer<
  typeof generationCatalogModelSchema
>
export type GenerationModelCatalogView = z.infer<
  typeof generationModelCatalogViewSchema
>
export type GenerationModelCatalogQuery = z.infer<
  typeof generationModelCatalogQuerySchema
>
