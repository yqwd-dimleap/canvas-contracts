import { describe, expect, test } from 'bun:test'
import {
  gatewayModelsResponseSchema,
  registerGatewayModelRequestSchema
} from '../src/admin/responses.js'
import {
  categorizeGatewayModel,
  getEffectiveModelCategory
} from '../src/agent/model-category.js'

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
      pricing: { unit: 'token', rates: {} }
    })
    expect(parsed.pricing.unit).toBe('token')
    expect(parsed.pricing.currency).toBe('USD')
  })

  test('rejects pricing units unsupported by the selected category', () => {
    expect(
      registerGatewayModelRequestSchema.safeParse({
        modelId: 'gpt-test',
        displayName: 'GPT Test',
        modelKind: 'chat',
        pricing: { unit: 'image', rates: {} }
      }).success
    ).toBe(false)
    expect(
      registerGatewayModelRequestSchema.safeParse({
        modelId: 'lyrics-test',
        displayName: 'Lyrics Test',
        modelKind: 'audio',
        pricing: {
          unit: 'run',
          rates: {},
          rules: [{ id: 'bad-override', unit: 'second', rates: {} }]
        }
      }).success
    ).toBe(false)
  })

  test('lets an explicit category override stale payload metadata', () => {
    expect(
      getEffectiveModelCategory('custom-model', {
        modelKind: 'video',
        payload: { mediaType: 'image', fields: [] }
      })
    ).toBe('video')
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
