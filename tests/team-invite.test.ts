import { describe, expect, test } from 'bun:test'
import {
  teamInviteEmailRequestSchema,
  teamInviteSchema
} from '../src/team/schema'

describe('team invitation delivery contracts', () => {
  test('defaults delivery fields for invitations created before email delivery', () => {
    const invite = teamInviteSchema.parse({
      id: 'invite-1',
      teamId: 'team-1',
      tokenHash: 'a'.repeat(32),
      email: 'person@example.com',
      role: 'member',
      status: 'pending',
      createdByUserId: 'owner-1',
      acceptedByUserId: null,
      expiresAt: 1_800_000_000_000,
      acceptedAt: null,
      metadata: {},
      createdAt: 1_799_000_000_000,
      updatedAt: 1_799_000_000_000
    })

    expect(invite.deliveryStatus).toBe('not_requested')
    expect(invite.deliveryAttemptCount).toBe(0)
    expect(invite.deliveryAttemptedAt).toBeNull()
    expect(invite.deliverySentAt).toBeNull()
  })

  test('accepts only localized non-owner invitation email payloads', () => {
    const payload = {
      inviteId: 'invite-1',
      deliveryAttempt: 1,
      actorUserId: 'owner-1',
      recipientEmail: 'person@example.com',
      teamName: 'Canvas Team',
      role: 'member',
      expiresAt: 1_800_000_000_000,
      inviteUrl: 'https://canvas.example.com/team/invite/token-value',
      locale: 'zh-CN'
    }
    expect(teamInviteEmailRequestSchema.parse(payload)).toEqual(payload)
    expect(
      teamInviteEmailRequestSchema.safeParse({ ...payload, role: 'owner' })
        .success
    ).toBe(false)
  })
})
