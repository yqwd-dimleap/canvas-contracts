import { z } from 'zod'
import {
  canvasEdgeSnapshotSchema,
  canvasNodeSnapshotSchema
} from './context.js'

/**
 * Canvas Agent State
 * Agent 运行时的画布状态（包含节点、边、选中状态）
 */
export const canvasAgentStateSchema = z.object({
  nodes: z.array(canvasNodeSnapshotSchema).default([]),
  edges: z.array(canvasEdgeSnapshotSchema).default([]),
  selectedNodeId: z.string().nullable().optional()
})

/**
 * Chat Message
 * Agent 对话消息格式
 */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
})

/**
 * Canvas Session
 * Agent 会话上下文（对话历史、最后操作节点）
 */
export const canvasSessionSchema = z.object({
  sessionId: z.string(),
  chatHistory: z.array(chatMessageSchema).default([]),
  lastCreatedNodeId: z.string().nullable(),
  lastModifiedNodeId: z.string().nullable()
})

export type CanvasAgentState = z.infer<typeof canvasAgentStateSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type CanvasSession = z.infer<typeof canvasSessionSchema>
