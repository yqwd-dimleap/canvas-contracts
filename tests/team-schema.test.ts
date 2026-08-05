import { describe, expect, test } from 'bun:test'
import { teamOverviewSchema, teamSchema } from '../src/team/schema.js'

const NOW = 1_800_000_000_000

const team = {
  id: 'team-1',
  name: 'Studio',
  ownerId: 'owner-1',
  seatsLimit: 5,
  metadata: {},
  createdAt: NOW,
  updatedAt: NOW
}

const membership = {
  id: 'member-1',
  teamId: 'team-1',
  userId: 'user-1',
  role: 'member' as const,
  status: 'active' as const,
  invitedByUserId: 'owner-1',
  joinedAt: NOW,
  metadata: {},
  createdAt: NOW,
  updatedAt: NOW
}

describe('Team contracts', () => {
  test('keeps subscription availability out of the persistent Team entity', () => {
    expect(teamSchema.parse(team)).toEqual(team)
  })

  test('projects suspended access and independent creation eligibility', () => {
    expect(
      teamOverviewSchema.parse({
        teams: [
          {
            team,
            membership,
            availability: 'subscription_inactive'
          }
        ],
        defaultTeamId: 'team-1',
        creationEligibility: 'eligible'
      })
    ).toMatchObject({
      defaultTeamId: 'team-1',
      creationEligibility: 'eligible',
      teams: [{ availability: 'subscription_inactive' }]
    })
  })
})
