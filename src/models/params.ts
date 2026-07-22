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

/**
 * 参考媒体字段是开放集合：不同厂商可能引入 mask / styleRef 等新字段。
 * 用 loose 透传扩展字段，避免每加一种参考媒体都要改契约；已知字段仍显式声明
 * 以获得类型提示。
 */
export const imageGenerationReferencesSchema = z.looseObject({
  images: z.array(z.string()).optional(),
  firstImage: z.string().optional()
})

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

export const videoGenerationReferencesSchema = z.looseObject({
  images: z.array(z.string()).optional(),
  firstImage: z.string().optional(),
  media: z.array(videoReferenceMediaSchema).optional(),
  clips: z.array(z.string()).optional(),
  sourceVideo: z.string().optional(),
  drivingAudio: z.string().optional()
})

export const videoGenerationParamsSchema = z
  .object({
    prompt: z.string(),
    model: z.string().min(1),
    params: generationParamsSchema.default({}),
    references: videoGenerationReferencesSchema.default({}),
    system: generationSystemSchema.default({})
  })
  .strict()

/** Chat 消息（front-end → agent 的结构化消息数组）。 */
export const chatGenerationMessageSchema = z.looseObject({
  role: z.string().min(1),
  content: z.unknown()
})

export const chatGenerationReferencesSchema = z.looseObject({
  images: z.array(z.string()).optional(),
  firstImage: z.string().optional(),
  media: z.array(videoReferenceMediaSchema).optional()
})

export const chatGenerationParamsSchema = z
  .object({
    model: z.string().min(1),
    prompt: z.string().default(''),
    messages: z.array(chatGenerationMessageSchema).default([]),
    params: generationParamsSchema.default({}),
    references: chatGenerationReferencesSchema.default({}),
    system: generationSystemSchema.default({})
  })
  .strict()
