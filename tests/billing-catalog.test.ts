import { describe, expect, test } from 'bun:test'
import {
  billingCatalogApiResponseSchema,
  billingCatalogSchema
} from '../src/billing/index.js'

const catalog = {
  plans: [
    {
      id: 'pro',
      name: 'Pro',
      monthlyCredits: 2000,
      monthlyPriceUsd: 19,
      yearlyPriceUsd: 15.2,
      monthlyPriceCnyFen: 13800,
      yearlyPriceCnyFen: 11040
    }
  ],
  creditPacks: [{ id: 'pack_s', credits: 500, priceUsd: 9, cnyFen: 6900 }]
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
})
