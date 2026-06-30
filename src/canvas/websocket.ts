import { z } from 'zod'
import { canvasOperationSchema } from '../canvas/operations.js'
import { canvasContextSchema } from './context.js'

/**
 * WebSocket 消息协议 - 双向通信
 *
 * 支持场景：
 * 1. Agent 主动请求最新画布快照
 * 2. 用户手动编辑时通知 Agent
 * 3. 实时协作（未来扩展）
 */

// ========== Client → Server 消息 ==========

/**
 * 客户端启动 Agent 运行
 */
export const wsCanvasRunRequestSchema = z.object({
  type: z.literal('canvas.run'),
  payload: z.object({
    runId: z.string().optional(), // 可选，用于恢复运行
    projectId: z.string().nullable().optional(),
    profileId: z.string().optional(),
    locale: z.string().optional(),
    intent: z.string().min(1),
    canvas: canvasContextSchema,
    selection: z.object({
      nodeIds: z.array(z.string()).default([]),
      resourceIds: z.array(z.string()).default([])
    }),
    skillId: z.string().optional(),
    thinkingEnabled: z.boolean().optional(),
    reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
    conversation: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
          createdAt: z.number()
        })
      )
      .optional(),
    attachments: z
      .array(
        z.object({
          id: z.string(),
          type: z.enum(['image', 'video', 'file']),
          url: z.string().optional(),
          data: z.string().optional(), // base64 or data URL
          mimeType: z.string().optional(),
          name: z.string().optional()
        })
      )
      .optional()
  })
})

/**
 * 客户端响应快照请求
 */
export const wsCanvasSnapshotResponseSchema = z.object({
  type: z.literal('canvas.snapshot.response'),
  payload: z.object({
    requestId: z.string(),
    canvas: canvasContextSchema,
    timestamp: z.number()
  })
})

/**
 * 客户端通知用户手动编辑
 */
export const wsCanvasUserEditSchema = z.object({
  type: z.literal('canvas.user.edit'),
  payload: z.object({
    operation: canvasOperationSchema,
    timestamp: z.number()
  })
})

/**
 * 客户端取消运行
 */
export const wsCanvasCancelSchema = z.object({
  type: z.literal('canvas.cancel'),
  payload: z.object({
    runId: z.string(),
    reason: z.string().optional()
  })
})

/**
 * 客户端暂停运行
 */
export const wsCanvasPauseSchema = z.object({
  type: z.literal('canvas.pause'),
  payload: z.object({
    runId: z.string()
  })
})

/**
 * 客户端恢复运行
 */
export const wsCanvasResumeSchema = z.object({
  type: z.literal('canvas.resume'),
  payload: z.object({
    runId: z.string()
  })
})

export const wsClientMessageSchema = z.discriminatedUnion('type', [
  wsCanvasRunRequestSchema,
  wsCanvasSnapshotResponseSchema,
  wsCanvasUserEditSchema,
  wsCanvasCancelSchema,
  wsCanvasPauseSchema,
  wsCanvasResumeSchema
])

// ========== Server → Client 消息 ==========

/**
 * 服务器请求画布快照
 */
export const wsCanvasSnapshotRequestSchema = z.object({
  type: z.literal('canvas.snapshot.request'),
  payload: z.object({
    requestId: z.string(),
    runId: z.string(),
    reason: z.enum(['user_edit', 'agent_query', 'context_sync']).optional()
  })
})

/**
 * 服务器推送操作
 */
export const wsCanvasOperationSchema = z.object({
  type: z.literal('canvas.operation'),
  payload: z.object({
    operation: canvasOperationSchema,
    transient: z.boolean().default(false),
    sequence: z.number().optional()
  })
})

/**
 * 服务器推送 Agent 事件（复用现有的 SSE 事件）
 */
export const wsAgentEventSchema = z.object({
  type: z.literal('agent.event'),
  payload: z.object({
    event: z.string(),
    data: z.unknown()
  })
})

/**
 * 服务器确认运行已启动
 */
export const wsRunStartedSchema = z.object({
  type: z.literal('run.started'),
  payload: z.object({
    runId: z.string(),
    traceId: z.string().optional()
  })
})

/**
 * 服务器通知运行状态变化
 */
export const wsRunStatusSchema = z.object({
  type: z.literal('run.status'),
  payload: z.object({
    runId: z.string(),
    status: z.enum([
      'queued',
      'running',
      'paused',
      'completed',
      'failed',
      'cancelled'
    ]),
    message: z.string().optional()
  })
})

/**
 * 服务器错误
 */
export const wsErrorSchema = z.object({
  type: z.literal('error'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
})

export const wsServerMessageSchema = z.discriminatedUnion('type', [
  wsCanvasSnapshotRequestSchema,
  wsCanvasOperationSchema,
  wsAgentEventSchema,
  wsRunStartedSchema,
  wsRunStatusSchema,
  wsErrorSchema
])

// ========== TypeScript 类型导出 ==========

export type WsCanvasRunRequest = z.infer<typeof wsCanvasRunRequestSchema>
export type WsCanvasSnapshotResponse = z.infer<
  typeof wsCanvasSnapshotResponseSchema
>
export type WsCanvasUserEdit = z.infer<typeof wsCanvasUserEditSchema>
export type WsCanvasCancel = z.infer<typeof wsCanvasCancelSchema>
export type WsCanvasPause = z.infer<typeof wsCanvasPauseSchema>
export type WsCanvasResume = z.infer<typeof wsCanvasResumeSchema>
export type WsClientMessage = z.infer<typeof wsClientMessageSchema>

export type WsCanvasSnapshotRequest = z.infer<
  typeof wsCanvasSnapshotRequestSchema
>
export type WsCanvasOperation = z.infer<typeof wsCanvasOperationSchema>
export type WsAgentEvent = z.infer<typeof wsAgentEventSchema>
export type WsRunStarted = z.infer<typeof wsRunStartedSchema>
export type WsRunStatus = z.infer<typeof wsRunStatusSchema>
export type WsError = z.infer<typeof wsErrorSchema>
export type WsServerMessage = z.infer<typeof wsServerMessageSchema>
