import { z } from 'zod'
import { baseEventSchema } from './base.js'

/**
 * 工具开始事件
 */
export const toolStartEventSchema = baseEventSchema.extend({
  type: z.literal('tool.start'),
  toolId: z.string().describe('工具执行 ID'),
  toolName: z.string().describe('工具名称'),
  input: z.record(z.string(), z.unknown()).describe('工具输入参数'),
  agentId: z.string().optional()
})

export type ToolStartEvent = z.infer<typeof toolStartEventSchema>

/**
 * 工具进度事件
 */
export const toolProgressEventSchema = baseEventSchema.extend({
  type: z.literal('tool.progress'),
  toolId: z.string(),
  progress: z.number().min(0).max(1).describe('进度 (0-1)'),
  message: z.string().optional().describe('进度描述'),
  stage: z.string().optional().describe('当前阶段')
})

export type ToolProgressEvent = z.infer<typeof toolProgressEventSchema>

/**
 * 工具结果事件
 */
export const toolResultEventSchema = baseEventSchema.extend({
  type: z.literal('tool.result'),
  toolId: z.string(),
  result: z.unknown().describe('工具输出结果'),
  durationMs: z.number()
})

export type ToolResultEvent = z.infer<typeof toolResultEventSchema>

/**
 * 工具错误事件
 */
export const toolErrorEventSchema = baseEventSchema.extend({
  type: z.literal('tool.error'),
  toolId: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().default(false)
  })
})

export type ToolErrorEvent = z.infer<typeof toolErrorEventSchema>

/**
 * 工具事件联合类型
 */
export const toolEventSchema = z.discriminatedUnion('type', [
  toolStartEventSchema,
  toolProgressEventSchema,
  toolResultEventSchema,
  toolErrorEventSchema
])

export type ToolEvent =
  | ToolStartEvent
  | ToolProgressEvent
  | ToolResultEvent
  | ToolErrorEvent
