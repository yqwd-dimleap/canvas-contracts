import { describe, expect, test } from 'bun:test'
import { generationTaskTypeSchema } from '../src/generation/index.js'
import {
  createMediaJobRequestSchema,
  mediaJobSchema
} from '../src/media/index.js'
import { workspaceUploadCompleteRequestSchema } from '../src/storage/workspace-assets.js'

describe('media job contracts', () => {
  test('keeps PSD work out of generation task types', () => {
    expect(generationTaskTypeSchema.safeParse('psd.inspect').success).toBe(
      false
    )
    expect(generationTaskTypeSchema.safeParse('image').success).toBe(true)
  })

  test('accepts explicit PSD inspection and layer extraction commands', () => {
    const inspect = createMediaJobRequestSchema.parse({
      operation: 'psd.inspect',
      inputs: [{ assetId: 'asset-psd' }]
    })
    expect(inspect.options.includeHidden).toBe(true)

    expect(
      createMediaJobRequestSchema.parse({
        operation: 'psd.extract-layers',
        inputs: [{ assetId: 'asset-psd' }],
        options: { layerIds: ['layer:42'] }
      })
    ).toMatchObject({
      operation: 'psd.extract-layers',
      options: { format: 'png', includeHidden: false }
    })
  })

  test('rejects duplicate PSD layer selections', () => {
    expect(
      createMediaJobRequestSchema.safeParse({
        operation: 'psd.extract-layers',
        inputs: [{ assetId: 'asset-psd' }],
        options: { layerIds: ['layer:42', 'layer:42'] }
      }).success
    ).toBe(false)
  })

  test('requires a separate media-job lifecycle', () => {
    expect(
      mediaJobSchema.parse({
        id: 'media-1',
        operation: 'psd.inspect',
        operationVersion: 1,
        userId: 'user-1',
        projectId: null,
        inputs: [{ assetId: 'asset-psd' }],
        options: { includeHidden: true },
        status: 'queued',
        stage: 'queued',
        progress: 0,
        attempt: 0,
        maxAttempts: 2,
        idempotencyKey: 'idem-1',
        requestHash: 'hash-1',
        createdAt: 1,
        updatedAt: 1
      })
    ).toMatchObject({ status: 'queued', operation: 'psd.inspect' })
  })

  test('accepts PSD upload completion MIME types', () => {
    expect(
      workspaceUploadCompleteRequestSchema.safeParse({
        key: 'objects/user-1/source.psd',
        mimeType: 'image/vnd.adobe.photoshop',
        size: 1024
      }).success
    ).toBe(true)
  })
})
