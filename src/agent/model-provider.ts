import { z } from 'zod'
import { timestampSchema } from '../shared/timestamp.js'

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

export const modelPricingUnitSchema = z.enum([
  'token',
  'image',
  'second',
  'run'
])

export const modelReasoningEffortSchema = z.enum(['low', 'medium', 'high'])

export const modelPricingTierModeSchema = z.enum(['volume', 'graduated'])

export const modelPricingTierSchema = z.object({
  upTo: z.number().positive().nullable().default(null),
  creditsPerUnit: z.number().min(0).default(0),
  costCentsPerUnit: z.number().min(0).default(0),
  flatCredits: z.number().min(0).default(0),
  flatCostCents: z.number().min(0).default(0)
})

export const modelPricingRateSchema = z.object({
  creditsPerUnit: z.number().min(0).default(0),
  costCentsPerUnit: z.number().min(0).default(0),
  tierMode: modelPricingTierModeSchema.default('volume'),
  tiers: z.array(modelPricingTierSchema).default([])
})

const DEFAULT_PRICING_RATE = {
  creditsPerUnit: 0,
  costCentsPerUnit: 0,
  tierMode: 'volume' as const,
  tiers: []
}

export const modelPricingRatesSchema = z.object({
  inputTokens: modelPricingRateSchema.default(DEFAULT_PRICING_RATE),
  cachedInputTokens: modelPricingRateSchema.default(DEFAULT_PRICING_RATE),
  outputTokens: modelPricingRateSchema.default(DEFAULT_PRICING_RATE),
  images: modelPricingRateSchema.default(DEFAULT_PRICING_RATE),
  seconds: modelPricingRateSchema.default(DEFAULT_PRICING_RATE),
  runs: modelPricingRateSchema.default(DEFAULT_PRICING_RATE)
})

export const modelPricingRuleMatchSchema = z
  .object({
    quality: z.array(z.string().min(1)).optional(),
    resolution: z.array(z.string().min(1)).optional(),
    size: z.array(z.string().min(1)).optional(),
    aspectRatio: z.array(z.string().min(1)).optional(),
    reasoningEffort: z.array(modelReasoningEffortSchema).optional(),
    operation: z.array(z.string().min(1)).optional(),
    metadata: z.record(z.string(), z.array(z.string().min(1))).optional()
  })
  .default({})

export const modelPricingRuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  match: modelPricingRuleMatchSchema,
  unit: modelPricingUnitSchema.optional(),
  minimumCredits: z.number().min(0).optional(),
  rates: modelPricingRatesSchema.partial().default({})
})

export const modelPricingConfigSchema = z.object({
  /**
   * 对话/多模态文本通常按真实 token 用量计费；图片按图像单位，
   * 视频可按秒或按次。金额字段以 USD cent 计，token 费率的单位为每 1M tokens。
   *
   * rates 是基础费率；rules 是按请求维度（quality / resolution /
   * reasoningEffort 等）匹配的覆盖层；rate.tiers 支持 volume /
   * graduated 两种阶梯模式。
   */
  unit: modelPricingUnitSchema.default('image'),
  currency: z.string().default('USD'),
  minimumCredits: z.number().min(0).default(0),
  rates: modelPricingRatesSchema,
  rules: z.array(modelPricingRuleSchema).default([])
})

export const modelProviderModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  pricing: modelPricingConfigSchema,
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

export type ModelCategory = z.infer<typeof modelCategorySchema>
export type ModelReasoningEffort = z.infer<typeof modelReasoningEffortSchema>
export type ModelPricingUnit = z.infer<typeof modelPricingUnitSchema>
export type ModelPricingTier = z.infer<typeof modelPricingTierSchema>
export type ModelPricingRate = z.infer<typeof modelPricingRateSchema>
export type ModelPricingRates = z.infer<typeof modelPricingRatesSchema>
export type ModelPricingRuleMatch = z.infer<typeof modelPricingRuleMatchSchema>
export type ModelPricingRule = z.infer<typeof modelPricingRuleSchema>
export type ModelPricingConfig = z.infer<typeof modelPricingConfigSchema>
export type ModelProviderModel = z.infer<typeof modelProviderModelSchema>
export type ModelProvider = z.infer<typeof modelProviderSchema>
