import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
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

export const generationTaskTypeSchema = z.enum(['image', 'video'])

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
  errorInfo: z.string().optional()
})

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
  userId: z.string().min(1),
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

export const updateGenerationTaskResponseSchema = z.object({
  task: generationTaskSchema.nullable().optional()
})

export const createGenerationTaskApiResponseSchema =
  apiSuccessResponseSchema(generationTaskSchema)

export const listGenerationTasksApiResponseSchema = apiSuccessResponseSchema(
  listGenerationTasksResponseSchema
)

export const updateGenerationTaskApiResponseSchema = apiSuccessResponseSchema(
  updateGenerationTaskResponseSchema
)

// ============================================================================
// Types
// ============================================================================

export type GenerationTaskType = z.infer<typeof generationTaskTypeSchema>
export type GenerationTaskStatus = z.infer<typeof generationTaskStatusSchema>
export type GenerationTaskResult = z.infer<typeof generationTaskResultSchema>
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
export type ListGenerationTasksQuery = z.infer<
  typeof listGenerationTasksQuerySchema
>
export type UpdateGenerationTaskResponse = z.infer<
  typeof updateGenerationTaskResponseSchema
>
