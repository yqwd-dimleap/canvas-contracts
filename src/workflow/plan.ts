import { z } from 'zod'
import { agentSkillIdSchema } from '../agent/skills.js'
import { canvas2dViewportSchema } from '../canvas/canvas2d.js'
import { canvasAgentCapabilityManifestSchema } from '../canvas/capabilities.js'
import {
  canvasContextSchema,
  canvasSelectionSchema
} from '../canvas/context.js'
import {
  canvasDocumentElementSchema,
  canvasDocumentSchema
} from '../canvas/document.js'

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

export const canvasAgentCommandKindSchema = z.enum([
  'generate_image',
  'generate_video',
  'edit_selection',
  'inspect',
  'storyboard',
  'tool_preference'
])

export const canvasAgentCommandSourceSchema = z.enum([
  'composer_button',
  'slash',
  'mention',
  'suggestion',
  'context_action',
  'home_action'
])

export const canvasAgentCommandSchema = z.object({
  kind: canvasAgentCommandKindSchema,
  source: canvasAgentCommandSourceSchema.optional(),
  label: z.string().trim().min(1).max(80).optional(),
  targetNodeIds: z.array(z.string().min(1)).max(64).optional(),
  targetDocumentId: z.string().min(1).optional(),
  targetElementIds: z.array(z.string().min(1)).max(64).optional(),
  attachmentIds: z.array(z.string().min(1)).max(24).optional(),
  preferredToolNames: z.array(z.string().min(1)).max(16).optional(),
  modelPreference: z
    .object({
      nodeType: z.string().min(1).optional(),
      modelId: z.string().min(1).optional()
    })
    .optional(),
  params: z.record(z.string(), z.unknown()).optional()
})

export const canvasAgentConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'error']),
  title: z.string().trim().optional(),
  content: z.string().trim().min(1),
  createdAt: z.number().optional()
})

export const canvas2dAgentContextSchema = z.object({
  documents: z.array(canvasDocumentSchema).default([]),
  activeDocumentId: z.string().nullable().default(null),
  selectedElementIds: z.array(z.string().min(1)).default([]),
  viewport: canvas2dViewportSchema.optional()
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
  }),
  z.object({
    type: z.literal('document.create'),
    ...canvasActionProtocolFields,
    document: canvasDocumentSchema
  }),
  z.object({
    type: z.literal('element.add'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    element: canvasDocumentElementSchema
  }),
  z.object({
    type: z.literal('element.patch'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    elementId: z.string().min(1),
    patch: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('element.delete'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    elementId: z.string().min(1)
  }),
  z.object({
    type: z.literal('element.reorder'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    elementId: z.string().min(1),
    zIndex: z.number().int().nonnegative()
  }),
  z.object({
    type: z.literal('element.select'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    elementIds: z.array(z.string().min(1)).default([])
  }),
  z.object({
    type: z.literal('viewport.focus'),
    ...canvasActionProtocolFields,
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
])

/**
 * Canvas Agent Base Request
 * Agent 请求的通用基础（项目ID、画布上下文、选中状态）
 */
export const canvasAgentBaseRequestSchema = z.object({
  projectId: z.string().nullable().optional(),
  /** Client-selected i18n locale used for user-facing generated text. */
  locale: z.string().trim().min(2).max(16).optional(),
  /** Optional generation model preference for downstream media nodes. */
  modelId: z.string().optional(),
  /** 是否开启思考模式（向后兼容；未传 reasoningEffort 时映射为 medium）。 */
  thinkingEnabled: z.boolean().optional(),
  /** 思考档位，透传为网关 reasoning_effort 并参与计费规则匹配。 */
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
  canvas: canvasContextSchema,
  selection: canvasSelectionSchema,
  /**
   * Canvas2D/Pixi-backed scene context. This is renderer-agnostic document and
   * layer state; Pixi display objects, textures, DOM coordinates, and runtime
   * containers must never be serialized here.
   */
  canvas2d: canvas2dAgentContextSchema.optional(),
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
    intent: z.string().min(1),
    /**
     * UI-originated structured command. This constrains intent resolution without
     * replacing the natural language intent, so older clients can keep sending
     * only intent while newer surfaces avoid encoding button clicks as text.
     */
    command: canvasAgentCommandSchema.optional()
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
export type CanvasAgentCommandKind = z.infer<
  typeof canvasAgentCommandKindSchema
>
export type CanvasAgentCommandSource = z.infer<
  typeof canvasAgentCommandSourceSchema
>
export type CanvasAgentCommand = z.infer<typeof canvasAgentCommandSchema>
export type CanvasAgentConversationMessage = z.infer<
  typeof canvasAgentConversationMessageSchema
>
export type Canvas2dAgentContext = z.infer<typeof canvas2dAgentContextSchema>
export type CanvasAgentBaseRequest = z.infer<
  typeof canvasAgentBaseRequestSchema
>
export type CanvasRunRequest = z.infer<typeof canvasRunRequestSchema>
