import { describe, expect, test } from 'bun:test'
import {
  CANVAS_DOCUMENT_SCHEMA_VERSION,
  type CanvasDocument
} from '../src/canvas/core/document.js'
import {
  WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION,
  workspaceProjectCanvasSchema
} from '../src/canvas/workspace/project.js'
import {
  workspaceAssetPatchRequestSchema,
  workspaceAssetVideoMediaSchema,
  workspaceUploadCompleteRequestSchema
} from '../src/storage/workspace-assets.js'
import {
  CanvasAssetReference,
  CanvasMediaResource,
  WorkspaceAssetRuntime
} from '../src/storage/workspace-assets-runtime.js'

describe('workspace asset write contracts', () => {
  test('keeps storage and media metadata server-owned', () => {
    expect(
      workspaceAssetPatchRequestSchema.safeParse({
        metadata: { media: { type: 'video' } }
      }).success
    ).toBe(false)
  })

  test('requires multipart completion fields together', () => {
    const base = {
      key: 'users/user-1/video.mp4',
      mimeType: 'video/mp4',
      size: 1024
    }
    expect(
      workspaceUploadCompleteRequestSchema.safeParse({
        ...base,
        uploadId: 'upload-1'
      }).success
    ).toBe(false)
    expect(
      workspaceUploadCompleteRequestSchema.safeParse({
        ...base,
        uploadId: 'upload-1',
        parts: [{ partNumber: 1, etag: 'etag-1' }]
      }).success
    ).toBe(true)
  })

  test('accepts audio upload completion MIME types', () => {
    expect(
      workspaceUploadCompleteRequestSchema.safeParse({
        key: 'users/user-1/voice.mp3',
        mimeType: 'audio/mpeg',
        size: 1024
      }).success
    ).toBe(true)
  })

  test('tracks owned video poster objects', () => {
    expect(
      workspaceAssetVideoMediaSchema.parse({
        poster: {
          url: 'https://cdn.example.com/poster.webp',
          key: 'users/user-1/poster.webp',
          mimeType: 'image/webp',
          size: 2048
        }
      })
    ).toMatchObject({
      poster: { key: 'users/user-1/poster.webp' }
    })
  })
})

describe('animated image media contexts', () => {
  const animatedImage = {
    type: 'image' as const,
    url: 'https://assets.example.com/source.gif',
    metadata: {
      media: {
        type: 'image' as const,
        original: {
          url: 'https://assets.example.com/source.gif',
          key: 'objects/source.gif',
          mimeType: 'image/gif',
          size: 1024
        },
        image: {
          isAnimated: true,
          model: {
            url: 'https://imgproxy.example.com/model.webp'
          },
          preview: {
            url: 'https://imgproxy.example.com/preview.avif'
          },
          thumbnail: {
            url: 'https://imgproxy.example.com/thumb.avif'
          },
          derivatives: {
            original: 'https://imgproxy.example.com/original.avif',
            preview: 'https://imgproxy.example.com/preview.avif',
            thumb: 'https://imgproxy.example.com/thumb.avif',
            thumbnails: {
              w128: 'https://imgproxy.example.com/128.avif',
              w320: 'https://imgproxy.example.com/320.avif',
              w640: 'https://imgproxy.example.com/640.avif',
              w1280: 'https://imgproxy.example.com/1280.avif',
              w2048: 'https://imgproxy.example.com/2048.avif'
            }
          }
        }
      }
    }
  }

  test('uses the static AVIF only for canvas textures', () => {
    expect(
      WorkspaceAssetRuntime.mediaForContext(animatedImage, 'canvasTexture')
    ).toBe('https://imgproxy.example.com/preview.avif')
    expect(WorkspaceAssetRuntime.mediaForContext(animatedImage, 'canvas')).toBe(
      'https://assets.example.com/source.gif'
    )
    expect(
      WorkspaceAssetRuntime.mediaForContext(animatedImage, 'preview')
    ).toBe('https://assets.example.com/source.gif')
    expect(
      WorkspaceAssetRuntime.mediaForContext(animatedImage, 'thumbnail')
    ).toBe('https://assets.example.com/source.gif')
    expect(
      WorkspaceAssetRuntime.mediaForContext(animatedImage, 'download')
    ).toBe('https://assets.example.com/source.gif')
    expect(CanvasMediaResource.imageModelReferenceUrl(animatedImage)).toBe(
      'https://assets.example.com/source.gif'
    )
  })
})

describe('canvas document asset references', () => {
  test('compact document asset references strips element media metadata', () => {
    const compacted = CanvasAssetReference.compactDocument(
      canvasDocumentWithRasterMediaMetadata()
    )

    expect(compacted.elements[0]?.assetId).toBe('asset-image')
    expect(compacted.elements[0]?.metadata).toEqual({
      createdAt: 1,
      sourceElementId: 'element-1'
    })
  })
})

describe('workspace project canvas', () => {
  test('v2 canvas requires the Canvas2D payload shape', () => {
    const document = canvasDocumentWithRasterMediaMetadata()
    const parsed = workspaceProjectCanvasSchema.parse({
      schemaVersion: WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION,
      revision: 0,
      canvasDocument: document
    })

    expect(parsed.schemaVersion).toBe(WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION)
    expect(parsed.canvasDocument?.id).toBe(document.id)
  })

  test('deprecated graph canvas resources are rejected', () => {
    const document = canvasDocumentWithRasterMediaMetadata()
    const result = workspaceProjectCanvasSchema.safeParse({
      schemaVersion: 1,
      nodes: [{ id: 'legacy-node' }],
      edges: [{ id: 'legacy-edge' }],
      canvasDocuments: [document],
      conversations: [],
      activeConversationId: null,
      orphanResources: []
    })

    expect(result.success).toBe(false)
  })
})

function canvasDocumentWithRasterMediaMetadata(): CanvasDocument {
  return {
    id: 'canvas-doc',
    projectId: 'project-1',
    title: 'Canvas',
    schemaVersion: CANVAS_DOCUMENT_SCHEMA_VERSION,
    revision: 0,
    width: 1024,
    height: 1024,
    background: null,
    assetId: null,
    outputResource: null,
    selectedElementIds: [],
    aiAnnotations: [],
    elements: [
      {
        id: 'element-1',
        type: 'raster',
        mediaType: 'image',
        name: 'Image',
        x: 0,
        y: 0,
        width: 512,
        height: 512,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        blendMode: 'normal',
        assetId: 'asset-image',
        metadata: {
          createdAt: 1,
          sourceElementId: 'element-1',
          media: {
            type: 'image'
          }
        }
      }
    ],
    createdAt: 1,
    updatedAt: 1
  }
}
