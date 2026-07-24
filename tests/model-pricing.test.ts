import { describe, expect, test } from 'bun:test'
import { modelPricingRuleMatchSchema } from '../src/agent/model-provider.js'

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
})
