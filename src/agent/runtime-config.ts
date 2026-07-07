import { z } from 'zod'
import { timestampSchema } from '../shared/timestamp.js'

export const AGENT_RUNTIME_CONFIG_ID = 'canvas-agent-runtime' as const

export const agentRuntimeConfigSchema = z.object({
  id: z.literal(AGENT_RUNTIME_CONFIG_ID),
  provider: z.literal('gateway').default('gateway'),
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().positive().nullable().default(null),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const agentRuntimeConfigViewSchema = agentRuntimeConfigSchema.extend({
  configured: z.boolean().default(false),
  fallbackModel: z.string().trim().min(1)
})

export const updateAgentRuntimeConfigRequestSchema = z.object({
  model: z.string().trim().min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().nullable().optional()
})

export type AgentRuntimeConfig = z.infer<typeof agentRuntimeConfigSchema>
export type AgentRuntimeConfigView = z.infer<
  typeof agentRuntimeConfigViewSchema
>
export type UpdateAgentRuntimeConfigRequest = z.infer<
  typeof updateAgentRuntimeConfigRequestSchema
>
