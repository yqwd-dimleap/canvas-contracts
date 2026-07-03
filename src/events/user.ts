/**
 * 用户事件类型
 */

import { z } from 'zod'
import { baseEventSchema } from './base.js'

/**
 * 用户消息事件
 */
export const userMessageEventSchema = baseEventSchema.extend({
  type: z.literal('user.message'),
  content: z.string(),
  context: z.record(z.string(), z.unknown()).optional()
})

export type UserMessageEvent = z.infer<typeof userMessageEventSchema>

/**
 * 用户中断事件
 */
export const userInterruptEventSchema = baseEventSchema.extend({
  type: z.literal('user.interrupt'),
  reason: z.string().optional()
})

export type UserInterruptEvent = z.infer<typeof userInterruptEventSchema>

/**
 * 用户取消事件
 */
export const userCancelEventSchema = baseEventSchema.extend({
  type: z.literal('user.cancel'),
  reason: z.string().optional()
})

export type UserCancelEvent = z.infer<typeof userCancelEventSchema>

/**
 * 用户重试事件
 */
export const userRetryEventSchema = baseEventSchema.extend({
  type: z.literal('user.retry'),
  targetEventId: z.string().optional()
})

export type UserRetryEvent = z.infer<typeof userRetryEventSchema>

/**
 * 用户继续事件
 */
export const userContinueEventSchema = baseEventSchema.extend({
  type: z.literal('user.continue'),
  targetEventId: z.string().optional()
})

export type UserContinueEvent = z.infer<typeof userContinueEventSchema>

/**
 * 用户反馈事件
 */
export const userFeedbackEventSchema = baseEventSchema.extend({
  type: z.literal('user.feedback'),
  feedbackType: z.enum(['like', 'dislike', 'comment']),
  target: z.object({
    type: z.enum(['message', 'artifact', 'tool_result']),
    id: z.string()
  }),
  comment: z.string().optional()
})

export type UserFeedbackEvent = z.infer<typeof userFeedbackEventSchema>

/**
 * 用户输入事件
 */
export const userInputEventSchema = baseEventSchema.extend({
  type: z.literal('user.input'),
  input: z.string(),
  context: z.record(z.string(), z.unknown()).optional()
})

export type UserInputEvent = z.infer<typeof userInputEventSchema>

/**
 * 用户事件联合类型
 */
export const userEventSchema = z.discriminatedUnion('type', [
  userMessageEventSchema,
  userInterruptEventSchema,
  userCancelEventSchema,
  userRetryEventSchema,
  userContinueEventSchema,
  userFeedbackEventSchema,
  userInputEventSchema
])

export type UserEvent =
  | UserMessageEvent
  | UserInterruptEvent
  | UserCancelEvent
  | UserRetryEvent
  | UserContinueEvent
  | UserFeedbackEvent
  | UserInputEvent
