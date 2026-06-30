import { z } from 'zod'

/**
 * Canvas Vision - 视觉理解能力
 *
 * 让 Agent "看到"画布：
 * 1. 渲染画布为图片
 * 2. Vision 模型分析布局、风格、空白区域
 * 3. 提供空间建议（下一个节点放哪里）
 * 4. 碰撞检测和优化建议
 */

// ========== 画布渲染配置 ==========

export const canvasRenderConfigSchema = z.object({
  width: z.number().default(1920),
  height: z.number().default(1080),
  scale: z.number().default(1), // 缩放比例
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(0).max(100).default(85), // JPEG/WebP 质量
  includeSelection: z.boolean().default(true), // 是否高亮选中节点
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number()
    })
    .optional() // 指定视口，不传则自动适配全部内容
})

// ========== 视觉分析结果 ==========

export const canvasLayoutAnalysisSchema = z.object({
  structure: z.enum([
    'empty',
    'single-node',
    'linear',
    'tree',
    'grid',
    'clustered',
    'complex'
  ]),
  density: z.enum(['sparse', 'moderate', 'dense', 'overcrowded']),
  balance: z.enum([
    'balanced',
    'left-heavy',
    'right-heavy',
    'top-heavy',
    'bottom-heavy'
  ]),
  alignmentQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
  hasOverlaps: z.boolean(),
  hasClusters: z.boolean()
})

export const canvasVisualStyleSchema = z.object({
  colorPalette: z.array(z.string()).optional(), // 主要颜色（hex）
  dominantColors: z.array(z.string()).optional(),
  visualTheme: z.string().optional(), // '现代简约', '暖色调', '科技感'
  consistency: z.enum(['consistent', 'mixed', 'inconsistent']).optional()
})

export const canvasSpatialSuggestionSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  reason: z.string(), // '该区域空白，适合放置新节点'
  confidence: z.number().min(0).max(1),
  avoidedCollisions: z.array(z.string()).optional() // 避开的节点 ID
})

export const canvasVisionAnalysisSchema = z.object({
  summary: z.string(), // 自然语言描述
  layout: canvasLayoutAnalysisSchema,
  visualStyle: canvasVisualStyleSchema.optional(),
  spatialSuggestions: z.array(canvasSpatialSuggestionSchema).max(5), // 最多5个建议位置
  insights: z.array(z.string()).optional(), // 其他洞察
  warnings: z.array(z.string()).optional() // 潜在问题（如节点重叠）
})

// ========== 碰撞检测 ==========

export const canvasCollisionSchema = z.object({
  nodeId1: z.string(),
  nodeId2: z.string(),
  overlap: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  severity: z.enum(['minor', 'moderate', 'severe'])
})

export const canvasCollisionDetectionSchema = z.object({
  hasCollisions: z.boolean(),
  collisions: z.array(canvasCollisionSchema),
  suggestions: z.array(
    z.object({
      nodeId: z.string(),
      newPosition: z.object({ x: z.number(), y: z.number() }),
      reason: z.string()
    })
  )
})

// ========== Vision 请求和响应 ==========

export const canvasVisionRequestSchema = z.object({
  prompt: z.string().optional(), // 可选的引导性问题
  includeAnalysis: z.boolean().default(true),
  includeCollisionDetection: z.boolean().default(true),
  includeSpatialSuggestions: z.boolean().default(true),
  renderConfig: canvasRenderConfigSchema.optional()
})

export const canvasVisionResponseSchema = z.object({
  imageUrl: z.string().optional(), // 渲染的画布图片（可选）
  imageDataUrl: z.string().optional(), // base64 data URL（用于本地处理）
  analysis: canvasVisionAnalysisSchema,
  collisionDetection: canvasCollisionDetectionSchema.optional(),
  metadata: z.object({
    modelUsed: z.string().optional(),
    processingTime: z.number().optional(), // ms
    timestamp: z.number()
  })
})

// ========== TypeScript 类型导出 ==========

export type CanvasRenderConfig = z.infer<typeof canvasRenderConfigSchema>
export type CanvasLayoutAnalysis = z.infer<typeof canvasLayoutAnalysisSchema>
export type CanvasVisualStyle = z.infer<typeof canvasVisualStyleSchema>
export type CanvasSpatialSuggestion = z.infer<
  typeof canvasSpatialSuggestionSchema
>
export type CanvasVisionAnalysis = z.infer<typeof canvasVisionAnalysisSchema>
export type CanvasCollision = z.infer<typeof canvasCollisionSchema>
export type CanvasCollisionDetection = z.infer<
  typeof canvasCollisionDetectionSchema
>
export type CanvasVisionRequest = z.infer<typeof canvasVisionRequestSchema>
export type CanvasVisionResponse = z.infer<typeof canvasVisionResponseSchema>
