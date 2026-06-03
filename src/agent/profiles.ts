import { z } from 'zod'

export const agentProfileTaskSchema = z.enum([
  'chat',
  'canvas-plan',
  'prompt-director',
  'video-director',
  'critic',
  'repair'
])

export const agentModelProviderSchema = z.enum([
  'openai',
  'gateway',
  'anthropic',
  'azure',
  'custom'
])

export const modelProviderModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  creditsPerImage: z.number().min(0).default(1),
  costCentsPerImage: z.number().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export const modelProviderSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  models: z.array(modelProviderModelSchema).default([]),
  apiConfig: z
    .object({
      baseUrl: z.string().optional(),
      authType: z.enum(['bearer', 'api-key', 'custom']).optional()
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number()
})

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
export type ModelProviderModel = z.infer<typeof modelProviderModelSchema>
export type ModelProvider = z.infer<typeof modelProviderSchema>
