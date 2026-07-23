import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import {
  apiError,
  apiResponseSchema,
  apiSuccess,
  apiSuccessResponseSchema
} from '../src/api/response.js'
import { workspaceProjectPublishRequestSchema } from '../src/canvas/workspace/project.js'
import { listUserNotificationsApiResponseSchema } from '../src/events/notifications.js'

describe('HTTP response envelopes', () => {
  test('accepts only the declared success or error wire shape', () => {
    const schema = apiResponseSchema(z.object({ id: z.string() }))

    expect(schema.parse(apiSuccess({ id: 'project-1' }))).toEqual({
      ok: true,
      data: { id: 'project-1' }
    })
    expect(
      schema.parse(apiError('Missing project', { projectId: 'project-1' }))
    ).toEqual({
      ok: false,
      error: 'Missing project',
      details: { projectId: 'project-1' }
    })
    expect(schema.safeParse({ id: 'project-1' }).success).toBe(false)
    expect(
      apiSuccessResponseSchema(z.object({ id: z.string() })).safeParse({
        ok: true,
        id: 'project-1'
      }).success
    ).toBe(false)
  })

  test('treats the project identifier as a path parameter for publishing', () => {
    expect(
      workspaceProjectPublishRequestSchema.parse({
        coverMediaId: 'asset-1'
      })
    ).toEqual({ coverMediaId: 'asset-1' })
    expect(
      workspaceProjectPublishRequestSchema.safeParse({
        projectId: 'another-project'
      }).success
    ).toBe(false)
    expect(
      workspaceProjectPublishRequestSchema.safeParse({
        useAgentReview: true
      }).success
    ).toBe(false)
  })

  test('keeps valid notifications when an individual stored entry is corrupt', () => {
    const response = listUserNotificationsApiResponseSchema.parse(
      apiSuccess({
        notifications: [
          {
            id: 'notification-1',
            userId: 'user-1',
            kind: 'future-kind',
            level: 'future-level',
            eventType: 'future.event',
            title: 'A valid notification',
            eventId: 'event-1',
            readAt: null,
            createdAt: '2026-07-14T00:00:00.000Z'
          },
          { malformed: true }
        ],
        unreadCount: 1
      })
    )

    expect(response.data.notifications).toHaveLength(1)
    expect(response.data.notifications[0]).toMatchObject({
      kind: 'system',
      level: 'info',
      eventType: 'notification.updated'
    })
  })
})
