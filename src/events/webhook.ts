import { z } from 'zod'
import {
  nullableTimestampSchema,
  timestampSchema
} from '../shared/timestamp.js'
import { canvasEventSchema, canvasEventTypeSchema } from './events.js'

/**
 * Webhook 出站投递契约（webhook_deliveries 集合 + 端点配置）。
 *
 * 设计为 MongoDB 起步的持久化投递队列：发送方把事件包成 {@link canvasEventSchema}
 * 入队为一条 delivery（status=pending），后台 worker 轮询投递、按指数退避重试，
 * 超过上限转 dead。Mongo 层时间戳用 epoch 毫秒（见 ../shared/timestamp）。
 *
 * 签名：每个端点独立 secret，HMAC-SHA256 over `${timestamp}.${rawBody}`，
 * 配合时间戳头防重放（沿用 billing Stripe webhook 的验签思路）。
 */

/** 投递目标头：与 frontend/agent 的入站验签实现保持一致。 */
export const WEBHOOK_SIGNATURE_HEADER = 'x-canvas-webhook-signature' as const
export const WEBHOOK_TIMESTAMP_HEADER = 'x-canvas-webhook-timestamp' as const
export const WEBHOOK_ID_HEADER = 'x-canvas-webhook-id' as const
export const WEBHOOK_EVENT_TYPE_HEADER = 'x-canvas-webhook-event' as const

/** 单次投递的状态机。 */
export const webhookDeliveryStatusSchema = z.enum([
  'pending',
  'delivered',
  'failed',
  'dead'
])

/** Webhook 端点配置：投递目标地址 + 订阅过滤 + 签名密钥。 */
export const webhookEndpointSchema = z.object({
  id: z.string().min(1),
  /** 目标地址。外部 webhook 使用绝对 URL；内部端点需配置真实可访问地址。 */
  url: z.string().min(1),
  /** 订阅的事件类型；空数组表示订阅全部。 */
  eventTypes: z.array(canvasEventTypeSchema).default([]),
  /** HMAC 签名密钥。内部端点可省略（改用 internal token）。 */
  secret: z.string().min(1).optional(),
  /** 是否为内部端点（agent↔frontend，走 internal token 而非 HMAC）。 */
  internal: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const webhookRetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).default(6),
  /** 退避基数（毫秒）：第 n 次重试延迟 ≈ baseDelayMs * 2^(n-1)。 */
  baseDelayMs: z.number().int().min(100).default(2000),
  maxDelayMs: z.number().int().min(1000).default(600_000)
})

/** 一条投递记录。 */
export const webhookDeliverySchema = z.object({
  id: z.string().min(1),
  /** 信封 eventId，承担幂等键；建唯一索引避免同一事件重复入队。 */
  eventId: z.string().min(1),
  eventType: canvasEventTypeSchema,
  endpointId: z.string().min(1),
  url: z.string().min(1),
  internal: z.boolean().default(false),
  /** 完整事件信封，投递时直接作为请求体序列化。 */
  payload: canvasEventSchema,
  status: webhookDeliveryStatusSchema.default('pending'),
  attempts: z.number().int().min(0).default(0),
  /** 下次可投递时间（epoch ms）；worker 据此挑选到期任务。 */
  nextAttemptAt: timestampSchema,
  /** 多实例抢占用：worker 取走任务时打租约，过期可被其他实例重取。 */
  leaseUntil: nullableTimestampSchema.optional(),
  lastStatusCode: z.number().int().optional(),
  lastError: z.string().optional(),
  deliveredAt: nullableTimestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export type WebhookDeliveryStatus = z.infer<typeof webhookDeliveryStatusSchema>
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>
export type WebhookRetryPolicy = z.infer<typeof webhookRetryPolicySchema>
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>
