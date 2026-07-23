import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { userBillingSchema } from '../billing/schema.js'
import {
  workspaceProjectPublicationSchema,
  workspaceProjectPublicationStatusSchema,
  workspaceProjectSchema
} from '../canvas/workspace/project.js'

/**
 * Admin Business route response schemas.
 *
 * 后端 `src/routes/admin-business.ts` 的标准信封内层结构。行类型从前端下沉到
 * contracts 作为运行时校验的单一真相。展示型枚举用 `.catch(默认值)` 兜底，
 * 可选字段用 `.nullish()`，避免单条脏数据打穿整张列表。
 */

// ──────────────────────────────────────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────────────────────────────────────

export const adminUserBillingSchema = z.object({
  plan: z.string(),
  status: z.string(),
  credits: z.number(),
  monthlyCreditLimit: z.number(),
  renewsAt: z.string().nullish(),
  updatedAt: z.string().optional()
})

export const adminUserStatsSchema = z.object({
  usage30d: z.object({
    credits: z.number(),
    costCents: z.number(),
    events: z.number(),
    lastUsedAt: z.string().nullable()
  }),
  payments: z.object({
    paidOrders: z.number(),
    paidAmountFen: z.number(),
    lastPaidAt: z.string().nullable()
  })
})

export const adminUserRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string(),
  roles: z.array(z.string()),
  billing: adminUserBillingSchema.nullable(),
  stats: adminUserStatsSchema.optional()
})

export const adminUsersResponseSchema = z.object({
  users: z.array(adminUserRowSchema),
  total: z.number()
})

export const adminUserPatchResponseSchema = z.object({
  user: userBillingSchema
})

export const BILLING_PLAN_IDS = ['free', 'pro', 'team'] as const
export const USER_BILLING_STATUSES = [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused'
] as const

export const adminUserPatchRequestSchema = z
  .object({
    userId: z.string().min(1),
    credits: z.number().int().min(0).max(1_000_000_000).optional(),
    monthlyCreditLimit: z.number().int().min(0).max(1_000_000_000).optional(),
    plan: z.enum(BILLING_PLAN_IDS).optional(),
    status: z.enum(USER_BILLING_STATUSES).optional(),
    roles: z.array(z.string()).optional()
  })
  .strict()
  .superRefine((value, context) => {
    const hasPatch =
      value.credits !== undefined ||
      value.monthlyCreditLimit !== undefined ||
      value.plan !== undefined ||
      value.status !== undefined ||
      value.roles !== undefined
    if (!hasPatch) {
      context.addIssue({
        code: 'custom',
        message:
          'At least one of credits, monthlyCreditLimit, plan, status, roles is required'
      })
    }
  })

// ──────────────────────────────────────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────────────────────────────────────

export const adminOrderStatusSchema = z
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

export const adminOrderRowSchema = z.object({
  id: z.string().optional(),
  orderId: z.string(),
  userId: z.string(),
  planId: z.string().nullish(),
  orderKind: z.enum(['subscription', 'credit_pack']).optional(),
  creditPackId: z.string().nullish(),
  grantCredits: z.number().optional(),
  amount: z.number().optional(),
  currency: z.string().nullish(),
  provider: z.string().nullish(),
  status: adminOrderStatusSchema.optional(),
  expiresAt: z.string().nullish(),
  paidAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  wechatTransactionId: z.string().nullish(),
  stripeSessionId: z.string().nullish(),
  stripeInvoiceId: z.string().nullish(),
  stripeSubscriptionId: z.string().nullish(),
  stripeCustomerId: z.string().nullish(),
  fulfillError: z.string().nullish()
})

export const adminOrdersSummarySchema = z.record(
  z.string(),
  z.object({ count: z.number(), amountFen: z.number() })
)

export const adminOrdersResponseSchema = z.object({
  orders: z.array(adminOrderRowSchema),
  total: z.number(),
  summary: adminOrdersSummarySchema
})

// ──────────────────────────────────────────────────────────────────────────────
// Usage events & access sessions
// ──────────────────────────────────────────────────────────────────────────────

export const adminUsageEventRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  modelId: z.string().nullable(),
  provider: z.string().nullable(),
  credits: z.number(),
  costCents: z.number(),
  requestId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string()
})

export const adminUsageEventsResponseSchema = z.object({
  events: z.array(adminUsageEventRowSchema),
  total: z.number()
})

export const adminAccessSessionRowSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  userEmail: z.string().nullable(),
  userName: z.string().nullable(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  expiresAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  active: z.boolean()
})

export const adminAccessSessionsResponseSchema = z.object({
  sessions: z.array(adminAccessSessionRowSchema),
  total: z.number()
})

// ──────────────────────────────────────────────────────────────────────────────
// Usage summary / analytics / overview
// ──────────────────────────────────────────────────────────────────────────────

export const adminUsageSummaryRowSchema = z.object({
  day: z.string(),
  credits: z.number(),
  costCents: z.number(),
  events: z.number()
})

export const adminUsageSummaryResponseSchema = z.object({
  summary: z.array(adminUsageSummaryRowSchema)
})

export const adminAnalyticsSchema = z.object({
  summary: z.object({
    totalUsers: z.number(),
    activeUsers: z.number(),
    revenue: z.number(),
    cost: z.number(),
    events: z.number()
  }),
  trends: z.object({
    months: z.array(z.string()),
    users: z.array(z.number()),
    activeUsers: z.array(z.number()),
    revenue: z.array(z.number()),
    cost: z.array(z.number())
  }),
  modelUsage: z.array(z.object({ name: z.string(), value: z.number() })),
  heatmap: z.array(z.array(z.number()))
})

export const adminAnalyticsResponseSchema = z.object({
  analytics: adminAnalyticsSchema
})

// ──────────────────────────────────────────────────────────────────────────────
// Announcements
// ──────────────────────────────────────────────────────────────────────────────

export const adminAnnouncementRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  tag: z.string().nullable(),
  priority: z.enum(['normal', 'important', 'critical']).catch('normal'),
  active: z.boolean(),
  publishedAt: z.string().nullish(),
  updatedAt: z.string().nullish()
})

export const adminAnnouncementsResponseSchema = z.object({
  announcements: z.array(adminAnnouncementRowSchema)
})

export const adminAnnouncementResponseSchema = z.object({
  announcement: adminAnnouncementRowSchema
})

export const adminAnnouncementDeleteResponseSchema = z.object({
  deleted: z.literal(true)
})

// ──────────────────────────────────────────────────────────────────────────────
// Payment configs
// ──────────────────────────────────────────────────────────────────────────────

export const adminPaymentConfigRowSchema = z.object({
  id: z.string(),
  provider: z.enum(['stripe', 'wechat', 'alipay', 'apple_pay']).optional(),
  displayName: z.string(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const adminPaymentConfigsResponseSchema = z.object({
  configs: z.array(adminPaymentConfigRowSchema)
})

export const adminPaymentConfigResponseSchema = z.object({
  config: adminPaymentConfigRowSchema
})

export const adminPaymentConfigMutationResponseSchema = z.object({
  success: z.literal(true)
})

// ──────────────────────────────────────────────────────────────────────────────
// Publish queue / detail / review
// ──────────────────────────────────────────────────────────────────────────────

export const adminPublishItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  coverUrl: z.string(),
  prompt: z.string(),
  mediaCount: z.number(),
  updatedAt: z.string(),
  publication: workspaceProjectPublicationSchema
})

export const adminPublishQueueResponseSchema = z.object({
  items: z.array(adminPublishItemSchema)
})

export const adminPublishActionSchema = z.enum([
  'approve',
  'reject',
  'unpublish'
])

export const adminPublishReviewRequestSchema = z
  .object({
    projectId: z.string().min(1),
    action: adminPublishActionSchema,
    note: z.string().optional()
  })
  .strict()

export const adminPublishProjectSchema = workspaceProjectSchema.extend({
  userId: z.string().min(1),
  publication: workspaceProjectPublicationSchema
})

export const adminPublishDetailResponseSchema = z.object({
  project: adminPublishProjectSchema
})

export const adminPublishReviewResultSchema = z.object({
  ok: z.boolean(),
  status: workspaceProjectPublicationStatusSchema.or(z.literal('none'))
})

export const adminPublishReviewResponseSchema = z.object({
  result: adminPublishReviewResultSchema
})

// ──────────────────────────────────────────────────────────────────────────────
// apiSuccessResponse wrappers
// ──────────────────────────────────────────────────────────────────────────────

export const adminUsersApiResponseSchema = apiSuccessResponseSchema(
  adminUsersResponseSchema
)
export const adminUserPatchApiResponseSchema = apiSuccessResponseSchema(
  adminUserPatchResponseSchema
)
export const adminOrdersApiResponseSchema = apiSuccessResponseSchema(
  adminOrdersResponseSchema
)
export const adminUsageEventsApiResponseSchema = apiSuccessResponseSchema(
  adminUsageEventsResponseSchema
)
export const adminAccessSessionsApiResponseSchema = apiSuccessResponseSchema(
  adminAccessSessionsResponseSchema
)
export const adminUsageSummaryApiResponseSchema = apiSuccessResponseSchema(
  adminUsageSummaryResponseSchema
)
export const adminAnalyticsApiResponseSchema = apiSuccessResponseSchema(
  adminAnalyticsResponseSchema
)
export const adminAnnouncementsApiResponseSchema = apiSuccessResponseSchema(
  adminAnnouncementsResponseSchema
)
export const adminAnnouncementApiResponseSchema = apiSuccessResponseSchema(
  adminAnnouncementResponseSchema
)
export const adminAnnouncementDeleteApiResponseSchema =
  apiSuccessResponseSchema(adminAnnouncementDeleteResponseSchema)
export const adminPaymentConfigsApiResponseSchema = apiSuccessResponseSchema(
  adminPaymentConfigsResponseSchema
)
export const adminPaymentConfigApiResponseSchema = apiSuccessResponseSchema(
  adminPaymentConfigResponseSchema
)
export const adminPaymentConfigMutationApiResponseSchema =
  apiSuccessResponseSchema(adminPaymentConfigMutationResponseSchema)
export const adminPublishQueueApiResponseSchema = apiSuccessResponseSchema(
  adminPublishQueueResponseSchema
)
export const adminPublishDetailApiResponseSchema = apiSuccessResponseSchema(
  adminPublishDetailResponseSchema
)
export const adminPublishReviewApiResponseSchema = apiSuccessResponseSchema(
  adminPublishReviewResponseSchema
)

// ──────────────────────────────────────────────────────────────────────────────
// Inferred types
// ──────────────────────────────────────────────────────────────────────────────

export type AdminUserRow = z.infer<typeof adminUserRowSchema>
export type AdminUsageSummaryRow = z.infer<typeof adminUsageSummaryRowSchema>
export type AdminPublishItem = z.infer<typeof adminPublishItemSchema>
export type AdminPublishProject = z.infer<typeof adminPublishProjectSchema>
export type AdminPublishAction = z.infer<typeof adminPublishActionSchema>
