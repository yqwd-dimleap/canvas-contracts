import { describe, expect, test } from 'bun:test'
import { updateAdminModelRequestSchema } from '../src/admin/responses.js'
import { buildConfiguredChatGenerationPayload } from '../src/models/generation-payload.js'
import {
  buildGenerationPayloadFromConfig,
  createDefaultGenerationPayloadConfig,
  generationPayloadConfigSchema,
  mergeGenerationPayloadConfig,
  readGenerationPayloadConfig,
  readPricingDimension
} from '../src/models/payload.js'

const MODEL_ID = 'config-model-a'

describe('generation payload config capabilities', () => {
  test('admin updates accept provider-native output fields with server callback context', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.controls = [
      {
        key: 'generationType',
        label: 'Generation type',
        type: 'select',
        defaultValue: 'reference-to-video',
        options: ['reference-to-video']
      }
    ]
    payload.request.body = {
      model: '{{model}}',
      callback_url: '{{server.callbackUrl}}',
      input: {
        prompt: '{{prompt}}',
        generation_type: '{{params.generationType}}'
      }
    }

    const result = updateAdminModelRequestSchema.safeParse({
      modelId: 'seedance-2-0',
      metadata: { payload }
    })
    expect(result.success).toBe(true)
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
    payload.request.body = { model: '{{model}}', loras: '{{params.loras}}' }

    expect(
      buildGenerationPayloadFromConfig(payload, {
        model: MODEL_ID,
        params: { loras: ['a', 'b'] }
      }).payload
    ).toEqual({ model: MODEL_ID, loras: ['a', 'b'] })

    expect(() =>
      buildGenerationPayloadFromConfig(payload, {
        model: MODEL_ID,
        params: { loras: ['a', 2] }
      })
    ).toThrow('must be a list of strings')
  })

  test('multipart config declares every accepted canonical media input', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.request.encoding = 'multipart'
    payload.request.headers = { 'X-DashScope-Async': 'enable' }
    payload.request.referenceEndpoint = '/v1/videos/edits'
    payload.request.multipartFields = [
      { field: 'first_frame', mediaType: 'image', roles: ['first_frame'] },
      { field: 'source_video', mediaType: 'video', roles: ['source'] },
      { field: 'audio', mediaType: 'audio', roles: ['driving_audio'] }
    ]

    const stored = readGenerationPayloadConfig(
      mergeGenerationPayloadConfig(null, payload)
    )
    expect(stored?.request).toMatchObject({
      encoding: 'multipart',
      headers: { 'X-DashScope-Async': 'enable' },
      referenceEndpoint: '/v1/videos/edits',
      multipartFields: payload.request.multipartFields
    })
  })

  test('pricing bindings resolve dimensions to custom param keys', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.pricingBindings = { duration: 'seconds', resolution: 'res' }

    const params = { seconds: 8, res: '1080P', duration: 5 }
    expect(readPricingDimension(payload, params, 'duration')).toBe(8)
    expect(readPricingDimension(payload, params, 'resolution')).toBe('1080P')
  })

  test('chat build entry normalizes messages and requires chat config', () => {
    const payload = createDefaultGenerationPayloadConfig('chat')
    const configured = buildConfiguredChatGenerationPayload(
      {
        model: MODEL_ID,
        prompt: '',
        messages: [{ role: 'user', content: 'hi' }],
        params: { temperature: 0.5 },
        references: { items: [] },
        system: {}
      },
      mergeGenerationPayloadConfig(null, payload)
    )
    expect(configured.payload).toMatchObject({
      model: MODEL_ID,
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.5
    })
  })

  test('configuration rejects raw aliases and unavailable template variables', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = { image: '{{references.images}}' }
    expect(generationPayloadConfigSchema.safeParse(payload).success).toBe(false)

    payload.request.body = { secret: '{{params.notDeclared}}' }
    expect(generationPayloadConfigSchema.safeParse(payload).success).toBe(false)
  })
})
