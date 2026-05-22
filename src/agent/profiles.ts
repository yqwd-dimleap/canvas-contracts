import { z } from 'zod'

export const agentProfileTaskSchema = z.enum([
  'chat',
  'canvas-plan',
  'prompt-director',
  'video-director',
  'critic',
  'repair'
])

export const agentModelProviderSchema = z.enum(['openai', 'gateway'])

export const agentModelProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  task: agentProfileTaskSchema,
  provider: agentModelProviderSchema.default('gateway'),
  model: z.string().min(1),
  fallbackModels: z.array(z.string()).default([]),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().int().positive().optional(),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
})

export const agentProfileSummarySchema = agentModelProfileSchema.pick({
  id: true,
  task: true,
  model: true,
  temperature: true
})

export type AgentProfileTask = z.infer<typeof agentProfileTaskSchema>
export type AgentModelProvider = z.infer<typeof agentModelProviderSchema>
export type AgentModelProfile = z.infer<typeof agentModelProfileSchema>
export type AgentProfileSummary = z.infer<typeof agentProfileSummarySchema>
