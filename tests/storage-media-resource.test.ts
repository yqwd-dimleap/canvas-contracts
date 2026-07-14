import { describe, expect, test } from 'bun:test'
import type { CanvasDocument } from '../src/canvas/document.js'
import type { CanvasResource } from '../src/canvas/resources.js'
import { workspaceProjectCanvasDataSchema } from '../src/canvas/workspace/project.js'
import {
  compactCanvasDocumentAssetReferences,
  getImageModelReferenceUrl,
  readCanvasImageOutputResource,
  readCanvasVideoOutputResource,
  resolveCanvasDocumentAssetReferences,
  workspaceAssetMediaForContext
} from '../src/storage/workspace-assets.js'

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
    expect(workspaceAssetMediaForContext(animatedImage, 'canvasTexture')).toBe(
      'https://imgproxy.example.com/preview.avif'
    )
    expect(workspaceAssetMediaForContext(animatedImage, 'canvas')).toBe(
      'https://assets.example.com/source.gif'
    )
    expect(workspaceAssetMediaForContext(animatedImage, 'preview')).toBe(
      'https://assets.example.com/source.gif'
    )
    expect(workspaceAssetMediaForContext(animatedImage, 'thumbnail')).toBe(
      'https://assets.example.com/source.gif'
    )
    expect(workspaceAssetMediaForContext(animatedImage, 'download')).toBe(
      'https://assets.example.com/source.gif'
    )
    expect(getImageModelReferenceUrl(animatedImage)).toBe(
      'https://assets.example.com/source.gif'
    )
  })
})

describe('canvas media output resource readers', () => {
  test('image output ignores legacy resource url without media metadata or asset', () => {
    const resource: CanvasResource = {
      id: 'image-output',
      type: 'image',
      url: 'https://assets.example.com/generated-image.png',
      createdAt: 1,
      createdBy: 'element-1'
    }

    expect(readCanvasImageOutputResource([resource], 'element-1')).toBeNull()
  })

  test('image output resolves compact asset reference from project assets', () => {
    const resource: CanvasResource = {
      id: 'asset-image',
      type: 'image',
      url: '',
      assetId: 'asset-image',
      createdAt: 1,
      createdBy: 'element-1'
    }

    const output = readCanvasImageOutputResource([resource], 'element-1', {
      assets: [
        {
          id: 'asset-image',
          type: 'image',
          name: 'generated-image',
          mimeType: 'image/png',
          size: 1024,
          url: 'https://assets.example.com/from-asset.png',
          metadata: {}
        }
      ]
    })

    expect(output).toMatchObject({
      url: 'https://assets.example.com/from-asset.png',
      assetId: 'asset-image'
    })
    expect(output?.resource.url).toBe(
      'https://assets.example.com/from-asset.png'
    )
  })

  test('video output ignores legacy resource url without media metadata or asset', () => {
    const resource: CanvasResource = {
      id: 'video-output',
      type: 'video',
      url: 'https://assets.example.com/generated-video.mp4',
      createdAt: 1,
      createdBy: 'element-2'
    }

    expect(readCanvasVideoOutputResource([resource], 'element-2')).toBeNull()
  })

  test('video output resolves compact asset reference from project assets', () => {
    const resource: CanvasResource = {
      id: 'asset-video',
      type: 'video',
      url: '',
      assetId: 'asset-video',
      createdAt: 1,
      createdBy: 'element-2'
    }

    const output = readCanvasVideoOutputResource([resource], 'element-2', {
      assets: [
        {
          id: 'asset-video',
          type: 'video',
          name: 'generated-video',
          mimeType: 'video/mp4',
          size: 2048,
          url: 'https://assets.example.com/from-asset.mp4',
          metadata: {}
        }
      ]
    })

    expect(output).toMatchObject({
      url: 'https://assets.example.com/from-asset.mp4',
      assetId: 'asset-video'
    })
    expect(output?.resource.url).toBe(
      'https://assets.example.com/from-asset.mp4'
    )
  })

  test('image output resolves compact asset reference from asset storage metadata', () => {
    const resource: CanvasResource = {
      id: 'asset-image',
      type: 'image',
      url: '',
      assetId: 'asset-image',
      createdAt: 1,
      createdBy: 'element-1'
    }

    const output = readCanvasImageOutputResource([resource], 'element-1', {
      assets: [
        {
          id: 'asset-image',
          type: 'image',
          name: 'uploaded-image',
          mimeType: 'image/png',
          size: 1024,
          url: null,
          metadata: {
            storage: {
              key: 'objects/upload.png',
              viewPath: '/api/storage/objects/upload.png'
            }
          }
        }
      ]
    })

    expect(output?.url).toBe('/api/storage/objects/upload.png')
    expect(output?.resource.url).toBe('/api/storage/objects/upload.png')
  })
})

describe('canvas document asset references', () => {
  test('document asset resolution does not copy asset media onto elements', () => {
    const document = canvasDocumentWithRasterMediaMetadata()
    const resolved = resolveCanvasDocumentAssetReferences(
      document,
      new Map([
        [
          'asset-image',
          {
            id: 'asset-image',
            type: 'image',
            name: 'asset image',
            mimeType: 'image/png',
            size: 1024,
            url: 'https://assets.example.com/from-asset.png',
            metadata: {
              media: {
                type: 'image',
                original: {
                  url: 'https://assets.example.com/original.png',
                  key: 'images/original.png',
                  mimeType: 'image/png',
                  size: 1024
                }
              }
            }
          }
        ]
      ])
    )

    expect(resolved.elements[0]?.assetId).toBe('asset-image')
    expect(resolved.elements[0]?.metadata).toEqual({
      createdAt: 1,
      sourceElementId: 'element-1'
    })
  })

  test('compact document asset references strips element media metadata', () => {
    const compacted = compactCanvasDocumentAssetReferences(
      canvasDocumentWithRasterMediaMetadata()
    )

    expect(compacted.elements[0]?.assetId).toBe('asset-image')
    expect(compacted.elements[0]?.metadata).toEqual({
      createdAt: 1,
      sourceElementId: 'element-1'
    })
  })

  test('document asset resolution records raster video media type', () => {
    const document = canvasDocumentWithRasterMediaMetadata()
    const resolved = resolveCanvasDocumentAssetReferences(
      {
        ...document,
        elements: document.elements.map((element) =>
          element.type === 'raster'
            ? { ...element, assetId: 'asset-video', mediaType: 'image' }
            : element
        )
      },
      new Map([
        [
          'asset-video',
          {
            id: 'asset-video',
            type: 'video',
            name: 'asset video',
            mimeType: 'video/mp4',
            size: 2048,
            url: 'https://assets.example.com/from-asset.mp4',
            metadata: {}
          }
        ]
      ])
    )

    expect(resolved.elements[0]?.assetId).toBe('asset-video')
    expect(resolved.elements[0]?.type).toBe('raster')
    if (resolved.elements[0]?.type === 'raster') {
      expect(resolved.elements[0].mediaType).toBe('video')
    }
  })
})

describe('workspace project canvas resources', () => {
  test('v2 canvas resources require the Canvas2D payload shape', () => {
    const document = canvasDocumentWithRasterMediaMetadata()
    const parsed = workspaceProjectCanvasDataSchema.parse({
      schemaVersion: 2,
      canvasDocument: document,
      conversations: [],
      activeConversationId: null
    })

    expect(parsed.schemaVersion).toBe(2)
    expect(parsed.canvasDocument?.id).toBe(document.id)
  })

  test('deprecated graph canvas resources are rejected', () => {
    const document = canvasDocumentWithRasterMediaMetadata()
    const result = workspaceProjectCanvasDataSchema.safeParse({
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
    version: 1,
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
