import { z } from 'zod'
import { projectCanvasNodeTypeSchema } from '../canvas/workflow.js'

/**
 * 时间戳：统一以 epoch 毫秒（number）表示。
 * 兼容历史/跨服务写入的 BSON Date（前端 Mongo repo 曾写入 Date）。
 */
const timestampSchema = z.preprocess(
  (value) => (value instanceof Date ? value.getTime() : value),
  z.number()
)

/**
 * node_type_models：某个**画布节点类型**（canvasAiImage / canvasAiVideo …）下，
 * 后台为该节点配置的、工具栏可选的模型 id 列表与展示顺序。
 *
 * nodeType 复用 projectCanvasNodeTypeSchema —— 即 React Flow 的 node.type，
 * 与 agent 识别、画布生成触发同一套画布节点类型。
 * 注意：这与「模型类别（modelCategory: image/video/chat…）」是两个正交维度——
 * 后者只用于候选模型的归类与筛选。
 */
export const nodeTypeModelsSchema = z.object({
  id: z.string().min(1),
  nodeType: projectCanvasNodeTypeSchema,
  modelIds: z.array(z.string()).default([]),
  displayOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export type NodeTypeModels = z.infer<typeof nodeTypeModelsSchema>
