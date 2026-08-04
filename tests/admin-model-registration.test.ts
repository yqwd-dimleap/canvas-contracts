import { describe, expect, test } from 'bun:test'
import {
  gatewayModelsResponseSchema,
  registerGatewayModelRequestSchema
} from '../src/admin/responses.js'
import { categorizeGatewayModel } from '../src/agent/model-category.js'

describe('gateway model registration', () => {
  test('keeps upstream discovery limited to model identity', () => {
    expect(
      gatewayModelsResponseSchema.parse({
        models: [{ id: 'gpt-test', ownedBy: 'gateway', created: 42 }]
      })
    ).toEqual({
      models: [{ id: 'gpt-test', ownedBy: 'gateway', created: 42 }]
    })
    expect(
      gatewayModelsResponseSchema.safeParse({
        models: [{ id: 'gpt-test', pricing: { rates: {} } }]
      }).success
    ).toBe(false)
  })

  test('requires Canvas-owned category and pricing when registering', () => {
    expect(
      registerGatewayModelRequestSchema.safeParse({
        modelId: 'gpt-test',
        displayName: 'GPT Test',
        modelKind: 'chat'
      }).success
    ).toBe(false)

    const parsed = registerGatewayModelRequestSchema.parse({
      modelId: 'gpt-test',
      displayName: 'GPT Test',
      modelKind: 'chat',
      pricing: { rates: {} }
    })
    expect(parsed.pricing.unit).toBe('image')
    expect(parsed.pricing.currency).toBe('USD')
  })

  test('keeps inferred categories available for upstream browsing only', () => {
    expect(categorizeGatewayModel('chatgpt-image-latest')).toBe('image')
    expect(categorizeGatewayModel('claude-sonnet-4-5')).toBe('chat')
    expect(categorizeGatewayModel('veo-3.1')).toBe('video')
    expect(categorizeGatewayModel('text-embedding-3-large')).toBe('embedding')
    expect(categorizeGatewayModel('whisper-large-v3')).toBe('audio')
    expect(categorizeGatewayModel('vendor-special-model')).toBe('other')
  })
})
