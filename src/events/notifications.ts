import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { generationTaskTypeSchema } from '../generation/index.js'
import { canvasEventTypeSchema } from './events.js'

/**
 * 用户个人通知收件箱 DTO（per-user，持久化）。
 *
 * 通用消息中心：任何面向用户的终态/系统事件都可落为一条通知，前端通知中心
 * 「消息」分区渲染。不局限于生成结果——充值到账、run 失败、系统公告等皆可。
 * `readAt` 为后端持久化的已读时间（null 表示未读）。
 *
 * 设计原则（重要）：这是**展示层 DTO**，对未知/新增的枚举值必须宽容降级，
 * 单条通知里某个分类字段取到未列举的值，绝不能让整个通知列表校验失败。
 * 因此 kind/level/eventType 均以 `.catch(默认值)` 兜底，媒体类元数据用
 * `.nullish()` 容忍 null 与缺省。新增通知类型时无需先改 schema 即可先上线。
 */

/** 通知分类。'system' 为通用兜底类别，容纳未来新增/未归类的通知。 */
export const userNotificationKindSchema = z
  .enum(['generation', 'billing', 'run', 'system'])
  .catch('system')

export const userNotificationLevelSchema = z
  .enum(['info', 'success', 'warning', 'error'])
  .catch('info')

/** 通知的跳转目标：画布项目/文档/元素，或一个相对路径。 */
export const userNotificationLinkSchema = z.object({
  projectId: z.string().optional(),
  documentId: z.string().optional(),
  elementId: z.string().optional(),
  href: z.string().optional()
})

export const userNotificationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  kind: userNotificationKindSchema,
  level: userNotificationLevelSchema,
  /**
   * 触发该通知的源事件类型（便于前端按类型渲染/调试）。
   * 未知/新增事件类型降级为 'notification.updated'，不阻断列表渲染。
   */
  eventType: canvasEventTypeSchema.catch('notification.updated'),
  title: z.string(),
  body: z.string().catch('').default(''),
  // 以下三项为「生成类通知才有」的可选元数据。通用通知（充值、run 失败、系统
  // 消息等）天然没有媒体类型/缩略图/跳转目标，后端可能存 null 或缺省，故用
  // nullish() 同时容忍 null 与 undefined；mediaType 再叠加 catch，未知媒体类型
  // 降级为 null——单个可选字段为空或越界绝不能让整条通知校验失败。
  mediaType: generationTaskTypeSchema.nullish().catch(null),
  thumbnailUrl: z.string().nullish(),
  link: userNotificationLinkSchema.nullish(),
  /** 源事件 eventId，作为 (userId,eventId) 幂等键。 */
  eventId: z.string().min(1),
  /** 已读时间（ISO 8601）；null 表示未读。 */
  readAt: z.string().nullable(),
  createdAt: z.string()
})

/**
 * 通知列表必须做到单条脏数据不拖垮整个收件箱。列表边界接收 unknown，逐条按
 * `userNotificationSchema` 解析，仅保留可安全展示的数据。
 */
export const userNotificationListSchema = z
  .array(z.unknown())
  .transform((items) => {
    const notifications: UserNotification[] = []
    for (const item of items) {
      const parsed = userNotificationSchema.safeParse(item)
      if (parsed.success) notifications.push(parsed.data)
    }
    return notifications
  })

export type UserNotificationKind = z.infer<typeof userNotificationKindSchema>
export type UserNotificationLevel = z.infer<typeof userNotificationLevelSchema>
export type UserNotificationLink = z.infer<typeof userNotificationLinkSchema>
export type UserNotification = z.infer<typeof userNotificationSchema>

/** GET /api/notifications 响应：通知列表 + 未读数（标准 { ok, data } 信封）。 */
export const listUserNotificationsApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    notifications: userNotificationListSchema,
    unreadCount: z.number().int().nonnegative()
  })
)

/** POST /api/notifications/read 响应：更新后的未读数。 */
export const markUserNotificationsReadApiResponseSchema =
  apiSuccessResponseSchema(
    z.object({
      unreadCount: z.number().int().nonnegative()
    })
  )

export type ListUserNotificationsResponse = z.infer<
  typeof listUserNotificationsApiResponseSchema
>['data']
export type MarkUserNotificationsReadResponse = z.infer<
  typeof markUserNotificationsReadApiResponseSchema
>['data']

/**
 * 系统公告（announcement）DTO。
 *
 * 公开广播消息：canvas-agent 的 GET /api/announcements 输出，前端顶栏通知中心
 * 「公告」区渲染（`useNotificationsQuery`）。序列化后所有时间戳为 ISO 8601 字符串，
 * 与后端 `db/announcements.ts` 的 `serialize` 对齐。展示层 DTO，优先级未知值兜底。
 */
export const announcementPrioritySchema = z
  .enum(['normal', 'important', 'critical'])
  .catch('normal')

export const announcementSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  body: z.string(),
  tag: z.string().nullable(),
  priority: announcementPrioritySchema,
  active: z.boolean(),
  publishedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type AnnouncementPriority = z.infer<typeof announcementPrioritySchema>
export type Announcement = z.infer<typeof announcementSchema>

/** GET /api/announcements 响应：活跃公告列表（标准 { ok, data } 信封）。 */
export const publicAnnouncementsApiResponseSchema = apiSuccessResponseSchema(
  z.object({ announcements: z.array(announcementSchema) })
)

export type PublicAnnouncementsResponse = z.infer<
  typeof publicAnnouncementsApiResponseSchema
>['data']
