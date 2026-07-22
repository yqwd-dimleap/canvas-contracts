import type { z } from 'zod'
import type {
  canvasGenerationTargetSchema,
  chatGenerationMessageSchema,
  chatGenerationParamsSchema,
  imageGenerationParamsSchema,
  videoGenerationParamsSchema,
  videoReferenceMediaSchema
} from './params.js'

/** 视频参考媒体 */
export type VideoReferenceMedia = z.infer<typeof videoReferenceMediaSchema>

/** Renderer-agnostic Canvas2D generation target. */
export type CanvasGenerationTarget = z.infer<
  typeof canvasGenerationTargetSchema
>

/** 图片生成请求运行时上下文（前端 → agent） */
export type ImageGenerationParams = z.infer<typeof imageGenerationParamsSchema>

/** 视频生成请求运行时上下文（前端 → agent） */
export type VideoGenerationParams = z.infer<typeof videoGenerationParamsSchema>

/** Chat 消息（前端 → agent） */
export type ChatGenerationMessage = z.infer<typeof chatGenerationMessageSchema>

/** Chat 生成请求运行时上下文（前端 → agent） */
export type ChatGenerationParams = z.infer<typeof chatGenerationParamsSchema>
