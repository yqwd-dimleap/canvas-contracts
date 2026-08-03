import { describe, expect, test } from 'bun:test'
import { adminModelPatchRequestSchema } from '../src/admin/responses.js'
import {
  DEFAULT_MODEL_SHOWCASE_CONFIG,
  mergeModelShowcaseConfig,
  modelShowcaseConfigSchema,
  readModelShowcaseConfig
} from '../src/agent/model-showcase.js'

describe('model showcase config', () => {
  test('reads defaults when showcase metadata is absent', () => {
    expect(readModelShowcaseConfig(undefined)).toEqual(
      DEFAULT_MODEL_SHOWCASE_CONFIG
    )
  })

  test('round-trips image and video presentation metadata', () => {
    const image = modelShowcaseConfigSchema.parse({
      visible: true,
      sortOrder: 12,
      description: 'Editorial image generation',
      media: { type: 'image', url: 'https://cdn.example.com/sample.webp' }
    })
    const imageMetadata = mergeModelShowcaseConfig({ payload: {} }, image)
    expect(readModelShowcaseConfig(imageMetadata)).toEqual(image)

    const video = modelShowcaseConfigSchema.parse({
      visible: true,
      media: {
        type: 'video',
        url: 'https://cdn.example.com/sample.mp4',
        posterUrl: 'https://cdn.example.com/sample.webp'
      }
    })
    expect(
      readModelShowcaseConfig(mergeModelShowcaseConfig(undefined, video))
    ).toEqual(video)
  })

  test('rejects non-web media URLs on the admin write boundary', () => {
    expect(
      adminModelPatchRequestSchema.safeParse({
        metadata: {
          showcase: {
            visible: true,
            media: { type: 'image', url: 'file:///tmp/example.png' }
          }
        }
      }).success
    ).toBe(false)
  })
})
