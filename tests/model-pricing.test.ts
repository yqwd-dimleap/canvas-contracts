import { describe, expect, test } from 'bun:test'
import {
  modelPricingConfigSchema,
  modelPricingRuleMatchSchema
} from '../src/agent/model-provider.js'

describe('model pricing rule matches', () => {
  test('accepts adjacent prompt-token ranges', () => {
    expect(
      modelPricingRuleMatchSchema.parse({ inputTokensLt: 32_000 })
    ).toEqual({ inputTokensLt: 32_000 })
    expect(
      modelPricingRuleMatchSchema.parse({ inputTokensGte: 32_000 })
    ).toEqual({ inputTokensGte: 32_000 })
  })

  test('rejects empty or inverted prompt-token ranges', () => {
    expect(
      modelPricingRuleMatchSchema.safeParse({
        inputTokensGte: 32_000,
        inputTokensLt: 32_000
      }).success
    ).toBe(false)
  })

  test('keeps every model pricing rule in USD', () => {
    const pricing = {
      unit: 'run',
      minimumCredits: 0,
      rates: { run: { creditsPerUnit: 1, costCentsPerUnit: 1 } },
      rules: []
    }
    expect(modelPricingConfigSchema.parse(pricing).currency).toBe('USD')
    expect(
      modelPricingConfigSchema.safeParse({ ...pricing, currency: 'EUR' })
        .success
    ).toBe(false)
  })
})
