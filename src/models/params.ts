import { z } from 'zod'

/**
 * 生成请求的运行时上下文 schema —— 前端 → agent 的请求体。
 * 顶层保持小而稳定；provider 特有字段必须走 controls +
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

export const generationControlsSchema = z.record(z.string(), z.unknown())

export const generationSystemSchema = z
  .object({
    /** Frontend project id; used by agent-side asset registration only. */
    projectId: z.string().min(1).max(128).nullable().optional(),
    /** Renderer-agnostic Canvas2D target for persistence/events. */
    canvasTarget: canvasGenerationTargetSchema.optional()
  })
  .strict()

/** 图片生成请求运行时上下文 */
export const imageGenerationInputSchema = z
  .object({
    size: z.string().optional(),
    n: z.number().optional(),
    quality: z.string().optional(),
    background: z.string().optional(),
    outputFormat: z.string().optional(),
    outputCompression: z.number().optional(),
    /** 反向提示词，描述不希望出现的内容 */
    negativePrompt: z.string().optional(),
    /** 随机数种子 */
    seed: z.number().optional()
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
    input: imageGenerationInputSchema.default({}),
    controls: generationControlsSchema.default({}),
    references: imageGenerationReferencesSchema.default({}),
    system: generationSystemSchema.default({})
  })
  .strict()

export const chatGenerationMessagesSchema = z
  .array(z.object({}).passthrough())
  .default([])

export const chatGenerationInputSchema = z
  .object({
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    stream: z.boolean().optional(),
    streamOptions: z.record(z.string(), z.unknown()).optional()
  })
  .strict()

export const chatGenerationReferencesSchema = z
  .record(z.string(), z.unknown())
  .default({})

export const chatGenerationParamsSchema = z
  .object({
    messages: chatGenerationMessagesSchema.default([]),
    prompt: z.string().optional(),
    model: z.string().min(1),
    input: chatGenerationInputSchema.default({}),
    controls: generationControlsSchema.default({}),
    references: chatGenerationReferencesSchema,
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

/** 视频生成请求运行时上下文 */
export const videoGenerationInputSchema = z
  .object({
    duration: z.number().optional(),
    seconds: z.string().optional(),
    resolution: z.string().optional(),
    aspectRatio: z.string().optional(),
    quality: z.string().optional(),
    seed: z.number().int().optional()
  })
  .strict()

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
    input: videoGenerationInputSchema.default({}),
    controls: generationControlsSchema.default({}),
    references: videoGenerationReferencesSchema.default({}),
    system: generationSystemSchema.default({})
  })
  .strict()
