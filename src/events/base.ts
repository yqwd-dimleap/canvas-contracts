/**
 * 事件系统基础类型
 * Canvas v2 架构核心：所有交互都是事件
 */

import { z } from 'zod'

/**
 * 事件基类 Schema
 */
export const baseEventSchema = z.object({
  id: z.string().describe('事件唯一标识'),
  type: z.string().describe('事件类型'),
  timestamp: z.iso.datetime().describe('事件时间戳 (ISO 8601)'),
  runId: z.string().describe('运行 ID'),
  sessionId: z.string().optional().describe('会话 ID'),
  taskId: z.string().optional().describe('任务 ID'),
  agentId: z.string().optional().describe('Agent ID'),
  parentAgentId: z.string().optional().describe('父 Agent ID'),
  toolCallId: z.string().optional().describe('工具调用 ID'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('事件元数据')
})

/**
 * 事件基类接口
 */
export type BaseEvent = z.infer<typeof baseEventSchema>

/**
 * 事件过滤器
 */
export const eventFilterSchema = z.object({
  runId: z.string().optional(),
  types: z.array(z.string()).optional(),
  fromSeq: z.number().optional(),
  toSeq: z.number().optional()
})

export type EventFilter = z.infer<typeof eventFilterSchema>

/**
 * 事件类型守卫
 */
export function isEvent(value: unknown): value is BaseEvent {
  return baseEventSchema.safeParse(value).success
}

/**
 * 事件序列号包装
 */
export interface SequencedEvent<T extends BaseEvent = BaseEvent> {
  seq: number
  event: T
}
