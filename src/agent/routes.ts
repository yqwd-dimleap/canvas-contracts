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
 * Agent Chat Response
 * 通用 Agent 对话响应
 */
export const agentChatResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    content: z.unknown(),
    messages: z.array(z.unknown())
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
export type AgentChatResponse = z.infer<typeof agentChatResponseSchema>
export type ListAgentProfilesResponse = z.infer<
  typeof listAgentProfilesResponseSchema
>
