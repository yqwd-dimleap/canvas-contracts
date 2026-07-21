import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  nullableTimestampSchema,
  timestampSchema
} from '../shared/timestamp.js'

/**
 * 计费相关 schema（user_billing / usage_event）。
 *
 * 单一真相源：前端（Next 路由 + 充值/订阅 webhook）与 canvas-agent（生成扣费）
 * 共读写同一 Mongo app 库的这两个集合，schema 收敛到此处，避免二次定义。
 *
 * 时间戳统一 epoch 毫秒（number），见 ../shared/timestamp。
 */

/** user_billing：用户额度与套餐状态。文档 _id = userId（agent repo 映射为 id）。 */
export const userBillingSchema = z.object({
  id: z.string().min(1),
  plan: z.string().default('free'),
  status: z.string().default('active'),
  credits: z.number().default(0),
  monthlyCreditLimit: z.number().default(100),
  renewsAt: nullableTimestampSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export type UserBilling = z.infer<typeof userBillingSchema>

/** usage_event 事件类型。 */
export const usageEventTypeSchema = z.enum([
  'chat.completion',
  'agent.chat',
  'canvas.run',
  'prompt.improve',
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

/** 可配置的非模型固定操作。模型调用由 model_providers.models[].pricing 控制。 */
export const creditOperationIdSchema = z.enum([
  'agent.chat',
  'canvas.run',
  'prompt.improve'
])

export type CreditOperationId = z.infer<typeof creditOperationIdSchema>

export const creditOperationConfigSchema = z.object({
  id: creditOperationIdSchema,
  label: z.string().min(1),
  description: z.string().default(''),
  credits: z.number().min(0).default(1),
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export type CreditOperationConfig = z.infer<typeof creditOperationConfigSchema>

/**
 * 计费面向前端的业务端点响应 schema。
 *
 * 以 canvas-agent billing 路由的实际返回为准（serializeBilling / normalizeOrder /
 * normalizeUsageEvent），时间戳这里保持后端产出的 ISO 字符串，不做 epoch 归一，
 * 因为前端计费 UI 直接展示字符串。协议绑定的支付回调（Stripe webhook / 微信 notify）
 * 不属于业务端点，无 schema。
 */

/** 用户额度快照：serializeBilling 的产出（不含 metadata/时间戳等实体字段）。 */
export const billingSnapshotSchema = z.object({
  plan: z.string(),
  status: z.string(),
  credits: z.number(),
  monthlyCreditLimit: z.number(),
  renewsAt: z.string().nullable()
})

export type BillingSnapshot = z.infer<typeof billingSnapshotSchema>

/** usage_event 面向前端的一行流水：normalizeUsageEvent 的产出（createdAt 为 ISO）。 */
export const usageEventRowSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  type: z.string(),
  modelId: z.string().nullable(),
  provider: z.string().nullable(),
  credits: z.number(),
  costCents: z.number(),
  requestId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string()
})

export type UsageEventRow = z.infer<typeof usageEventRowSchema>

/** 支付方式（面向前端的公开视图）：listPublicPaymentMethodsForUser 的单项。 */
export const publicPaymentMethodSchema = z.object({
  provider: z.enum(['stripe', 'wechat', 'alipay', 'apple_pay']),
  displayName: z.string(),
  checkoutReady: z.boolean(),
  publishableKey: z.string().optional(),
  wechatReadiness: z.object({ blockers: z.array(z.string()) }).optional()
})

export type PublicPaymentMethod = z.infer<typeof publicPaymentMethodSchema>

/** 订单状态（展示型枚举，容忍未知取值降级为 unknown）。 */
export const paymentOrderStatusSchema = z
  .enum([
    'pending',
    'fulfilling',
    'paid',
    'expired',
    'cancelled',
    'failed',
    'unknown'
  ])
  .catch('unknown')

/** 支付订单（面向前端）：normalizeOrder 的产出，时间戳为 ISO 字符串。 */
export const paymentOrderSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  planId: z.string().optional(),
  orderKind: z.enum(['subscription', 'credit_pack']).optional(),
  creditPackId: z.string().optional(),
  grantCredits: z.number().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  provider: z.string().optional(),
  status: paymentOrderStatusSchema.optional(),
  qrCodeUrl: z.string().optional(),
  checkoutUrl: z.string().optional(),
  expiresAt: z.string().optional(),
  paidAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  wechatTransactionId: z.string().optional(),
  stripeSessionId: z.string().optional(),
  stripeInvoiceId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  fulfillError: z.string().optional()
})

export type PaymentOrder = z.infer<typeof paymentOrderSchema>

/** GET /api/billing/me —— 当前用户额度快照。 */
export const billingMeApiResponseSchema = apiSuccessResponseSchema(
  z.object({ billing: billingSnapshotSchema })
)

/** GET /api/billing/usage-events —— 用量流水列表。 */
export const billingUsageEventsApiResponseSchema = apiSuccessResponseSchema(
  z.object({ events: z.array(usageEventRowSchema) })
)

/** GET /api/billing/payment-options —— 可用支付方式与本地开关。 */
export const paymentOptionsApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    methods: z.array(publicPaymentMethodSchema),
    localSubscribeEnabled: z.boolean()
  })
)

/** GET /api/billing/orders —— 用户订单列表。 */
export const billingOrdersApiResponseSchema = apiSuccessResponseSchema(
  z.object({ orders: z.array(paymentOrderSchema) })
)

/** POST /api/billing/create-checkout-session —— Stripe checkout URL。 */
export const createCheckoutSessionApiResponseSchema = apiSuccessResponseSchema(
  z.object({ url: z.string() })
)

/** POST /api/billing/wechat/create-order —— 微信 Native 下单结果。 */
export const wechatCreateOrderApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    orderId: z.string(),
    qrCodeUrl: z.string(),
    amount: z.number(),
    expiresAt: z.string().optional(),
    reused: z.boolean().optional()
  })
)

/** POST /api/billing/cancel-order & /wechat/cancel-order —— 取消结果。 */
export const cancelOrderApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    orderId: z.string(),
    status: paymentOrderStatusSchema
  })
)

/** GET /api/billing/wechat/order-status —— 订单最新状态。 */
export const wechatOrderStatusApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    orderId: z.string(),
    status: paymentOrderStatusSchema,
    amount: z.number().optional(),
    planId: z.string().optional(),
    createdAt: z.string().optional(),
    paidAt: z.string().nullish()
  })
)

/** POST /api/billing/local-subscribe & /local-credit-pack —— 本地授予结果。 */
export const localBillingGrantApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    billing: billingSnapshotSchema,
    grantedCredits: z.number()
  })
)
