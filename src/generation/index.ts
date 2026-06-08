import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'

// ============================================================================
// Image Generation
// ============================================================================

export const imageGenerationRequestSchema = z.object({
  projectId: z.string().optional(),
  nodeId: z.string().optional(),
  prompt: z.string().min(1).max(4000),
  size: z
    .enum(['512x512', '768x768', '1024x1024', '1536x1024', '1024x1536'])
    .default('1024x1024'),
  model: z.string().optional(),
  name: z.string().optional(),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).optional()
})

export const imageGenerationResultSchema = z.object({
  generationId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  provider: z.string(),
  imageUrl: z.string().optional(),
  imageModelUrl: z.string().optional(),
  imageAssetId: z.string().optional(),
  rawImageUrl: z.string().optional(),
  createdAt: z.number(),
  error: z.string().optional()
})

export const imageGenerationResponseSchema = apiSuccessResponseSchema(
  imageGenerationResultSchema
)

// ============================================================================
// Video Generation
// ============================================================================

export const videoGenerationRequestSchema = z.object({
  projectId: z.string().optional(),
  nodeId: z.string().optional(),
  prompt: z.string().min(1).max(4000),
  imageUrl: z.string().url().optional(),
  duration: z.number().int().min(1).max(30).default(5),
  resolution: z.enum(['720p', '1080p', '4k']).default('1080p'),
  fps: z.number().int().min(24).max(60).default(30)
})

export const videoGenerationResultSchema = z.object({
  generationId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  provider: z.string(),
  videoUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  duration: z.number().optional(),
  createdAt: z.number(),
  error: z.string().optional()
})

export const videoGenerationResponseSchema = apiSuccessResponseSchema(
  videoGenerationResultSchema
)

// ============================================================================
// Generation Status Query
// ============================================================================

export const generationStatusRequestSchema = z.object({
  generationId: z.string().min(1)
})

export const generationStatusResponseSchema = apiSuccessResponseSchema(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('image'),
      result: imageGenerationResultSchema
    }),
    z.object({
      type: z.literal('video'),
      result: videoGenerationResultSchema
    })
  ])
)

// ============================================================================
// Generation Tasks
// ============================================================================

export const generationTaskTypeSchema = z.enum(['image', 'video'])

export const generationTaskStatusSchema = z.enum([
  'pending',
  'polling',
  'completed',
  'failed'
])

export const generationTaskResultSchema = z.object({
  url: z.string().optional(),
  errorInfo: z.string().optional()
})

export const generationTaskSchema = z.object({
  id: z.string().min(1),
  type: generationTaskTypeSchema,
  taskId: z.string().optional(),
  nodeId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().min(1),
  status: generationTaskStatusSchema,
  progress: z.number().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  result: generationTaskResultSchema.optional()
})

export const createGenerationTaskRequestSchema = z.object({
  type: generationTaskTypeSchema,
  nodeId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional()
})

export const updateGenerationTaskRequestSchema = z.object({
  taskId: z.string().optional(),
  status: generationTaskStatusSchema.optional(),
  progress: z.number().optional(),
  result: generationTaskResultSchema.optional()
})

export const listGenerationTasksResponseSchema = z.object({
  tasks: z.array(generationTaskSchema)
})

export const updateGenerationTaskResponseSchema = z.object({
  task: generationTaskSchema.nullable().optional()
})

// ============================================================================
// Types
// ============================================================================

export type ImageGenerationRequest = z.infer<
  typeof imageGenerationRequestSchema
>
export type ImageGenerationResult = z.infer<typeof imageGenerationResultSchema>
export type ImageGenerationResponse = z.infer<
  typeof imageGenerationResponseSchema
>
export type VideoGenerationRequest = z.infer<
  typeof videoGenerationRequestSchema
>
export type VideoGenerationResult = z.infer<typeof videoGenerationResultSchema>
export type VideoGenerationResponse = z.infer<
  typeof videoGenerationResponseSchema
>
export type GenerationStatusRequest = z.infer<
  typeof generationStatusRequestSchema
>
export type GenerationStatusResponse = z.infer<
  typeof generationStatusResponseSchema
>
export type GenerationTaskType = z.infer<typeof generationTaskTypeSchema>
export type GenerationTaskStatus = z.infer<typeof generationTaskStatusSchema>
export type GenerationTaskResult = z.infer<typeof generationTaskResultSchema>
export type GenerationTask = z.infer<typeof generationTaskSchema>
export type CreateGenerationTaskRequest = z.infer<
  typeof createGenerationTaskRequestSchema
>
export type UpdateGenerationTaskRequest = z.infer<
  typeof updateGenerationTaskRequestSchema
>
export type ListGenerationTasksResponse = z.infer<
  typeof listGenerationTasksResponseSchema
>
export type UpdateGenerationTaskResponse = z.infer<
  typeof updateGenerationTaskResponseSchema
>
