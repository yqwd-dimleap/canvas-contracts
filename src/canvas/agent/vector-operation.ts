import { z } from 'zod'
import { apiSuccessResponseSchema } from '../../api/response.js'
import { canvasAgentBaseRequestSchema } from './actions.js'

/**
 * 矢量操作类型。
 *
 * - `optimize-path`   优化笔迹：把粗糙的手绘 path 清理成平滑矢量。
 * - `optimize-shape`  优化 shape：把基础图形/矢量打磨成更规整的矢量。
 * - `generate-shape`  生成 shape：按提示词（可选参考现有元素）生成新的矢量图形。
 *
 * 三种操作统一产出一段 SVG，前端落盘为 `vector` 元素。
 */
export const canvasVectorOperationKindSchema = z.enum([
  'optimize-path',
  'optimize-shape',
  'generate-shape'
])

/** 参与矢量操作的源元素类型。generate-shape 允许无源。 */
export const canvasVectorOperationSourceTypeSchema = z.enum([
  'shape',
  'path',
  'vector'
])

/**
 * 矢量操作请求。
 *
 * 复用 canvas agent 基础请求（projectId/locale/reasoningEffort 等），但把
 * canvas/selection 放宽为可选——单元素矢量操作不需要完整画布上下文。
 */
export const canvasVectorOperationRequestSchema =
  canvasAgentBaseRequestSchema.extend({
    canvas: canvasAgentBaseRequestSchema.shape.canvas.optional(),
    selection: canvasAgentBaseRequestSchema.shape.selection.optional(),
    documentId: z.string().min(1).optional(),
    operation: canvasVectorOperationKindSchema,
    sourceElementId: z.string().min(1).optional(),
    sourceType: canvasVectorOperationSourceTypeSchema.optional(),
    /** 源元素的 SVG 表示，作为模型的几何参考。 */
    sourceSvg: z.string().trim().min(1).max(200000).optional(),
    /** 用户提示词，generate-shape 常用，优化类操作可选。 */
    prompt: z.string().trim().min(1).max(4000).optional(),
    /** 期望画布尺寸，用于回填 viewBox / 元素 bounds。 */
    width: z.number().positive().max(16384).optional(),
    height: z.number().positive().max(16384).optional()
  })

/**
 * 矢量操作结果。svg 为完整的 `<svg>…</svg>` 文档，可直接作为 vector 元素内容。
 */
export const canvasVectorOperationResultSchema = z.object({
  agentModel: z.string().min(1),
  operation: canvasVectorOperationKindSchema,
  svg: z.string().min(1),
  viewBox: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  notes: z.array(z.string()).default([])
})

export const canvasVectorOperationResponseSchema = apiSuccessResponseSchema(
  canvasVectorOperationResultSchema
)

export type CanvasVectorOperationKind = z.infer<
  typeof canvasVectorOperationKindSchema
>
export type CanvasVectorOperationSourceType = z.infer<
  typeof canvasVectorOperationSourceTypeSchema
>
export type CanvasVectorOperationRequest = z.infer<
  typeof canvasVectorOperationRequestSchema
>
export type CanvasVectorOperationResult = z.infer<
  typeof canvasVectorOperationResultSchema
>
export type CanvasVectorOperationResponse = z.infer<
  typeof canvasVectorOperationResponseSchema
>
