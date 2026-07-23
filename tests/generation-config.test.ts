import { describe, expect, test } from 'bun:test'
import { updateAdminModelRequestSchema } from '../src/admin/responses.js'
import { buildConfiguredChatGenerationPayload } from '../src/models/generation-payload.js'
import {
  buildGenerationPayloadFromConfig,
  createDefaultGenerationPayloadConfig,
  mergeGenerationPayloadConfig,
  readGenerationPayloadConfig,
  readPricingDimension
} from '../src/models/payload.js'

const MODEL_ID = 'config-model-a'

describe('generation payload config capabilities', () => {
  test('admin updates reject provider-native nested media payloads', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.request.body = {
      model: '{{model}}',
      input: { prompt: '{{prompt}}' }
    }

    const result = updateAdminModelRequestSchema.safeParse({
      modelId: 'wan2.7-r2v-2026-06-12',
      metadata: { payload }
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['metadata', 'payload'])
      expect(result.error.issues[0]?.message).toContain(
        'requires top-level prompt'
      )
    }
  })

  test('stringList control renders arrays and rejects non-string items', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.controls = [
      {
        key: 'loras',
        label: 'LoRAs',
        type: 'stringList',
        enabled: true,
        required: false,
        options: []
      }
    ]
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      loras: '{{params.loras}}'
    }

    const ok = buildGenerationPayloadFromConfig(payload, {
      model: MODEL_ID,
      prompt: 'test prompt',
      params: { loras: ['a', 'b'] }
    })
    expect(ok.payload).toEqual({
      model: MODEL_ID,
      prompt: 'test prompt',
      loras: ['a', 'b']
    })

    expect(() =>
      buildGenerationPayloadFromConfig(payload, {
        model: MODEL_ID,
        params: { loras: ['a', 2] }
      })
    ).toThrow('must be a list of strings')
  })

  test('json control carries structured array values verbatim', () => {
    const payload = createDefaultGenerationPayloadConfig('chat')
    payload.controls = [
      {
        key: 'tools',
        label: 'Tools',
        type: 'json',
        enabled: true,
        required: false,
        options: []
      }
    ]
    payload.request.body = { model: '{{model}}', tools: '{{params.tools}}' }

    const tools = [{ type: 'function', function: { name: 'search' } }]
    const configured = buildGenerationPayloadFromConfig(payload, {
      model: MODEL_ID,
      params: { tools }
    })
    expect(configured.payload).toEqual({ model: MODEL_ID, tools })
  })

  test('request encoding, headers and referenceEndpoint survive round-trip', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.encoding = 'multipart'
    payload.request.headers = { 'X-DashScope-Async': 'enable' }
    payload.request.referenceEndpoint = '/v1/images/edits'
    payload.request.multipartImageField = 'init_image'

    const stored = readGenerationPayloadConfig(
      mergeGenerationPayloadConfig(null, payload)
    )
    expect(stored?.request.encoding).toBe('multipart')
    expect(stored?.request.headers).toEqual({ 'X-DashScope-Async': 'enable' })
    expect(stored?.request.referenceEndpoint).toBe('/v1/images/edits')
    expect(stored?.request.multipartImageField).toBe('init_image')
  })

  test('pricingBindings resolve dimensions to custom param keys', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.pricingBindings = { duration: 'seconds', resolution: 'res' }

    const params = { seconds: 8, res: '1080P', duration: 5 }
    expect(readPricingDimension(payload, params, 'duration')).toBe(8)
    expect(readPricingDimension(payload, params, 'resolution')).toBe('1080P')
    // Unbound dimension falls back to same-named key.
    payload.pricingBindings = {}
    expect(readPricingDimension(payload, params, 'duration')).toBe(5)
  })

  test('chat build entry normalizes messages and requires chat config', () => {
    const payload = createDefaultGenerationPayloadConfig('chat')
    const configured = buildConfiguredChatGenerationPayload(
      {
        model: MODEL_ID,
        prompt: '',
        messages: [{ role: 'user', content: 'hi' }],
        params: { temperature: 0.5 },
        references: {},
        system: {}
      },
      mergeGenerationPayloadConfig(null, payload)
    )
    expect(configured.endpoint).toBe('/chat/completions')
    expect(configured.payload).toMatchObject({
      model: MODEL_ID,
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.5
    })

    expect(() =>
      buildConfiguredChatGenerationPayload(
        {
          model: MODEL_ID,
          prompt: '',
          messages: [],
          params: {},
          references: {},
          system: {}
        },
        mergeGenerationPayloadConfig(
          null,
          createDefaultGenerationPayloadConfig('image')
        )
      )
    ).toThrow('Generation payload is not configured')
  })

  test('loose references pass extra media fields through to the template', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      mask: '{{references.maskImage}}'
    }
    const configured = buildGenerationPayloadFromConfig(payload, {
      model: MODEL_ID,
      prompt: 'test prompt',
      references: { maskImage: 'https://example.com/mask.png' }
    })
    expect(configured.payload).toEqual({
      model: MODEL_ID,
      prompt: 'test prompt',
      mask: 'https://example.com/mask.png'
    })
  })
})
