import { z } from 'zod'
import {
  canvasEdgeSnapshotSchema,
  canvasNodeSnapshotSchema
} from './context.js'

/**
 * 智能上下文压缩 - 减少画布快照传输大小
 *
 * 策略：
 * 1. 差分快照 - 只传输变化部分
 * 2. 语义摘要 - LLM 生成画布状态摘要
 * 3. 关键节点保留 - 只保留最近操作/选中的节点完整数据
 */

// ========== 差分快照 ==========

export const canvasDiffChangeSchema = z.object({
  type: z.enum(['added', 'updated', 'deleted']),
  nodeId: z.string().optional(),
  edgeId: z.string().optional(),
  node: canvasNodeSnapshotSchema.optional(),
  edge: canvasEdgeSnapshotSchema.optional(),
  updates: z.record(z.string(), z.unknown()).optional() // 字段级更新
})

export const canvasDiffSnapshotSchema = z.object({
  type: z.literal('diff'),
  baseVersion: z.string(), // 基础版本 ID
  version: z.string(), // 当前版本 ID
  timestamp: z.number(),
  changes: z.object({
    nodes: z.array(canvasDiffChangeSchema).default([]),
    edges: z.array(canvasDiffChangeSchema).default([])
  })
})

// ========== 语义摘要 ==========

export const canvasSemanticSummarySchema = z.object({
  summary: z.string(), // LLM 生成的自然语言摘要
  statistics: z.object({
    nodeCount: z.number(),
    edgeCount: z.number(),
    nodeTypes: z.record(z.string(), z.number()), // { 'canvasAiImage': 5, 'canvasAiVideo': 2 }
    selectedCount: z.number(),
    lastModified: z.number()
  }),
  theme: z.string().optional(), // 画布主题（如 '产品营销素材'）
  keyTopics: z.array(z.string()).optional(), // 关键主题标签
  completionStatus: z
    .enum(['empty', 'planning', 'in-progress', 'near-complete', 'complete'])
    .optional()
})

// ========== 压缩快照 ==========

export const canvasCompressedSnapshotSchema = z.object({
  type: z.literal('compressed'),
  version: z.string(),
  timestamp: z.number(),
  semantic: canvasSemanticSummarySchema, // 语义摘要
  keyNodes: z.array(canvasNodeSnapshotSchema), // 关键节点（选中/最近修改）
  keyEdges: z.array(canvasEdgeSnapshotSchema), // 关键连接
  statistics: z.object({
    totalNodes: z.number(),
    totalEdges: z.number(),
    compressedNodes: z.number(), // 被压缩掉的节点数
    compressionRatio: z.number() // 压缩率 0-1
  })
})

// ========== 完整快照（带版本） ==========

export const canvasVersionedSnapshotSchema = z.object({
  type: z.literal('full'),
  version: z.string(),
  timestamp: z.number(),
  nodes: z.array(canvasNodeSnapshotSchema),
  edges: z.array(canvasEdgeSnapshotSchema)
})

// ========== 快照联合类型 ==========

export const canvasSnapshotVariantSchema = z.discriminatedUnion('type', [
  canvasVersionedSnapshotSchema,
  canvasDiffSnapshotSchema,
  canvasCompressedSnapshotSchema
])

// ========== 压缩策略配置 ==========

export const compressionStrategySchema = z.object({
  method: z.enum(['none', 'diff', 'semantic', 'hybrid']),
  maxKeyNodes: z.number().default(10), // 最多保留多少关键节点
  summaryLanguage: z.enum(['zh', 'en']).default('zh'),
  enableDiff: z.boolean().default(true),
  enableSemantic: z.boolean().default(true)
})

// ========== TypeScript 类型导出 ==========

export type CanvasDiffChange = z.infer<typeof canvasDiffChangeSchema>
export type CanvasDiffSnapshot = z.infer<typeof canvasDiffSnapshotSchema>
export type CanvasSemanticSummary = z.infer<typeof canvasSemanticSummarySchema>
export type CanvasCompressedSnapshot = z.infer<
  typeof canvasCompressedSnapshotSchema
>
export type CanvasVersionedSnapshot = z.infer<
  typeof canvasVersionedSnapshotSchema
>
export type CanvasSnapshotVariant = z.infer<typeof canvasSnapshotVariantSchema>
export type CompressionStrategy = z.infer<typeof compressionStrategySchema>
