import { describe, expect, test } from 'bun:test'
import { modelRegistry } from '../src/models/registry.js'
import type {
  VideoGatewayPayload,
  VideoGenerationParams
} from '../src/models/types.js'

const IMAGE_URL = 'https://example.com/input.png'
const SECOND_IMAGE_URL = 'https://example.com/second.png'

function buildVideoPayload(
  params: Partial<VideoGenerationParams> & Pick<VideoGenerationParams, 'model'>
): VideoGatewayPayload {
  return modelRegistry.buildVideoPayload({
    prompt: 'generate a short video',
    duration: 5,
    size: '720P',
    ...params
  })
}

describe('video model payloads', () => {
  test('wan2.6-i2v sends first-frame URL as input.img_url', () => {
    const payload = buildVideoPayload({
      model: 'wan2.6-i2v',
      imgUrl: IMAGE_URL,
      mergeReferenceImageUrls: [SECOND_IMAGE_URL],
      mergeVideoAspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    })

    expect(payload.input).toMatchObject({
      prompt: 'generate a short video',
      img_url: IMAGE_URL
    })
    expect(payload.input).not.toHaveProperty('media')
    expect(payload.parameters).toMatchObject({
      resolution: '720P',
      ratio: '16:9',
      duration: 5,
      prompt_extend: true,
      watermark: true
    })
  })

  test('wan2.7-i2v sends first-frame URL as input.media', () => {
    const payload = buildVideoPayload({
      model: 'wan2.7-i2v',
      imgUrl: IMAGE_URL,
      mergeReferenceImageUrls: [SECOND_IMAGE_URL],
      mergeVideoAspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    })

    expect(payload.input).toMatchObject({
      prompt: 'generate a short video',
      media: [
        {
          type: 'first_frame',
          url: IMAGE_URL
        }
      ]
    })
    expect(payload.input).not.toHaveProperty('img_url')
    expect(payload.parameters).toMatchObject({
      resolution: '720P',
      ratio: '16:9',
      duration: 5,
      prompt_extend: true,
      watermark: true
    })
  })

  test('wan i2v falls back to first_frame referenceMedia', () => {
    const payload = buildVideoPayload({
      model: 'wan2.6-i2v',
      referenceMedia: [
        {
          type: 'first_frame',
          url: IMAGE_URL
        }
      ]
    })

    expect(payload.input).toMatchObject({
      img_url: IMAGE_URL
    })
  })

  test('wan2.7-i2v falls back to first_frame referenceMedia in input.media', () => {
    const payload = buildVideoPayload({
      model: 'wan2.7-i2v',
      referenceMedia: [
        {
          type: 'first_frame',
          url: IMAGE_URL
        }
      ]
    })

    expect(payload.input?.media).toEqual([
      {
        type: 'first_frame',
        url: IMAGE_URL
      }
    ])
    expect(payload.input).not.toHaveProperty('img_url')
  })

  test('wan2.7-i2v includes driving audio in input.media', () => {
    const audioUrl = 'https://example.com/rap.mp3'
    const payload = buildVideoPayload({
      model: 'wan2.7-i2v',
      imgUrl: IMAGE_URL,
      drivingAudioUrl: audioUrl
    })

    expect(payload.input?.media).toEqual([
      {
        type: 'first_frame',
        url: IMAGE_URL
      },
      {
        type: 'driving_audio',
        url: audioUrl
      }
    ])
  })

  test('wan i2v rejects missing image input before gateway submission', () => {
    expect(() =>
      buildVideoPayload({
        model: 'wan2.6-i2v'
      })
    ).toThrow('wan2.6-i2v requires imgUrl')
  })

  test.each([
    'wan2.6-r2v',
    'wan2.7-r2v'
  ])('%s keeps multiple reference images in input.media', (model) => {
    const payload = buildVideoPayload({
      model,
      imgUrl: IMAGE_URL,
      mergeReferenceImageUrls: [IMAGE_URL, SECOND_IMAGE_URL],
      mergeVideoAspectRatio: '16:9'
    })

    expect(payload.input?.media).toEqual([
      {
        type: 'reference_image',
        url: IMAGE_URL
      },
      {
        type: 'reference_image',
        url: SECOND_IMAGE_URL
      }
    ])
    expect(payload.input).not.toHaveProperty('img_url')
    expect(payload.parameters).toMatchObject({
      ratio: '16:9',
      duration: 5
    })
  })

  test('happyhorse i2v keeps first-frame image in input.media', () => {
    const payload = buildVideoPayload({
      model: 'happyhorse-1.0-i2v',
      imgUrl: IMAGE_URL
    })

    expect(payload.input?.media).toEqual([
      {
        type: 'first_frame',
        url: IMAGE_URL
      }
    ])
    expect(payload.input).not.toHaveProperty('img_url')
  })

  test.each([
    'kling-v2-1-master',
    'runway-gen3-alpha-turbo'
  ])('%s keeps single image-to-video URL in input.img_url', (model) => {
    const payload = buildVideoPayload({
      model,
      imgUrl: IMAGE_URL
    })

    expect(payload.input).toMatchObject({
      img_url: IMAGE_URL
    })
  })
})
