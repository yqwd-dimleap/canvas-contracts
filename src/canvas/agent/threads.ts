import { z } from 'zod'

export const canvasAgentThreadStatusSchema = z.enum([
  'active',
  'archived',
  'deleted'
])

export const canvasAgentThreadSchema = z
  .object({
    threadId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    userId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(200),
    status: canvasAgentThreadStatusSchema,
    lastMessageId: z.string().trim().min(1).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict()

export const canvasAgentMessageSchema = z
  .object({
    messageId: z.string().trim().min(1),
    threadId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    userId: z.string().trim().min(1),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    runId: z.string().trim().min(1).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict()

export const canvasAgentMessagePageSchema = z
  .object({
    messages: z.array(canvasAgentMessageSchema),
    nextCursor: z.string().trim().min(1).nullable()
  })
  .strict()

export const canvasAgentThreadPageSchema = z
  .object({
    threads: z.array(canvasAgentThreadSchema),
    nextCursor: z.string().datetime().nullable(),
    activeThreadId: z.string().trim().min(1).nullable()
  })
  .strict()

export const canvasAgentThreadPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(['active', 'archived']).optional()
  })
  .strict()
  .refine((value) => value.title !== undefined || value.status !== undefined, {
    message: 'At least one thread field is required'
  })

export const canvasAgentActiveThreadRequestSchema = z
  .object({
    activeThreadId: z.string().trim().min(1).nullable()
  })
  .strict()

export const canvasAgentActiveThreadResponseSchema =
  canvasAgentActiveThreadRequestSchema

export type CanvasAgentThreadStatus = z.infer<
  typeof canvasAgentThreadStatusSchema
>
export type CanvasAgentThread = z.infer<typeof canvasAgentThreadSchema>
export type CanvasAgentMessage = z.infer<typeof canvasAgentMessageSchema>
export type CanvasAgentMessagePage = z.infer<
  typeof canvasAgentMessagePageSchema
>
export type CanvasAgentThreadPage = z.infer<typeof canvasAgentThreadPageSchema>
export type CanvasAgentThreadPatch = z.infer<
  typeof canvasAgentThreadPatchSchema
>
export type CanvasAgentActiveThreadRequest = z.infer<
  typeof canvasAgentActiveThreadRequestSchema
>
export type CanvasAgentActiveThreadResponse = z.infer<
  typeof canvasAgentActiveThreadResponseSchema
>
