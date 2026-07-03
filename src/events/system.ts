/**
 * 系统事件类型
 */

import { z } from 'zod'
import { baseEventSchema } from './base.js'

/**
 * 心跳事件
 */
export const heartbeatEventSchema = baseEventSchema.extend({
  type: z.literal('system.heartbeat'),
  serverTime: z.iso.datetime()
})

export type HeartbeatEvent = z.infer<typeof heartbeatEventSchema>

/**
 * 重连事件
 */
export const reconnectEventSchema = baseEventSchema.extend({
  type: z.literal('system.reconnect'),
  lastSeq: z.number().optional()
})

export type ReconnectEvent = z.infer<typeof reconnectEventSchema>

/**
 * 同步事件
 */
export const syncEventSchema = baseEventSchema.extend({
  type: z.literal('system.sync'),
  fromSeq: z.number().optional(),
  toSeq: z.number().optional()
})

export type SyncEvent = z.infer<typeof syncEventSchema>

/**
 * 恢复事件
 */
export const resumeEventSchema = baseEventSchema.extend({
  type: z.literal('system.resume'),
  fromSeq: z.number().optional()
})

export type ResumeEvent = z.infer<typeof resumeEventSchema>

/**
 * 系统错误事件
 */
export const systemErrorEventSchema = baseEventSchema.extend({
  type: z.literal('system.error'),
  error: z.object({
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean().default(false)
  })
})

export type SystemErrorEvent = z.infer<typeof systemErrorEventSchema>

/**
 * 系统控制事件联合类型
 */
export const systemControlEventSchema = z.discriminatedUnion('type', [
  heartbeatEventSchema,
  reconnectEventSchema,
  syncEventSchema,
  resumeEventSchema,
  systemErrorEventSchema
])

export type SystemControlEvent =
  | HeartbeatEvent
  | ReconnectEvent
  | SyncEvent
  | ResumeEvent
  | SystemErrorEvent
