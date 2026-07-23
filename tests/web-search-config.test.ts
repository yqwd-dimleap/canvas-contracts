import { describe, expect, test } from 'bun:test'
import { updateWebSearchConfigRequestSchema } from '../src/agent/web-search.js'

describe('web search configuration', () => {
  const valid = {
    provider: 'tavily' as const,
    enabled: true,
    apiKey: 'tavily-key',
    baseUrl: 'https://api.tavily.com',
    maxResults: 5,
    timeoutMs: 10_000
  }

  test('accepts the bounded Tavily configuration', () => {
    expect(updateWebSearchConfigRequestSchema.parse(valid)).toEqual(valid)
  })

  test('rejects non-HTTP URLs and out-of-range execution limits', () => {
    expect(
      updateWebSearchConfigRequestSchema.safeParse({
        ...valid,
        baseUrl: 'file:///tmp/search'
      }).success
    ).toBe(false)
    expect(
      updateWebSearchConfigRequestSchema.safeParse({
        ...valid,
        maxResults: 11,
        timeoutMs: 999
      }).success
    ).toBe(false)
  })
})
