import { describe, expect, test } from 'bun:test'
import { adminUsageOverviewApiResponseSchema } from '../src/admin/admin-business.js'

describe('admin usage overview contract', () => {
  test('keeps product usage and billing ledger counts separate', () => {
    const result = adminUsageOverviewApiResponseSchema.parse({
      ok: true,
      data: {
        overview: {
          range: {
            days: 7,
            from: '2026-07-18T00:00:00.000Z',
            to: '2026-07-25T00:00:00.000Z',
            previousFrom: '2026-07-11T00:00:00.000Z',
            previousTo: '2026-07-18T00:00:00.000Z',
            timezone: 'UTC'
          },
          totals: {
            usageEvents: 8,
            ledgerEvents: 2,
            activeUsers: 3,
            credits: 24,
            costCents: 40,
            averageCreditsPerEvent: 3,
            averageCostCentsPerEvent: 5
          },
          comparison: {
            usageEventsPercent: 14.29,
            activeUsersPercent: 0,
            creditsPercent: null,
            costPercent: -20
          },
          series: [
            {
              bucket: '2026-07-24',
              usageEvents: 8,
              activeUsers: 3,
              credits: 24,
              costCents: 40
            }
          ],
          breakdowns: {
            categories: [
              {
                category: 'generation',
                usageEvents: 8,
                activeUsers: 3,
                credits: 24,
                costCents: 40,
                share: 1
              }
            ],
            eventTypes: [
              {
                type: 'image.generation',
                category: 'generation',
                usageEvents: 8,
                activeUsers: 3,
                credits: 24,
                costCents: 40,
                share: 1
              }
            ],
            models: [
              {
                modelId: 'image-model',
                provider: 'provider',
                usageEvents: 8,
                activeUsers: 3,
                credits: 24,
                costCents: 40,
                share: 1
              }
            ]
          },
          topUsers: [
            {
              userId: 'user-1',
              userName: 'User',
              userEmail: 'user@example.com',
              usageEvents: 4,
              credits: 12,
              costCents: 20,
              lastSeenAt: '2026-07-24T12:00:00.000Z'
            }
          ]
        }
      }
    })

    expect(result.data.overview.totals.usageEvents).toBe(8)
    expect(result.data.overview.totals.ledgerEvents).toBe(2)
  })
})
