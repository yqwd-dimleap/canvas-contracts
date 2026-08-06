import { describe, expect, test } from 'bun:test'
import {
  billingCatalogApiResponseSchema,
  billingCatalogSchema,
  billingPlanCatalogItemSchema,
  creditBalanceBreakdownSchema
} from '../src/billing/index.js'

const catalog = {
  plans: [
    {
      id: 'pro',
      name: 'Pro',
      monthlyCredits: 2000,
      monthlyPriceUsd: 19,
      yearlyPriceUsd: 15.2,
      includedSeats: 1,
      creditScope: 'account' as const
    }
  ],
  creditPacks: [{ id: 'pack_s', credits: 500, priceUsd: 9 }]
}

describe('billing catalog contracts', () => {
  test('accepts the backend-owned product catalog', () => {
    expect(billingCatalogSchema.parse(catalog)).toEqual(catalog)
    expect(
      billingCatalogApiResponseSchema.parse({ ok: true, data: catalog }).data
    ).toEqual(catalog)
  })

  test('rejects fractional credits and negative prices', () => {
    expect(() =>
      billingCatalogSchema.parse({
        ...catalog,
        plans: [
          {
            ...catalog.plans[0],
            monthlyCredits: 1.5,
            monthlyPriceUsd: -1
          }
        ]
      })
    ).toThrow()
  })

  test('describes Team credits as global member entitlements', () => {
    expect(
      billingPlanCatalogItemSchema.parse({
        ...catalog.plans[0],
        id: 'team',
        includedSeats: 5,
        monthlyCreditsPerSeat: 1000,
        creditScope: 'member_global'
      })
    ).toMatchObject({
      includedSeats: 5,
      monthlyCreditsPerSeat: 1000,
      creditScope: 'member_global'
    })
  })

  test('keeps personal, Team, top-up, legacy, and manual balances separate', () => {
    expect(
      creditBalanceBreakdownSchema.parse({
        total: 150,
        personal: 10,
        team: 20,
        topUp: 30,
        legacy: 40,
        manual: 50
      })
    ).toEqual({
      total: 150,
      personal: 10,
      team: 20,
      topUp: 30,
      legacy: 40,
      manual: 50
    })
  })
})
