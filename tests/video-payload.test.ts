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
const VIDEO_URL = 'https://example.com/camera-motion.mp4'
const AUDIO_URL = 'https://example.com/soundtrack.mp3'
const VIDEO_MODEL_ID = 'video-model-a'

const reference = (
  mediaType: 'image' | 'video' | 'audio',
  role:
    | 'reference'
    | 'first_frame'
    | 'source'
    | 'clip'
    | 'driving_audio'
    | 'reference_voice',
  url: string
) => ({ mediaType, role, source: { kind: 'url' as const, url } })

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

  test('normalizes canonical video references without injecting controls', () => {
    const params = normalizeVideoGenerationParams({
      model: VIDEO_MODEL_ID,
      prompt: ' generate a short video ',
      references: {
        items: [
          reference('image', 'first_frame', IMAGE_URL),
          reference('image', 'reference', SECOND_IMAGE_URL)
        ]
      }
    })

    expect(params.references.items).toEqual([
      reference('image', 'first_frame', IMAGE_URL),
      reference('image', 'reference', SECOND_IMAGE_URL)
    ])
    expect(params.params).not.toHaveProperty('duration')
  })

  test('renders default video payload from image references', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    const configured = buildConfiguredVideoGenerationPayload(
      {
        model: VIDEO_MODEL_ID,
        prompt: 'generate a short video',
        references: {
          items: [
            reference('image', 'first_frame', IMAGE_URL),
            reference('image', 'reference', SECOND_IMAGE_URL)
          ]
        }
      },
      mergeGenerationPayloadConfig(null, payload)
    )

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

  test('maps mixed canonical media into OpenAI-compatible provider parts', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.request.body = {
      model: '{{model}}',
      content: '{{helpers.content.openaiParts}}'
    }
    const configured = buildGenerationPayloadFromConfig(payload, {
      model: VIDEO_MODEL_ID,
      prompt: 'make this a dynamic wallpaper',
      references: {
        items: [
          reference('image', 'reference', IMAGE_URL),
          reference('video', 'source', VIDEO_URL),
          reference('audio', 'driving_audio', AUDIO_URL)
        ]
      }
    })

    expect(configured.payload.content).toEqual([
      { type: 'image_url', image_url: { url: IMAGE_URL } },
      { type: 'video_url', video_url: { url: VIDEO_URL } },
      { type: 'audio_url', audio_url: { url: AUDIO_URL } },
      { type: 'text', text: 'make this a dynamic wallpaper' }
    ])
  })

  test('maps role-aware media helpers and provider callback from server context', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.controls = [
      {
        key: 'generationType',
        label: 'Generation type',
        type: 'select',
        enabled: true,
        required: true,
        defaultValue: 'reference-to-video',
        options: ['reference-to-video']
      },
      {
        key: 'referenceMedia',
        label: 'Reference media',
        type: 'referenceMedia',
        enabled: true,
        required: true,
        options: []
      }
    ]
    payload.request.body = {
      model: '{{model}}',
      callback_url: '{{server.callbackUrl}}',
      input: {
        generation_type: '{{params.generationType}}',
        media: '{{helpers.references.typedMedia}}',
        image_urls: '{{helpers.references.imageUrls}}',
        video_urls: '{{helpers.references.videoUrls}}',
        audio_urls: '{{helpers.references.audioUrls}}'
      }
    }
    const configured = buildConfiguredVideoGenerationPayload(
      {
        model: VIDEO_MODEL_ID,
        prompt: 'continue the sequence',
        references: {
          items: [
            reference('image', 'first_frame', IMAGE_URL),
            reference('video', 'source', VIDEO_URL),
            reference('audio', 'reference_voice', AUDIO_URL)
          ]
        }
      },
      mergeGenerationPayloadConfig(null, payload),
      {
        server: {
          callbackUrl: 'https://agent.example.com/api/webhooks/inbound'
        }
      }
    )

    expect(configured.payload).toEqual({
      model: VIDEO_MODEL_ID,
      callback_url: 'https://agent.example.com/api/webhooks/inbound',
      input: {
        generation_type: 'reference-to-video',
        media: [
          { type: 'first_frame', url: IMAGE_URL },
          { type: 'reference_video', url: VIDEO_URL },
          { type: 'reference_voice', url: AUDIO_URL }
        ],
        image_urls: [IMAGE_URL],
        video_urls: [VIDEO_URL],
        audio_urls: [AUDIO_URL]
      }
    })
  })

  test('requires configured controls before gateway submission', () => {
    const payload = createDefaultGenerationPayloadConfig('video')
    payload.controls.push({
      key: 'camera',
      label: 'Camera',
      type: 'text',
      enabled: true,
      required: true,
      options: []
    })
    payload.request.body = { camera: '{{params.camera}}' }

    expect(() =>
      buildGenerationPayloadFromConfig(payload, {
        model: VIDEO_MODEL_ID,
        prompt: 'generate a short video'
      })
    ).toThrow('Generation payload control "camera" is required')
  })
})
