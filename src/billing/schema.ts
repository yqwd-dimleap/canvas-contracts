import { z } from 'zod'

/**
 * 计费相关 schema（user_billing / usage_event）。
 *
 * 单一真相源：前端（Next 路由 + 充值/订阅 webhook）与 canvas-agent（生成扣费）
 * 共读写同一 Mongo app 库的这两个集合，schema 收敛到此处，避免二次定义。
 *
 * 时间戳统一 epoch 毫秒（number）。兼容历史/跨服务写入的 BSON Date
 * （前端旧 Mongo repo 曾写 Date），读取时归一为 number。
 */
const timestampSchema = z.preprocess(
  (value) => (value instanceof Date ? value.getTime() : value),
  z.number()
)

/** user_billing：用户额度与套餐状态。文档 _id = userId（agent repo 映射为 id）。 */
export const userBillingSchema = z.object({
  id: z.string().min(1),
  plan: z.string().default('free'),
  status: z.string().default('active'),
  credits: z.number().default(0),
  monthlyCreditLimit: z.number().default(100),
  renewsAt: z.preprocess(
    (v) => (v instanceof Date ? v.getTime() : v),
    z.number().nullable()
  ),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export type UserBilling = z.infer<typeof userBillingSchema>

/** usage_event 事件类型。 */
export const usageEventTypeSchema = z.enum([
  'image.generation',
  'image.edit',
  'video.generation',
  'billing.credit_grant',
  'billing.payment_settled'
])

export type UsageEventType = z.infer<typeof usageEventTypeSchema>

/** usage_event：一次计费动作的流水。 */
export const usageEventSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  type: z.string(),
  modelId: z.string().nullable().default(null),
  provider: z.string().nullable().default(null),
  credits: z.number().default(0),
  costCents: z.number().default(0),
  requestId: z.string().nullable().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export type UsageEvent = z.infer<typeof usageEventSchema>

/** 生成可用的计费状态集合（生成扣费前校验）。 */
export const GENERATION_ALLOWED_STATUSES = ['active', 'trialing'] as const
