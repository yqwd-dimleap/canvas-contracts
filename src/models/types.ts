import type { z } from 'zod'
import type {
  canvasGenerationTargetSchema,
  generationControlsSchema,
  generationSystemSchema,
  imageGenerationInputSchema,
  imageGenerationParamsSchema,
  imageGenerationReferencesSchema,
  videoGenerationInputSchema,
  videoGenerationParamsSchema,
  videoGenerationReferencesSchema,
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
export type ImageGenerationInput = z.infer<typeof imageGenerationInputSchema>
export type ImageGenerationReferences = z.infer<
  typeof imageGenerationReferencesSchema
>

/** 视频生成请求运行时上下文（前端 → agent） */
export type VideoGenerationParams = z.infer<typeof videoGenerationParamsSchema>
export type VideoGenerationInput = z.infer<typeof videoGenerationInputSchema>
export type VideoGenerationReferences = z.infer<
  typeof videoGenerationReferencesSchema
>
export type GenerationControls = z.infer<typeof generationControlsSchema>
export type GenerationSystem = z.infer<typeof generationSystemSchema>
