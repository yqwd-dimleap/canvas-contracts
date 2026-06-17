import { z } from 'zod'
import {
  generationTaskResultSchema,
  generationTaskTypeSchema
} from '../generation/index.js'
import { eventEnvelopeBaseSchema } from './envelope.js'

/**
 * Canvas 系统事件联合（discriminated union on `eventType`）。
 *
 * 首批覆盖前端最关心的异步终态：生成完成/失败、agent run 完成/失败/取消。
 * 每个变体复用 {@link eventEnvelopeBaseSchema} 信封 + 自己的 `data` 形状。
 *
 * 扩展约定：新增事件 = 往该 union 追加一个 `eventType: z.literal(...)` 变体，
 * 命名遵循 `domain.action`（与 workflow/run.ts 的 SSE 事件名对齐）。
 */

export const generationCompletedEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('generation.completed'),
  data: z.object({
    taskId: z.string().min(1),
    nodeId: z.string().optional(),
    projectId: z.string().nullable().optional(),
    type: generationTaskTypeSchema,
    result: generationTaskResultSchema
  })
})

export const generationFailedEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('generation.failed'),
  data: z.object({
    taskId: z.string().min(1),
    nodeId: z.string().optional(),
    projectId: z.string().nullable().optional(),
    type: generationTaskTypeSchema,
    message: z.string().min(1),
    retryable: z.boolean().optional()
  })
})

export const agentRunCompletedEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('agent.run.completed'),
  data: z.object({
    runId: z.string().min(1),
    traceId: z.string().optional(),
    projectId: z.string().nullable().optional(),
    status: z.enum(['succeeded', 'completed', 'failed'])
  })
})

export const agentRunFailedEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('agent.run.failed'),
  data: z.object({
    runId: z.string().min(1),
    traceId: z.string().optional(),
    message: z.string().min(1),
    retryable: z.boolean().optional()
  })
})

export const agentRunCancelledEventSchema = eventEnvelopeBaseSchema.extend({
  eventType: z.literal('agent.run.cancelled'),
  data: z.object({
    runId: z.string().min(1),
    traceId: z.string().optional(),
    reason: z.string().optional()
  })
})

export const canvasEventSchema = z.discriminatedUnion('eventType', [
  generationCompletedEventSchema,
  generationFailedEventSchema,
  agentRunCompletedEventSchema,
  agentRunFailedEventSchema,
  agentRunCancelledEventSchema
])

/** 所有可路由事件类型的枚举（用于 webhook 订阅过滤、入站校验）。 */
export const canvasEventTypeSchema = z.enum([
  'generation.completed',
  'generation.failed',
  'agent.run.completed',
  'agent.run.failed',
  'agent.run.cancelled'
])

export type GenerationCompletedEvent = z.infer<
  typeof generationCompletedEventSchema
>
export type GenerationFailedEvent = z.infer<typeof generationFailedEventSchema>
export type AgentRunCompletedEvent = z.infer<
  typeof agentRunCompletedEventSchema
>
export type AgentRunFailedEvent = z.infer<typeof agentRunFailedEventSchema>
export type AgentRunCancelledEvent = z.infer<
  typeof agentRunCancelledEventSchema
>
export type CanvasEvent = z.infer<typeof canvasEventSchema>
export type CanvasEventType = z.infer<typeof canvasEventTypeSchema>
