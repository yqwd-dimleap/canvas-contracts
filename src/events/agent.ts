/**
 * Agent 事件类型
 */

import { z } from 'zod'
import { canvasAgentSuggestionsSchema } from '../agent/suggestions.js'
import { baseEventSchema } from './base.js'

/**
 * Agent 思考事件
 */
export const agentThinkingEventSchema = baseEventSchema.extend({
  type: z.literal('agent.thinking'),
  agentId: z.string().describe('Agent ID'),
  agentName: z.string().describe('Agent 名称'),
  thought: z.string().describe('思考内容'),
  reasoning: z.string().optional().describe('推理过程')
})

export type AgentThinkingEvent = z.infer<typeof agentThinkingEventSchema>

/**
 * Agent 切换事件
 */
export const agentSwitchEventSchema = baseEventSchema.extend({
  type: z.literal('agent.switch'),
  fromAgentId: z.string().optional(),
  toAgentId: z.string(),
  toAgentName: z.string(),
  reason: z.string().optional()
})

export type AgentSwitchEvent = z.infer<typeof agentSwitchEventSchema>

/**
 * Agent 中断事件（Agent 主动中断）
 */
export const agentInterruptEventSchema = baseEventSchema.extend({
  type: z.literal('agent.interrupt'),
  agentId: z.string(),
  reason: z.string(),
  needsUserInput: z.boolean().default(false),
  metadata: z
    .object({
      suggestions: canvasAgentSuggestionsSchema.optional()
    })
    .catchall(z.unknown())
    .optional()
})

export type AgentInterruptEvent = z.infer<typeof agentInterruptEventSchema>

/**
 * Token / 内容 delta 事件
 */
export const tokenDeltaEventSchema = baseEventSchema.extend({
  type: z.literal('token.delta'),
  tokenId: z.string().optional().describe('Token 流 ID'),
  delta: z.string().describe('增量内容'),
  artifactId: z.string().optional().describe('关联 Artifact ID')
})

export type TokenDeltaEvent = z.infer<typeof tokenDeltaEventSchema>

/**
 * Token / 内容完成事件
 */
export const tokenCompleteEventSchema = baseEventSchema.extend({
  type: z.literal('token.complete'),
  tokenId: z.string().optional().describe('Token 流 ID'),
  content: z.string().describe('完整内容'),
  artifactId: z.string().optional().describe('关联 Artifact ID'),
  tokenUsage: z
    .object({
      prompt: z.number(),
      completion: z.number(),
      total: z.number()
    })
    .optional()
})

export type TokenCompleteEvent = z.infer<typeof tokenCompleteEventSchema>

/**
 * Agent 事件联合类型
 */
export const agentEventSchema = z.discriminatedUnion('type', [
  agentThinkingEventSchema,
  agentSwitchEventSchema,
  agentInterruptEventSchema,
  tokenDeltaEventSchema,
  tokenCompleteEventSchema
])

export type AgentEvent =
  | AgentThinkingEvent
  | AgentSwitchEvent
  | AgentInterruptEvent
  | TokenDeltaEvent
  | TokenCompleteEvent
