import { describe, expect, test } from 'bun:test'
import {
  adminUpdateSupportTicketRequestSchema,
  createSupportTicketRequestSchema,
  supportTicketDetailSchema
} from '../src/support/index.js'

describe('support contracts', () => {
  test('normalizes a valid ticket request', () => {
    expect(
      createSupportTicketRequestSchema.parse({
        subject: '  Cannot export a video  ',
        category: 'technical',
        message: '  Export stops before the download begins.  '
      })
    ).toEqual({
      subject: 'Cannot export a video',
      category: 'technical',
      message: 'Export stops before the download begins.'
    })
  })

  test('requires an actual admin update', () => {
    expect(adminUpdateSupportTicketRequestSchema.safeParse({}).success).toBe(
      false
    )
  })

  test('rejects messages that do not belong to the detail ticket', () => {
    const result = supportTicketDetailSchema.safeParse({
      id: 'ticket-1',
      userId: 'user-1',
      userEmail: 'user@example.com',
      userName: null,
      subject: 'Cannot export a video',
      category: 'technical',
      status: 'open',
      priority: 'normal',
      messageCount: 1,
      lastMessageAuthorRole: 'user',
      lastMessagePreview: 'Export stops before the download begins.',
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
      resolvedAt: null,
      closedAt: null,
      messages: [
        {
          id: 'message-1',
          ticketId: 'ticket-2',
          authorId: 'user-1',
          authorRole: 'user',
          body: 'Export stops before the download begins.',
          createdAt: '2026-07-27T00:00:00.000Z'
        }
      ]
    })
    expect(result.success).toBe(false)
  })
})
