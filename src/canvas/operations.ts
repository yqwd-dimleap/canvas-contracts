import { z } from 'zod'
import {
  canvasDocumentElementSchema,
  canvasDocumentSchema
} from './document.js'

/**
 * Canvas Operations - 渲染层无关的画布操作定义
 *
 * 这些操作是可序列化的原子变更，用于：
 * - Frontend 本地状态更新（不依赖 React Flow）
 * - Agent runtime 流式更新画布
 * - Undo/Redo 操作历史
 * - 多人协作同步（未来）
 *
 * 设计原则：
 * 1. 每个操作都是独立的、可序列化的
 * 2. 不包含渲染库特定的数据结构
 * 3. 支持增量更新，避免全量快照
 */

// ========== 基础类型 ==========

export const positionSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const sizeSchema = z.object({
  width: z.number(),
  height: z.number()
})

// ========== 节点操作 ==========

export const nodeAddOperationSchema = z.object({
  type: z.literal('node.add'),
  payload: z.object({
    nodeId: z.string().min(1),
    nodeType: z.string().min(1),
    position: positionSchema,
    data: z.record(z.string(), z.unknown()).default({}),
    metadata: z
      .object({
        optimistic: z.boolean().optional(), // 乐观UI标记
        agentCreated: z.boolean().optional(), // Agent创建的节点
        source: z.enum(['user', 'agent', 'system']).optional()
      })
      .optional()
  })
})

export const nodeUpdateOperationSchema = z.object({
  type: z.literal('node.update'),
  payload: z.object({
    nodeId: z.string().min(1),
    path: z.string().min(1), // JSON path, e.g. "data.title" or "position.x"
    value: z.unknown(),
    metadata: z
      .object({
        transient: z.boolean().optional() // 临时状态（如loading），不进入undo栈
      })
      .optional()
  })
})

export const nodeUpdateBatchOperationSchema = z.object({
  type: z.literal('node.updateBatch'),
  payload: z.object({
    nodeId: z.string().min(1),
    updates: z.record(z.string(), z.unknown()) // 批量更新多个字段
  })
})

export const nodeDeleteOperationSchema = z.object({
  type: z.literal('node.delete'),
  payload: z.object({
    nodeId: z.string().min(1)
  })
})

export const nodeMoveOperationSchema = z.object({
  type: z.literal('node.move'),
  payload: z.object({
    nodeId: z.string().min(1),
    position: positionSchema,
    relative: z.boolean().optional() // 相对移动还是绝对位置
  })
})

export const nodeResizeOperationSchema = z.object({
  type: z.literal('node.resize'),
  payload: z.object({
    nodeId: z.string().min(1),
    size: sizeSchema
  })
})

// ========== 边操作 ==========

export const edgeAddOperationSchema = z.object({
  type: z.literal('edge.add'),
  payload: z.object({
    edgeId: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional()
  })
})

export const edgeDeleteOperationSchema = z.object({
  type: z.literal('edge.delete'),
  payload: z.object({
    edgeId: z.string().min(1)
  })
})

// ========== 选择操作 ==========

export const selectionSetOperationSchema = z.object({
  type: z.literal('selection.set'),
  payload: z.object({
    nodeIds: z.array(z.string()),
    exclusive: z.boolean().optional() // 是否清除其他选择
  })
})

export const selectionAddOperationSchema = z.object({
  type: z.literal('selection.add'),
  payload: z.object({
    nodeIds: z.array(z.string())
  })
})

export const selectionRemoveOperationSchema = z.object({
  type: z.literal('selection.remove'),
  payload: z.object({
    nodeIds: z.array(z.string())
  })
})

export const selectionClearOperationSchema = z.object({
  type: z.literal('selection.clear'),
  payload: z.object({}).optional()
})

// ========== 视觉效果操作 ==========

export const visualHighlightOperationSchema = z.object({
  type: z.literal('visual.highlight'),
  payload: z.object({
    nodeIds: z.array(z.string()),
    duration: z.number().optional(), // ms，自动消失时间
    style: z.enum(['primary', 'success', 'warning', 'error']).optional()
  })
})

export const visualClearHighlightOperationSchema = z.object({
  type: z.literal('visual.clearHighlight'),
  payload: z.object({
    nodeIds: z.array(z.string()).optional() // 不传则清除所有高亮
  })
})

export const visualFocusOperationSchema = z.object({
  type: z.literal('visual.focus'),
  payload: z.object({
    nodeId: z.string().min(1),
    animated: z.boolean().optional(),
    zoom: z.number().optional()
  })
})

// ========== Agent 状态操作 ==========

export const agentNodeStatusOperationSchema = z.object({
  type: z.literal('agent.nodeStatus'),
  payload: z.object({
    nodeId: z.string().min(1),
    status: z
      .enum(['planning', 'creating', 'generating', 'complete', 'error'])
      .nullable(),
    detail: z.string().optional()
  })
})

export const agentGenerationProgressOperationSchema = z.object({
  type: z.literal('agent.generationProgress'),
  payload: z.object({
    nodeId: z.string().min(1),
    progress: z.number().min(0).max(100), // 0-100
    previewUrl: z.string().optional(),
    message: z.string().optional()
  })
})

// ========== Canvas2D Document / Element 操作 ==========

export const documentCreateOperationSchema = z.object({
  type: z.literal('document.create'),
  payload: z.object({
    document: canvasDocumentSchema
  })
})

export const elementAddOperationSchema = z.object({
  type: z.literal('element.add'),
  payload: z.object({
    documentId: z.string().min(1),
    element: canvasDocumentElementSchema
  })
})

export const elementPatchOperationSchema = z.object({
  type: z.literal('element.patch'),
  payload: z.object({
    documentId: z.string().min(1),
    elementId: z.string().min(1),
    patch: z.record(z.string(), z.unknown()).default({})
  })
})

export const elementDeleteOperationSchema = z.object({
  type: z.literal('element.delete'),
  payload: z.object({
    documentId: z.string().min(1),
    elementId: z.string().min(1)
  })
})

export const elementReorderOperationSchema = z.object({
  type: z.literal('element.reorder'),
  payload: z.object({
    documentId: z.string().min(1),
    elementId: z.string().min(1),
    zIndex: z.number().int().nonnegative()
  })
})

export const elementSelectOperationSchema = z.object({
  type: z.literal('element.select'),
  payload: z.object({
    documentId: z.string().min(1),
    elementIds: z.array(z.string().min(1)).default([])
  })
})

export const viewportFocusOperationSchema = z.object({
  type: z.literal('viewport.focus'),
  payload: z.object({
    documentId: z.string().min(1).optional(),
    elementId: z.string().min(1).optional(),
    bounds: z
      .object({
        x: z.number(),
        y: z.number(),
        width: z.number().nonnegative(),
        height: z.number().nonnegative()
      })
      .optional(),
    zoom: z.number().positive().optional()
  })
})

// ========== 操作联合类型（不含批量） ==========

const canvasOperationBaseSchema = z.discriminatedUnion('type', [
  nodeAddOperationSchema,
  nodeUpdateOperationSchema,
  nodeUpdateBatchOperationSchema,
  nodeDeleteOperationSchema,
  nodeMoveOperationSchema,
  nodeResizeOperationSchema,
  edgeAddOperationSchema,
  edgeDeleteOperationSchema,
  selectionSetOperationSchema,
  selectionAddOperationSchema,
  selectionRemoveOperationSchema,
  selectionClearOperationSchema,
  visualHighlightOperationSchema,
  visualClearHighlightOperationSchema,
  visualFocusOperationSchema,
  agentNodeStatusOperationSchema,
  agentGenerationProgressOperationSchema,
  documentCreateOperationSchema,
  elementAddOperationSchema,
  elementPatchOperationSchema,
  elementDeleteOperationSchema,
  elementReorderOperationSchema,
  elementSelectOperationSchema,
  viewportFocusOperationSchema
])

// ========== 批量操作（支持递归） ==========

export const batchOperationSchema: z.ZodType<{
  type: 'batch'
  payload: {
    operations: z.infer<typeof canvasOperationBaseSchema>[]
    label?: string
  }
}> = z.lazy(() =>
  z.object({
    type: z.literal('batch'),
    payload: z.object({
      operations: z.array(canvasOperationBaseSchema),
      label: z.string().optional() // 用于undo/redo显示
    })
  })
)

// ========== 完整操作联合（包含批量） ==========

export const canvasOperationSchema = z.union([
  canvasOperationBaseSchema,
  batchOperationSchema
])

// ========== 操作元数据 ==========

export const operationMetadataSchema = z.object({
  id: z.string().min(1), // 操作唯一ID
  timestamp: z.number(),
  source: z.enum(['user', 'agent', 'system']), // 操作来源
  transient: z.boolean().default(false) // 是否是临时操作（不进入history）
})

export const canvasOperationRecordSchema = z.object({
  operation: canvasOperationSchema,
  metadata: operationMetadataSchema
})

// ========== TypeScript 类型导出 ==========

export type Position = z.infer<typeof positionSchema>
export type Size = z.infer<typeof sizeSchema>
export type CanvasOperation = z.infer<typeof canvasOperationSchema>
export type OperationMetadata = z.infer<typeof operationMetadataSchema>
export type CanvasOperationRecord = z.infer<typeof canvasOperationRecordSchema>

// 各个操作的具体类型
export type NodeAddOperation = z.infer<typeof nodeAddOperationSchema>
export type NodeUpdateOperation = z.infer<typeof nodeUpdateOperationSchema>
export type NodeUpdateBatchOperation = z.infer<
  typeof nodeUpdateBatchOperationSchema
>
export type NodeDeleteOperation = z.infer<typeof nodeDeleteOperationSchema>
export type NodeMoveOperation = z.infer<typeof nodeMoveOperationSchema>
export type NodeResizeOperation = z.infer<typeof nodeResizeOperationSchema>
export type EdgeAddOperation = z.infer<typeof edgeAddOperationSchema>
export type EdgeDeleteOperation = z.infer<typeof edgeDeleteOperationSchema>
export type SelectionSetOperation = z.infer<typeof selectionSetOperationSchema>
export type SelectionAddOperation = z.infer<typeof selectionAddOperationSchema>
export type SelectionRemoveOperation = z.infer<
  typeof selectionRemoveOperationSchema
>
export type SelectionClearOperation = z.infer<
  typeof selectionClearOperationSchema
>
export type VisualHighlightOperation = z.infer<
  typeof visualHighlightOperationSchema
>
export type VisualClearHighlightOperation = z.infer<
  typeof visualClearHighlightOperationSchema
>
export type VisualFocusOperation = z.infer<typeof visualFocusOperationSchema>
export type AgentNodeStatusOperation = z.infer<
  typeof agentNodeStatusOperationSchema
>
export type AgentGenerationProgressOperation = z.infer<
  typeof agentGenerationProgressOperationSchema
>
export type BatchOperation = z.infer<typeof batchOperationSchema>
