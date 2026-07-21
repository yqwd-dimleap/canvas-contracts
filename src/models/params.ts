import { z } from 'zod'

/**
 * 生成请求的运行时上下文 schema —— 前端 → agent 的请求体。
 * 顶层保持小而稳定；所有模型参数统一走 params +
 * metadata.payload.request.body 模板，不再从顶层运行时字段直通。
 */

export const canvasGenerationTargetSchema = z
  .object({
    source: z.enum(['canvas2d', 'agent', 'api']).default('api'),
    documentId: z.string().min(1).max(128).optional(),
    elementId: z.string().min(1).max(128).optional(),
    resourceId: z.string().min(1).max(128).optional(),
    actionId: z.string().min(1).max(128).optional()
  })
  .strict()

export const generationParamsSchema = z.record(z.string(), z.unknown())

export const generationSystemSchema = z
  .object({
    /** Frontend project id; used by agent-side asset registration only. */
    projectId: z.string().min(1).max(128).nullable().optional(),
    /** Renderer-agnostic Canvas2D target for persistence/events. */
    canvasTarget: canvasGenerationTargetSchema.optional()
  })
  .strict()

export const imageGenerationReferencesSchema = z
  .object({
    images: z.array(z.string()).optional(),
    firstImage: z.string().optional()
  })
  .strict()

export const imageGenerationParamsSchema = z
  .object({
    prompt: z.string(),
    model: z.string().min(1),
    params: generationParamsSchema.default({}),
    references: imageGenerationReferencesSchema.default({}),
    system: generationSystemSchema.default({})
  })
  .strict()

/** 视频参考媒体 */
export const videoReferenceMediaSchema = z
  .object({
    type: z.enum([
      'reference_image',
      'reference_video',
      'first_frame',
      'last_frame',
      'reference_audio',
      'driving_audio',
      'audio',
      'video'
    ]),
    url: z.string(),
    reference_voice: z.string().optional(),
    image_url: z
      .union([z.string(), z.object({ url: z.string().optional() })])
      .optional(),
    role: z.string().optional()
  })
  .loose()

export const videoGenerationReferencesSchema = z
  .object({
    images: z.array(z.string()).optional(),
    firstImage: z.string().optional(),
    media: z.array(videoReferenceMediaSchema).optional(),
    clips: z.array(z.string()).optional(),
    sourceVideo: z.string().optional(),
    drivingAudio: z.string().optional()
  })
  .strict()

export const videoGenerationParamsSchema = z
  .object({
    prompt: z.string(),
    model: z.string().min(1),
    params: generationParamsSchema.default({}),
    references: videoGenerationReferencesSchema.default({}),
    system: generationSystemSchema.default({})
  })
  .strict()
