import { z } from 'zod'

/**
 * Canvas 2D Element Runtime State
 *
 * 前端渲染器的运行时状态，不属于画布文档的持久化部分。
 * 用于管理元素的临时 UI 状态：加载、生成进度、高亮等。
 */
export const canvas2dElementRuntimeStateSchema = z.object({
  /** 元素 ID */
  elementId: z.string().min(1),

  /** 是否正在渲染 */
  rendering: z.boolean().default(false),

  /** 是否正在加载资源 */
  loading: z.boolean().default(false),

  /** 渲染或加载错误信息 */
  error: z.string().nullable().optional(),

  /** Agent 生成进度 (0-100) */
  generationProgress: z.number().min(0).max(100).optional(),

  /** 生成状态 */
  generationStatus: z
    .enum(['planning', 'generating', 'loading', 'complete', 'error'])
    .nullable()
    .optional(),

  /** 是否高亮显示 */
  highlighted: z.boolean().default(false),

  /** 高亮样式 */
  highlightStyle: z.enum(['primary', 'success', 'warning', 'error']).optional(),

  /** 高亮持续时间（ms，用于自动取消高亮） */
  highlightDuration: z.number().positive().optional(),

  /** 高亮开始时间戳 */
  highlightStartedAt: z.number().optional()
})

/**
 * Canvas 2D Runtime State
 *
 * 整个 Canvas 2D 渲染器的运行时状态。
 */
export const canvas2dRuntimeStateSchema = z.object({
  /** 元素运行时状态映射表 */
  elements: z.record(z.string(), canvas2dElementRuntimeStateSchema).default({}),

  /** 是否正在拖拽 */
  isDragging: z.boolean().default(false),

  /** 是否正在变换（缩放、旋转等） */
  isTransforming: z.boolean().default(false),

  /** 当前光标样式 */
  cursor: z.string().optional(),

  /** 渲染器是否已初始化 */
  rendererReady: z.boolean().default(false),

  /** 性能统计 */
  performance: z
    .object({
      fps: z.number().optional(),
      renderTime: z.number().optional(),
      elementCount: z.number().optional()
    })
    .optional()
})

export type Canvas2dElementRuntimeState = z.infer<
  typeof canvas2dElementRuntimeStateSchema
>
export type Canvas2dRuntimeState = z.infer<typeof canvas2dRuntimeStateSchema>
