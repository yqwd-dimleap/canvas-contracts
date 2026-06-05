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

/**
 * 模型类别（按网关返回的模型列表做归类）。
 * 后台用于将导入的模型分到 image / video / chat / embedding / audio / other，
 * 也是 node_type_models 配置中“某类节点可用哪些模型”的映射键。
 *
 * 前端 helpers 的 ModelCategoryId 收敛到此枚举（单一真相源）。
 */
export const modelCategorySchema = z.enum([
  'image',
  'video',
  'chat',
  'embedding',
  'audio',
  'other'
])

/** 模型类别的稳定顺序（UI 分组/迭代用）。顺序即枚举声明顺序。 */
export const MODEL_CATEGORIES = modelCategorySchema.options

/**
 * 时间戳：统一以 epoch 毫秒（number）表示。
 * 兼容历史/跨服务写入的 BSON Date（前端 Mongo repo 曾写入 Date），
 * 读取时强制归一为 number，避免 `expected number, received Date`。
 */
const timestampSchema = z.preprocess(
  (value) => (value instanceof Date ? value.getTime() : value),
  z.number()
)

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
  createdAt: timestampSchema,
  updatedAt: timestampSchema
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
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const agentProfileSummarySchema = agentModelProfileSchema.pick({
  id: true,
  task: true,
  model: true,
  temperature: true
})

export type AgentProfileTask = z.infer<typeof agentProfileTaskSchema>
export type AgentModelProvider = z.infer<typeof agentModelProviderSchema>
export type ModelCategory = z.infer<typeof modelCategorySchema>
export type AgentModelProfile = z.infer<typeof agentModelProfileSchema>
export type AgentProfileSummary = z.infer<typeof agentProfileSummarySchema>
export type ModelProviderModel = z.infer<typeof modelProviderModelSchema>
export type ModelProvider = z.infer<typeof modelProviderSchema>
