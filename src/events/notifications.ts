import { z } from 'zod'
import { generationTaskTypeSchema } from '../generation/index.js'
import { canvasEventTypeSchema } from './events.js'

/**
 * 用户个人通知收件箱 DTO（per-user，持久化）。
 *
 * 区别于全站公告（announcement，无 userId/已读态）：每条通知归属单个用户，由
 * canvas-agent 在终态事件（生成完成/失败、充值到账、run 失败）落库，前端通知
 * 中心「消息」分区渲染。`readAt` 为后端持久化的已读时间（null 表示未读）。
 */

export const userNotificationKindSchema = z.enum([
  'generation',
  'billing',
  'run'
])

export const userNotificationLevelSchema = z.enum([
  'info',
  'success',
  'warning',
  'error'
])

/** 通知的跳转目标：画布项目/节点，或一个相对路径。 */
export const userNotificationLinkSchema = z.object({
  projectId: z.string().optional(),
  nodeId: z.string().optional(),
  href: z.string().optional()
})

export const userNotificationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  kind: userNotificationKindSchema,
  level: userNotificationLevelSchema,
  /** 触发该通知的源事件类型（便于前端按类型渲染/调试）。 */
  eventType: canvasEventTypeSchema,
  title: z.string(),
  body: z.string().default(''),
  mediaType: generationTaskTypeSchema.optional(),
  thumbnailUrl: z.string().optional(),
  link: userNotificationLinkSchema.optional(),
  /** 源事件 eventId，作为 (userId,eventId) 幂等键。 */
  eventId: z.string().min(1),
  /** 已读时间（ISO 8601）；null 表示未读。 */
  readAt: z.string().nullable(),
  createdAt: z.string()
})

export type UserNotificationKind = z.infer<typeof userNotificationKindSchema>
export type UserNotificationLevel = z.infer<typeof userNotificationLevelSchema>
export type UserNotificationLink = z.infer<typeof userNotificationLinkSchema>
export type UserNotification = z.infer<typeof userNotificationSchema>
