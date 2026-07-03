import { z } from 'zod'
import { agentSkillIdSchema } from '../agent/skills.js'
import { canvasAgentCapabilityManifestSchema } from '../canvas/capabilities.js'
import {
  canvasContextSchema,
  canvasSelectionSchema
} from '../canvas/context.js'

/**
 * Canvas Action Ref
 * 前后端共享的动作级逻辑引用。Agent 可以先返回 ref/clientRef，
 * 前端 materialize 时再建立 ref -> realNodeId 映射。
 */
export const canvasActionStatusSchema = z.enum([
  'pending',
  'running',
  'requires_confirmation',
  'succeeded',
  'failed',
  'skipped',
  'cancelled'
])

export const canvasActionErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().min(1),
  retryable: z.boolean().optional(),
  details: z.unknown().optional()
})

export const canvasActionCostSchema = z.object({
  credits: z.number().nonnegative().optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().min(1).optional(),
  estimated: z.boolean().optional()
})

export const canvasActionRefSchema = z.object({
  ref: z.string().min(1).optional(),
  nodeId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional()
})

export const canvasIntentKindSchema = z.enum([
  'chat',
  'question',
  'image',
  'image_edit',
  'video',
  'video_edit',
  'script',
  'storyboard'
])

export const canvasAgentConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'error']),
  title: z.string().trim().optional(),
  content: z.string().trim().min(1),
  createdAt: z.number().optional()
})

const canvasActionProtocolFields = {
  runId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  clientRef: z.string().min(1).optional(),
  ref: z.string().min(1).optional(),
  status: canvasActionStatusSchema.optional(),
  requiresConfirmation: z.boolean().optional(),
  cost: canvasActionCostSchema.optional(),
  toolName: z.string().min(1).optional(),
  result: z.unknown().optional(),
  error: canvasActionErrorSchema.optional(),
  traceId: z.string().min(1).optional()
} as const

/**
 * Canvas Plan Action
 * 画布操作的原子动作（创建节点、更新数据、创建边）
 */
export const canvasPlanActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('createNode'),
    ...canvasActionProtocolFields,
    nodeType: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('patchNodeData'),
    ...canvasActionProtocolFields,
    nodeId: z.string().min(1),
    nodeRef: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('createEdge'),
    ...canvasActionProtocolFields,
    source: z.string().min(1),
    target: z.string().min(1),
    sourceRef: z.string().min(1).optional(),
    targetRef: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('deleteNode'),
    ...canvasActionProtocolFields,
    nodeId: z.string().min(1)
  })
])

/**
 * Canvas Agent Base Request
 * Agent 请求的通用基础（项目ID、画布上下文、选中状态）
 */
export const canvasAgentBaseRequestSchema = z.object({
  projectId: z.string().nullable().optional(),
  profileId: z.string().nullable().optional(),
  /** Client-selected i18n locale used for user-facing generated text. */
  locale: z.string().trim().min(2).max(16).optional(),
  /** 智能推荐的模型ID（优先于 profileId） */
  modelId: z.string().optional(),
  /** 是否开启思考模式（向后兼容；未传 reasoningEffort 时映射为 medium）。 */
  thinkingEnabled: z.boolean().optional(),
  /** 思考档位，透传为网关 reasoning_effort 并参与计费规则匹配。 */
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
  canvas: canvasContextSchema,
  selection: canvasSelectionSchema,
  /**
   * 当前前端真正开放给 Agent 的画布能力清单。
   * Agent 必须基于该清单规划动作，不能使用未启用/隐藏的节点、工作流或工具。
   */
  capabilities: canvasAgentCapabilityManifestSchema.optional()
})

/**
 * Canvas Plan Request
 * 工作流规划请求（基础 + 用户意图）
 */
export const canvasRunRequestSchema = canvasAgentBaseRequestSchema
  .extend({
    intent: z.string().min(1)
  })
  .extend({
    conversation: z
      .array(canvasAgentConversationMessageSchema)
      .max(24)
      .optional(),
    /** 选中的技能：注入到规划/对话系统提示，引导 agent 行为侧重。 */
    skillId: agentSkillIdSchema.optional()
  })

export type CanvasPlanAction = z.infer<typeof canvasPlanActionSchema>
export type CanvasActionStatus = z.infer<typeof canvasActionStatusSchema>
export type CanvasActionError = z.infer<typeof canvasActionErrorSchema>
export type CanvasActionCost = z.infer<typeof canvasActionCostSchema>
export type CanvasActionRef = z.infer<typeof canvasActionRefSchema>
export type CanvasIntentKind = z.infer<typeof canvasIntentKindSchema>
export type CanvasAgentConversationMessage = z.infer<
  typeof canvasAgentConversationMessageSchema
>
export type CanvasAgentBaseRequest = z.infer<
  typeof canvasAgentBaseRequestSchema
>
export type CanvasRunRequest = z.infer<typeof canvasRunRequestSchema>
