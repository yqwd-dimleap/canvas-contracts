import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  agentModelProfileSchema,
  agentProfileSummarySchema
} from './profiles.js'

/**
 * Agent Chat Request
 * 通用 Agent 对话请求
 */
export const agentChatRequestSchema = z.object({
  message: z.string().min(1),
  profileId: z.string().optional()
})

/**
 * 聊天消息内容：网关/LangChain 返回的 content 既可能是纯文本，
 * 也可能是多模态片段数组（{ type, text, ... }）。两者都要能通过校验。
 */
export const chatMessageContentSchema = z.union([
  z.string(),
  z.array(z.record(z.string(), z.unknown()))
])

/**
 * 单条聊天消息。底层透传 LangChain `BaseMessage`，对象上挂有内部字段，
 * 因此用 `.loose()` 容纳额外键，只对 content 做约束（role 可选）。
 */
export const agentChatMessageSchema = z
  .object({
    role: z.string().optional(),
    content: chatMessageContentSchema
  })
  .loose()

/**
 * Agent Chat Response
 * 通用 Agent 对话响应
 */
export const agentChatResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    content: chatMessageContentSchema,
    messages: z.array(agentChatMessageSchema)
  })
)

/**
 * List Agent Profiles Response
 * Agent 配置列表响应
 */
export const listAgentProfilesResponseSchema = apiSuccessResponseSchema(
  z.object({
    profiles: z.array(agentModelProfileSchema)
  })
)

export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>
export type AgentChatMessage = z.infer<typeof agentChatMessageSchema>
export type AgentChatResponse = z.infer<typeof agentChatResponseSchema>
export type ListAgentProfilesResponse = z.infer<
  typeof listAgentProfilesResponseSchema
>
