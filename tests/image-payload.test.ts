import { describe, expect, test } from 'bun:test'
import {
  buildConfiguredImageGenerationPayload,
  normalizeImageGenerationParams
} from '../src/models/generation-payload.js'
import {
  buildGenerationPayloadFromConfig,
  createDefaultGenerationPayloadConfig,
  mergeGenerationPayloadConfig
} from '../src/models/payload.js'

const IMAGE_MODEL_ID = 'image-model-a'

describe('image generation metadata.payload', () => {
  test('normalizes grouped image params without model-specific defaults', () => {
    const params = normalizeImageGenerationParams({
      model: IMAGE_MODEL_ID,
      prompt: ' generate a clean product render ',
      input: {
        size: ' 1536x1024 ',
        quality: ' high '
      },
      controls: {
        style: ' editorial ',
        strength: 0.65
      },
      references: {
        images: [' https://example.com/ref.png ', 'https://example.com/ref.png']
      },
      system: {
        projectId: 'project-1'
      }
    })

    expect(params).toEqual({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      input: {
        size: '1536x1024',
        quality: 'high'
      },
      controls: {
        style: 'editorial',
        strength: 0.65
      },
      references: {
        images: ['https://example.com/ref.png']
      },
      system: {
        projectId: 'project-1'
      }
    })
  })

  test('requires metadata.payload for image payload build', () => {
    expect(() =>
      buildConfiguredImageGenerationPayload({
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render'
      })
    ).toThrow('Generation payload is not configured')
  })

  test('renders default image payload template from grouped context', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    const configured = buildConfiguredImageGenerationPayload(
      {
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render',
        input: {
          size: '1536x1024',
          quality: 'high'
        },
        references: {
          images: ['https://example.com/reference.png']
        },
        system: {
          projectId: 'project-1'
        }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.config).toEqual(payload)
    expect(configured.params).toMatchObject({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      input: {
        size: '1536x1024',
        n: 1,
        quality: 'high'
      }
    })
    expect(configured.payload).toMatchObject({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      size: '1536x1024',
      n: 1,
      image: ['https://example.com/reference.png'],
      quality: 'high',
      background: 'auto',
      output_format: 'png'
    })
    expect(configured.payload).not.toHaveProperty('projectId')
  })

  test('renders custom image controls from grouped controls', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.controls.push(
      {
        key: 'style',
        label: 'Style',
        type: 'text',
        enabled: true,
        required: false,
        options: [],
        defaultValue: 'studio'
      },
      {
        key: 'strength',
        label: 'Strength',
        type: 'number',
        enabled: true,
        required: false,
        options: [],
        defaultValue: 0.5
      }
    )
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      image: '{{references.images}}',
      style: '{{controls.style}}',
      strength: '{{controls.strength}}'
    }

    const configured = buildConfiguredImageGenerationPayload(
      {
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render',
        references: {
          images: ['https://example.com/reference.png']
        },
        controls: {
          style: 'editorial',
          strength: 0.8
        }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.params).toMatchObject({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      references: {
        images: ['https://example.com/reference.png']
      },
      controls: {
        style: 'editorial',
        strength: 0.8
      }
    })
    expect(configured.payload).toMatchObject({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      image: ['https://example.com/reference.png'],
      style: 'editorial',
      strength: 0.8
    })
  })

  test('keeps multiple reference images in the rendered payload', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      image: '{{references.images}}'
    }

    const configured = buildConfiguredImageGenerationPayload(
      {
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render',
        references: {
          images: [
            'https://example.com/reference-1.png',
            'https://example.com/reference-2.png'
          ]
        }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.payload).toEqual({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render',
      image: [
        'https://example.com/reference-1.png',
        'https://example.com/reference-2.png'
      ]
    })
  })

  test('does not expose legacy params template namespace', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      size: '{{params.size}}',
      n: '{{params.n}}'
    }

    const configured = buildConfiguredImageGenerationPayload(
      {
        model: IMAGE_MODEL_ID,
        prompt: 'generate a clean product render',
        input: {
          size: '1536x1024',
          n: 2
        }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.payload).toEqual({
      model: IMAGE_MODEL_ID,
      prompt: 'generate a clean product render'
    })
  })

  test('supports provider-specific image helpers', () => {
    const payload = createDefaultGenerationPayloadConfig('image')
    payload.request.body = {
      model: '{{model}}',
      input: {
        messages: '{{helpers.qwen.inputMessages}}'
      },
      parameters: {
        size: '{{input.size}}',
        n: '{{input.n}}'
      }
    }

    const configured = buildGenerationPayloadFromConfig(payload, {
      model: 'provider-image-model',
      prompt: '保留主体姿态，改成更生气的表情',
      references: {
        images: ['https://example.com/original-cat.png']
      }
    })

    expect(configured.payload).toMatchObject({
      model: 'provider-image-model',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: 'https://example.com/original-cat.png' },
              { text: '保留主体姿态，改成更生气的表情' }
            ]
          }
        ]
      },
      parameters: {
        size: '1024x1024',
        n: 1
      }
    })
  })
})
