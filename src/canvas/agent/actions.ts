import { z } from 'zod'
import { CANVAS_AGENT_PROTOCOL_VERSION } from '../../agent/langgraph-protocol.js'
import { agentSkillIdSchema } from '../../agent/skills.js'
import { canvasContextSchema, canvasSelectionSchema } from '../core/context.js'
import {
  canvasDocumentElementSchema,
  canvasDocumentSchema
} from '../core/document.js'
import {
  canvasAgentCapabilityManifestSchema,
  canvasAgentToolIdentifierSchema
} from './capabilities.js'

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

export const canvasIntentKindSchema = z.enum([
  'conversation', // 纯对话：用户在提问、讨论、寻求解释，不需要立即执行操作
  'chat', // 简单回复：需要快速回答或确认
  'question', // 深度问题：需要详细解释或分析
  'image', // 图像生成
  'image_edit', // 图像编辑
  'video', // 视频生成
  'video_edit', // 视频编辑
  'script' // 脚本规划
])

export const canvasAgentCommandKindSchema = z.enum([
  'generate_image',
  'generate_video',
  'edit_selection',
  'inspect',
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
  targetDocumentId: z.string().min(1).optional(),
  targetElementIds: z.array(z.string().min(1)).max(64).optional(),
  attachmentIds: z.array(z.string().min(1)).max(24).optional(),
  preferredToolNames: z
    .array(canvasAgentToolIdentifierSchema)
    .max(16)
    .optional(),
  modelPreference: z
    .object({
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
 * Canvas Agent Action
 * Renderer-agnostic atomic action emitted by the Canvas Agent runtime.
 */
export const canvasAgentActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('document.create'),
    ...canvasActionProtocolFields,
    document: canvasDocumentSchema
  }),
  z.object({
    type: z.literal('document.patch'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    patch: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('document.delete'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1)
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
    type: z.literal('element.status'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1).optional(),
    elementId: z.string().min(1),
    status: z
      .enum(['planning', 'generating', 'loading', 'complete', 'error'])
      .nullable(),
    detail: z.string().optional()
  }),
  z.object({
    type: z.literal('element.generationProgress'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1).optional(),
    elementId: z.string().min(1),
    progress: z.number().min(0).max(100),
    message: z.string().optional()
  }),
  z.object({
    type: z.literal('element.highlight'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1).optional(),
    elementIds: z.array(z.string().min(1)),
    duration: z.number().positive().optional(),
    style: z.enum(['primary', 'success', 'warning', 'error']).optional()
  }),
  z.object({
    type: z.literal('element.clearHighlight'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1).optional(),
    elementIds: z.array(z.string().min(1)).optional()
  }),
  z.object({
    type: z.literal('element.generate'),
    ...canvasActionProtocolFields,
    documentId: z.string().min(1),
    elementId: z.string().min(1).optional(),
    mediaType: z.enum(['image', 'video']).default('image'),
    prompt: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    referenceImageUrls: z.array(z.string().min(1)).default([]),
    sourceVideoUrl: z.string().min(1).optional(),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('viewport.set'),
    ...canvasActionProtocolFields,
    x: z.number(),
    y: z.number(),
    zoom: z.number().positive()
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
  /** 思考档位，透传为网关 reasoning_effort 并参与计费规则匹配。 */
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
  canvas: canvasContextSchema,
  selection: canvasSelectionSchema,
  /**
   * 当前前端真正开放给 Agent 的画布能力清单。
   * Agent 必须基于该清单输出动作，不能使用未启用/隐藏的节点、配方或工具。
   */
  capabilities: canvasAgentCapabilityManifestSchema.optional()
})

/**
 * Protocol v2 run input. Canvas, messages, resources, model preferences and
 * capabilities are server-owned context and must never be copied into a run.
 */
export const canvasAgentRunAttachmentSchema = z
  .object({
    resourceId: z.string().trim().min(1)
  })
  .strict()

export const canvasAgentRunInputSchema = z
  .object({
    protocolVersion: z.literal(CANVAS_AGENT_PROTOCOL_VERSION),
    projectId: z.string().trim().min(1),
    messageId: z.string().trim().min(1),
    canvasRevision: z.number().int().nonnegative(),
    prompt: z.string().trim().min(1).max(48_000),
    selection: canvasSelectionSchema,
    attachments: z.array(canvasAgentRunAttachmentSchema).max(24).default([]),
    command: canvasAgentCommandSchema.optional(),
    locale: z.string().trim().min(2).max(16).optional(),
    skillId: agentSkillIdSchema.optional(),
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional()
  })
  .strict()

export type CanvasAgentAction = z.infer<typeof canvasAgentActionSchema>
export type CanvasIntentKind = z.infer<typeof canvasIntentKindSchema>
export type CanvasAgentCommand = z.infer<typeof canvasAgentCommandSchema>
export type CanvasAgentConversationMessage = z.infer<
  typeof canvasAgentConversationMessageSchema
>
export type CanvasAgentRunInput = z.infer<typeof canvasAgentRunInputSchema>
