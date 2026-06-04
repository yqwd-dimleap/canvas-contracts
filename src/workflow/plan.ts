import { z } from 'zod'
import { agentProfileSummarySchema } from '../agent/profiles.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  canvasContextSchema,
  canvasSelectionSchema
} from '../canvas/context.js'

/**
 * Canvas Plan Action
 * 画布操作的原子动作（创建节点、更新数据、创建边）
 */
export const canvasPlanActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('createNode'),
    nodeType: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('patchNodeData'),
    nodeId: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('createEdge'),
    source: z.string().min(1),
    target: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  })
])

/**
 * Canvas Agent Base Request
 * Agent 请求的通用基础（项目ID、画布上下文、选中状态）
 */
export const canvasAgentBaseRequestSchema = z.object({
  projectId: z.string().nullable().optional(),
  profileId: z.string().optional(),
  canvas: canvasContextSchema,
  selection: canvasSelectionSchema
})

/**
 * Canvas Plan Request
 * 工作流规划请求（基础 + 用户意图）
 */
export const canvasPlanRequestSchema = canvasAgentBaseRequestSchema.extend({
  intent: z.string().min(1)
})

/**
 * Canvas Plan Response
 * 工作流规划结果（摘要、执行模式、动作列表）
 */
export const canvasPlanResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    projectId: z.string().nullable(),
    summary: z.string(),
    executionMode: z.enum(['manualConfirm', 'autoExecute']),
    context: z.object({
      nodeCount: z.number(),
      edgeCount: z.number(),
      resourceCount: z.number(),
      selectedNodeIds: z.array(z.string())
    }),
    actions: z.array(canvasPlanActionSchema),
    questions: z.array(z.string())
  })
)

export type CanvasPlanAction = z.infer<typeof canvasPlanActionSchema>
export type CanvasAgentBaseRequest = z.infer<
  typeof canvasAgentBaseRequestSchema
>
export type CanvasPlanRequest = z.infer<typeof canvasPlanRequestSchema>
export type CanvasPlanResponse = z.infer<typeof canvasPlanResponseSchema>
