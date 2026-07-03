/**
 * 运行时事件类型
 */

import { z } from 'zod'
import { baseEventSchema } from './base.js'

/**
 * Run 启动事件
 */
export const runStartedEventSchema = baseEventSchema.extend({
  type: z.literal('run.started'),
  intent: z.string().describe('用户意图'),
  mode: z.enum(['plan', 'execute', 'plan-execute']).describe('运行模式'),
  userId: z.string().optional(),
  projectId: z.string().optional()
})

export type RunStartedEvent = z.infer<typeof runStartedEventSchema>

/**
 * Run 完成事件
 */
export const runCompletedEventSchema = baseEventSchema.extend({
  type: z.literal('run.completed'),
  artifactIds: z.array(z.string()).describe('生成的 Artifact IDs'),
  durationMs: z.number().describe('运行时长（毫秒）'),
  stats: z
    .object({
      tokenUsage: z.number().optional(),
      toolCalls: z.number().optional(),
      eventsEmitted: z.number().optional()
    })
    .optional()
})

export type RunCompletedEvent = z.infer<typeof runCompletedEventSchema>

/**
 * Run 失败事件
 */
export const runFailedEventSchema = baseEventSchema.extend({
  type: z.literal('run.failed'),
  error: z.object({
    code: z.string(),
    message: z.string(),
    stack: z.string().optional()
  }),
  durationMs: z.number()
})

export type RunFailedEvent = z.infer<typeof runFailedEventSchema>

/**
 * Run 取消事件
 */
export const runCancelledEventSchema = baseEventSchema.extend({
  type: z.literal('run.cancelled'),
  reason: z.string().optional(),
  cancelledBy: z.enum(['user', 'system', 'timeout'])
})

export type RunCancelledEvent = z.infer<typeof runCancelledEventSchema>

/**
 * 运行时事件联合类型
 */
export const runtimeEventSchema = z.discriminatedUnion('type', [
  runStartedEventSchema,
  runCompletedEventSchema,
  runFailedEventSchema,
  runCancelledEventSchema
])

export type RuntimeEvent =
  | RunStartedEvent
  | RunCompletedEvent
  | RunFailedEvent
  | RunCancelledEvent
