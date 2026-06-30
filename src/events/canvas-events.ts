import { z } from 'zod'
import { canvasOperationSchema } from '../canvas/operations.js'
import { eventEnvelopeBaseSchema } from './envelope.js'

/**
 * Canvas Operation Event - Agent 通过 SSE 实时推送画布操作
 *
 * 用于实现渐进式画布同步：
 * - Agent planning 阶段：推送节点占位符
 * - Agent acting 阶段：推送真实节点数据
 * - Generation 阶段：推送进度更新
 *
 * Frontend 接收后立即应用到画布，无需等待完整 plan 返回
 */
export const canvasOperationEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('canvas.operation'),
  data: z.object({
    operation: canvasOperationSchema,
    transient: z.boolean().default(false), // 临时操作不进入undo栈
    sequence: z.number().optional() // 操作序列号，用于确保顺序
  })
})

/**
 * Canvas Snapshot Request - Agent 请求最新画布快照
 *
 * 用于 WebSocket 双向通信场景：
 * - Agent 执行过程中需要读取最新画布状态
 * - 用户手动编辑画布后，Agent 需要感知变化
 */
export const canvasSnapshotRequestEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('canvas.snapshot.request'),
  data: z.object({
    reason: z.enum(['user_edit', 'agent_query', 'context_sync']).optional()
  })
})

/**
 * Agent Suggestion - Agent 主动提议下一步操作
 *
 * Agent 完成任务后，基于当前画布状态提供后续建议
 */
export const agentSuggestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1), // 简短标题
  description: z.string(), // 详细说明
  intent: z.string().min(1), // 可执行的 intent 字符串
  confidence: z.number().min(0).max(1).optional(), // 置信度 0-1
  estimatedCost: z.number().optional() // 预估消耗积分
})

export const agentSuggestionsEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('agent.suggestions'),
  data: z.object({
    suggestions: z.array(agentSuggestionSchema).min(1).max(5) // 最多5个建议
  })
})

export type CanvasOperationEvent = z.infer<typeof canvasOperationEventSchema>
export type CanvasSnapshotRequestEvent = z.infer<
  typeof canvasSnapshotRequestEventSchema
>
export type AgentSuggestion = z.infer<typeof agentSuggestionSchema>
export type AgentSuggestionsEvent = z.infer<typeof agentSuggestionsEventSchema>
