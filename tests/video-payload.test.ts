import { describe, expect, test } from 'bun:test'
import { isConfiguredVideoGenerationModel } from '../src/agent/model-category.js'
import {
  buildConfiguredVideoGenerationPayload,
  normalizeVideoGenerationParams
} from '../src/models/generation-payload.js'
import {
  buildGenerationPayloadFromConfig,
  createDefaultGenerationPayloadConfig,
  mergeGenerationPayloadConfig
} from '../src/models/payload.js'

const IMAGE_URL = 'https://example.com/input.png'
const SECOND_IMAGE_URL = 'https://example.com/second.png'
const VIDEO_MODEL_ID = 'video-model-a'

describe('video generation metadata.payload', () => {
  test('configured video eligibility requires metadata.payload', () => {
    expect(
      isConfiguredVideoGenerationModel('third-party-video-model', {
        modelKind: 'video'
      })
    ).toBe(false)
    expect(
      isConfiguredVideoGenerationModel('third-party-video-model', {
        modelKind: 'video',
        payload: createDefaultGenerationPayloadConfig('video')
      })
    ).toBe(true)
  })

  test('normalizes video references without injecting model defaults', () => {
    const params = normalizeVideoGenerationParams({
      model: VIDEO_MODEL_ID,
      prompt: ' generate a short video ',
      references: {
        firstImage: IMAGE_URL,
        images: [IMAGE_URL, SECOND_IMAGE_URL]
      }
    })

    expect(params).toMatchObject({
      model: VIDEO_MODEL_ID,
      prompt: 'generate a short video',
      references: {
        firstImage: IMAGE_URL,
        images: [IMAGE_URL, SECOND_IMAGE_URL]
      }
    })
    expect(params.params).not.toHaveProperty('duration')
    expect(params.params).not.toHaveProperty('resolution')
  })

  test('renders default video payload template from unified params', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    expect(payload.endpoint).toBe('/v1/videos')
    const configured = buildConfiguredVideoGenerationPayload(
      {
        model: VIDEO_MODEL_ID,
        prompt: 'generate a short video',
        references: {
          images: [IMAGE_URL, SECOND_IMAGE_URL]
        }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.runtime).toMatchObject({
      model: VIDEO_MODEL_ID,
      prompt: 'generate a short video',
      params: {
        duration: 5,
        resolution: '720P',
        aspectRatio: '16:9'
      }
    })
    expect(configured.payload).toMatchObject({
      model: VIDEO_MODEL_ID,
      prompt: 'generate a short video',
      duration: 5,
      size: '720P',
      imgUrl: IMAGE_URL,
      mergeReferenceImageUrls: [IMAGE_URL, SECOND_IMAGE_URL],
      mergeVideoAspectRatio: '16:9'
    })
  })

  test('supports provider multimodal content body templates', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      content: '{{helpers.content.openaiParts}}',
      resolution: '{{params.resolution}}',
      ratio: '{{params.aspectRatio}}',
      duration: '{{params.duration}}',
      frames: '{{params.frames}}'
    }

    const configured = buildGenerationPayloadFromConfig(payload, {
      model: 'provider-video-model',
      prompt: 'make this a dynamic wallpaper',
      references: {
        images: [IMAGE_URL, SECOND_IMAGE_URL]
      },
      params: {
        frames: 57
      }
    })

    expect(configured.payload).toMatchObject({
      model: 'provider-video-model',
      prompt: 'make this a dynamic wallpaper',
      resolution: '720P',
      ratio: '16:9',
      duration: 5,
      frames: 57
    })
    expect(configured.payload.content).toEqual([
      {
        type: 'image_url',
        image_url: { url: IMAGE_URL }
      },
      {
        type: 'image_url',
        image_url: { url: SECOND_IMAGE_URL }
      },
      {
        type: 'text',
        text: 'make this a dynamic wallpaper'
      }
    ])
  })

  test('renders multi-image reference media helpers', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      duration: '{{params.duration}}',
      metadata: {
        resolution: '{{params.resolution}}',
        action: 'referenceGenerate',
        media: '{{helpers.references.imageMedia}}'
      }
    }

    const configured = buildGenerationPayloadFromConfig(payload, {
      model: 'provider-video-model',
      prompt: 'make this a dynamic wallpaper',
      references: {
        images: [IMAGE_URL, SECOND_IMAGE_URL]
      }
    })

    expect(configured.payload).toMatchObject({
      model: 'provider-video-model',
      prompt: 'make this a dynamic wallpaper',
      duration: 5,
      metadata: {
        resolution: '720P',
        action: 'referenceGenerate',
        media: [
          {
            type: 'first_frame',
            url: IMAGE_URL
          },
          {
            type: 'reference_image',
            url: SECOND_IMAGE_URL
          }
        ]
      }
    })
  })

  test('renders wan2.7-r2v mixed references as an OpenAI-compatible body', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.endpoint = '/v1/videos'
    payload.controls = [
      {
        key: 'resolution',
        label: 'Resolution',
        type: 'select',
        enabled: true,
        required: true,
        defaultValue: '720P',
        options: ['720P']
      },
      {
        key: 'ratio',
        label: 'Ratio',
        type: 'select',
        enabled: true,
        required: true,
        defaultValue: '16:9',
        options: ['16:9', '9:16']
      },
      {
        key: 'duration',
        label: 'Duration',
        type: 'number',
        enabled: true,
        required: true,
        defaultValue: 10,
        options: [],
        min: 5,
        max: 10
      },
      {
        key: 'prompt_extend',
        label: 'Prompt extend',
        type: 'boolean',
        enabled: true,
        required: false,
        defaultValue: false,
        options: []
      },
      {
        key: 'watermark',
        label: 'Watermark',
        type: 'boolean',
        enabled: true,
        required: false,
        defaultValue: true,
        options: []
      },
      {
        key: 'referenceImages',
        label: 'Reference media',
        type: 'referenceImages',
        enabled: true,
        required: true,
        options: []
      }
    ]
    payload.pricingBindings = {
      duration: 'duration',
      resolution: 'resolution',
      aspectRatio: 'ratio'
    }
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      size: '{{params.resolution}}',
      duration: '{{params.duration}}',
      mergeVideoAspectRatio: '{{params.ratio}}',
      referenceMedia: '{{references.media}}',
      prompt_extend: '{{params.prompt_extend}}',
      watermark: '{{params.watermark}}'
    }

    const media = [
      {
        type: 'reference_image' as const,
        url: IMAGE_URL,
        reference_voice: 'https://example.com/voice-1.wav'
      },
      {
        type: 'reference_video' as const,
        url: 'https://example.com/reference.mp4',
        reference_voice: 'https://example.com/voice-2.wav'
      },
      { type: 'reference_image' as const, url: SECOND_IMAGE_URL }
    ]
    const configured = buildConfiguredVideoGenerationPayload(
      {
        model: 'wan2.7-r2v-2026-06-12',
        prompt: 'Continue the village sequence across the references.',
        params: {
          resolution: '720P',
          ratio: '16:9',
          duration: 10,
          prompt_extend: false,
          watermark: true
        },
        references: { media },
        system: {}
      },
      mergeGenerationPayloadConfig(null, payload)
    )

    expect(configured.config.endpoint).toBe('/v1/videos')
    expect(configured.payload).toEqual({
      model: 'wan2.7-r2v-2026-06-12',
      prompt: 'Continue the village sequence across the references.',
      size: '720P',
      duration: 10,
      mergeVideoAspectRatio: '16:9',
      referenceMedia: media,
      prompt_extend: false,
      watermark: true
    })
  })

  test('rejects provider-native nested prompt payloads', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.request.body = {
      model: '{{model}}',
      input: {
        prompt: '{{prompt}}',
        media: '{{references.media}}'
      },
      parameters: {
        resolution: '{{params.resolution}}'
      }
    }

    expect(() =>
      buildConfiguredVideoGenerationPayload(
        {
          model: 'wan2.7-r2v-2026-06-12',
          prompt: 'Continue the village sequence.',
          references: {
            media: [{ type: 'reference_image', url: IMAGE_URL }]
          }
        },
        mergeGenerationPayloadConfig(null, payload)
      )
    ).toThrow('OpenAI-compatible video payload requires top-level prompt')
  })

  test('required controls fail before gateway submission', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.controls.push({
      key: 'camera',
      label: 'Camera',
      type: 'text',
      enabled: true,
      required: true,
      options: []
    })
    payload.request.body = {
      model: '{{model}}',
      prompt: '{{prompt}}',
      camera: '{{params.camera}}'
    }

    expect(() =>
      buildGenerationPayloadFromConfig(payload, {
        model: 'video-model',
        prompt: 'generate a short video'
      })
    ).toThrow('Generation payload control "camera" is required')
  })
})
