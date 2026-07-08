import { z } from 'zod'

/**
 * 统一事件信封（cross-service event envelope）。
 *
 * 单一真相源：canvas-agent 与 canvas-frontend 之间的所有异步事件
 * （webhook 出站、agent→frontend 内部回调、frontend→agent 接收）都包成这一信封，
 * 再按 {@link canvasEventSchema} 的 `eventType` 携带各自的 `data`。
 *
 * - 信封流经 HTTP body（JSON），时间戳用 ISO 8601 字符串（与 agent/canvas-run-state.ts 的
 *   运行时事件保持一致），而非 Mongo 层的 epoch 毫秒。
 * - `eventId` 是投递与去重的幂等键，发送方生成，接收方据此防重放。
 */

/** 事件来源服务。决定签名密钥与回调路由。 */
export const eventSourceSchema = z.enum(['canvas-agent', 'canvas-frontend'])

export const eventEnvelopeBaseSchema = z.object({
  /** 幂等键：发送方生成的唯一 id（建议 uuid）。接收方据此去重。 */
  eventId: z.string().min(1),
  /** 点分 webhook 事件类型，如 `generation.completed`、`billing.updated`。 */
  eventType: z.string().min(1),
  /** 事件实际发生时间（ISO 8601）。 */
  occurredAt: z.string().min(1),
  /** 发出该事件的服务。 */
  source: eventSourceSchema,
  /** 事件归属用户（用于内部回调时的 impersonation 与多租户隔离）。 */
  userId: z.string().min(1),
  /** 关联 id：贯穿一次 run/task 的链路追踪标识。 */
  correlationId: z.string().min(1).optional()
})

export type EventSource = z.infer<typeof eventSourceSchema>
export type EventEnvelopeBase = z.infer<typeof eventEnvelopeBaseSchema>
