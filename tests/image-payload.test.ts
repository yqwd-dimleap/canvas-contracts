import { describe, expect, test } from 'bun:test'
import {
  buildConfiguredImageGenerationPayload,
  normalizeImageGenerationParams
} from '../src/models/generation-payload.js'
import {
  generationReferencesSchema,
  imageGenerationParamsSchema
} from '../src/models/params.js'
import {
  buildGenerationPayloadFromConfig,
  createDefaultGenerationPayloadConfig,
  generationPayloadConfigSchema,
  mergeGenerationPayloadConfig
} from '../src/models/payload.js'

const IMAGE_MODEL_ID = 'image-model-a'
const IMAGE_URL = 'https://example.com/reference.png'

const imageReference = (
  url: string,
  role: 'reference' | 'mask' = 'reference'
) => ({
  mediaType: 'image' as const,
  role,
  source: { kind: 'url' as const, url }
})

describe('image generation metadata.payload', () => {
  test('normalizes only canonical reference items without model defaults', () => {
    const params = normalizeImageGenerationParams({
      model: IMAGE_MODEL_ID,
      prompt: ' generate a clean product render ',
      params: { size: ' 1536x1024 ', quality: ' high ' },
      references: { items: [imageReference(` ${IMAGE_URL} `)] },
      system: { projectId: 'project-1' }
    })

    expect(params).toEqual({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      params: { size: '1536x1024', quality: 'high' },
      references: { items: [imageReference(IMAGE_URL)] },
      system: { projectId: 'project-1' }
    })
  })

  test('renders default image payload from resolved canonical references', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    const configured = buildConfiguredImageGenerationPayload(
      {
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render',
        params: { size: '1536x1024', quality: 'high' },
        references: { items: [imageReference(IMAGE_URL)] },
        system: { projectId: 'project-1' }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.runtime.references).toEqual({
      items: [imageReference(IMAGE_URL)]
    })
    expect(configured.payload).toMatchObject({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      size: '1536x1024',
      n: 1,
      image: [IMAGE_URL],
      quality: 'high',
      background: 'auto',
      output_format: 'png'
    })
    expect(configured.payload).not.toHaveProperty('projectId')
  })

  test('maps configured controls and reference helpers independently', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.controls.push({
      key: 'strength',
      label: 'Strength',
      type: 'number',
      enabled: true,
      required: false,
      options: [],
      defaultValue: 0.5
    })
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      references: '{{helpers.references.imageUrls}}',
      strength: '{{params.strength}}'
    }

    const configured = buildConfiguredImageGenerationPayload(
      {
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render',
        references: {
          items: [
            imageReference('https://example.com/reference-1.png'),
            imageReference('https://example.com/reference-2.png', 'mask')
          ]
        },
        params: { strength: 0.8 }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.payload).toEqual({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      references: [
        'https://example.com/reference-1.png',
        'https://example.com/reference-2.png'
      ],
      strength: 0.8
    })
  })

  test('drops undeclared control values before rendering provider fields', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      quality: '{{params.quality}}'
    }

    const configured = buildGenerationPayloadFromConfig(payload, {
      model: IMAGE_MODEL_ID,
      prompt: 'format an image',
      params: { quality: 'high', injected: 'must-not-reach-provider' }
    })

    expect(configured.runtime.params).not.toHaveProperty('injected')
    expect(configured.payload).toEqual({
      model: IMAGE_MODEL_ID,
      prompt: 'format an image',
      quality: 'high'
    })
  })

  test('rejects raw legacy references and legacy template paths', () => {
    expect(
      imageGenerationParamsSchema.safeParse({
        model: IMAGE_MODEL_ID,
        prompt: 'test',
        references: { images: [IMAGE_URL] }
      }).success
    ).toBe(false)
    expect(
      generationReferencesSchema.safeParse({ images: [IMAGE_URL] }).success
    ).toBe(false)

    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = { image: '{{references.images}}' }
    expect(generationPayloadConfigSchema.safeParse(payload).success).toBe(false)
  })

  test('does not let unresolved asset IDs reach payload rendering', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    expect(() =>
      buildGenerationPayloadFromConfig(payload, {
        model: IMAGE_MODEL_ID,
        prompt: 'test',
        references: {
          items: [
            {
              mediaType: 'image',
              role: 'reference',
              source: { kind: 'asset', assetId: 'asset-1' }
            }
          ]
        }
      })
    ).toThrow('must be resolved by the server')
  })
})
