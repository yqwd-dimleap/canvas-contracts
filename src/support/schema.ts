import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  nullableTimestampSchema,
  timestampSchema
} from '../shared/timestamp.js'

export const supportCategorySchema = z.enum([
  'account',
  'billing',
  'generation',
  'technical',
  'feedback',
  'other'
])
export type SupportCategory = z.infer<typeof supportCategorySchema>

export const supportStatusSchema = z.enum([
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed'
])
export type SupportStatus = z.infer<typeof supportStatusSchema>

export const supportPrioritySchema = z.enum(['normal', 'high', 'urgent'])
export type SupportPriority = z.infer<typeof supportPrioritySchema>

export const supportAuthorRoleSchema = z.enum(['user', 'support'])
export type SupportAuthorRole = z.infer<typeof supportAuthorRoleSchema>

export const supportMessageSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  authorId: z.string().min(1),
  authorRole: supportAuthorRoleSchema,
  body: z.string().min(1).max(5000),
  createdAt: timestampSchema
})
export type SupportMessage = z.infer<typeof supportMessageSchema>

export const supportTicketSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userEmail: z.string().email(),
  userName: z.string().nullable().default(null),
  subject: z.string().min(4).max(120),
  category: supportCategorySchema,
  status: supportStatusSchema,
  priority: supportPrioritySchema,
  messageCount: z.number().int().min(1),
  lastMessageAuthorRole: supportAuthorRoleSchema,
  lastMessagePreview: z.string().max(180),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  resolvedAt: nullableTimestampSchema,
  closedAt: nullableTimestampSchema
})
export type SupportTicketSummary = z.infer<typeof supportTicketSummarySchema>

export const supportTicketDetailSchema = supportTicketSummarySchema
  .extend({
    messages: z.array(supportMessageSchema).min(1).max(500)
  })
  .superRefine((ticket, context) => {
    for (const [index, message] of ticket.messages.entries()) {
      if (message.ticketId !== ticket.id) {
        context.addIssue({
          code: 'custom',
          message: 'Message ticketId must match its ticket',
          path: ['messages', index, 'ticketId']
        })
      }
    }
  })
export type SupportTicketDetail = z.infer<typeof supportTicketDetailSchema>

export const createSupportTicketRequestSchema = z.object({
  subject: z.string().trim().min(4).max(120),
  category: supportCategorySchema,
  message: z.string().trim().min(10).max(5000)
})
export type CreateSupportTicketRequest = z.infer<
  typeof createSupportTicketRequestSchema
>

export const replySupportTicketRequestSchema = z.object({
  message: z.string().trim().min(1).max(5000)
})
export type ReplySupportTicketRequest = z.infer<
  typeof replySupportTicketRequestSchema
>

export const updateOwnSupportTicketRequestSchema = z.object({
  action: z.enum(['close', 'reopen'])
})
export type UpdateOwnSupportTicketRequest = z.infer<
  typeof updateOwnSupportTicketRequestSchema
>

export const adminUpdateSupportTicketRequestSchema = z
  .object({
    status: supportStatusSchema.optional(),
    priority: supportPrioritySchema.optional()
  })
  .refine(
    (input) => input.status !== undefined || input.priority !== undefined,
    {
      message: 'Provide status or priority'
    }
  )
export type AdminUpdateSupportTicketRequest = z.infer<
  typeof adminUpdateSupportTicketRequestSchema
>

export const supportTicketListQuerySchema = z.object({
  status: supportStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).max(100_000).default(0)
})
export type SupportTicketListQuery = z.infer<
  typeof supportTicketListQuerySchema
>

export const adminSupportTicketListQuerySchema =
  supportTicketListQuerySchema.extend({
    category: supportCategorySchema.optional(),
    priority: supportPrioritySchema.optional(),
    q: z.string().trim().max(100).optional()
  })
export type AdminSupportTicketListQuery = z.infer<
  typeof adminSupportTicketListQuerySchema
>

export const supportTicketListApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    tickets: z.array(supportTicketSummarySchema),
    total: z.number().int().min(0)
  })
)

export const supportTicketDetailApiResponseSchema = apiSuccessResponseSchema(
  z.object({ ticket: supportTicketDetailSchema })
)
