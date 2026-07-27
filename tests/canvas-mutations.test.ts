import { describe, expect, test } from 'bun:test'
import {
  applyCanvasMutationToDocument,
  CANVAS_DOCUMENT_SCHEMA_VERSION,
  type CanvasDocument,
  canvasMutationSchema
} from '../src/canvas/index.js'

function document(): CanvasDocument {
  return {
    id: 'document-1',
    schemaVersion: CANVAS_DOCUMENT_SCHEMA_VERSION,
    revision: 3,
    title: 'Temporary',
    width: 100,
    height: 100,
    selectedElementIds: [],
    aiAnnotations: [],
    elements: [
      {
        id: 'text-1',
        type: 'text',
        revision: 2,
        name: 'Text',
        text: 'Hello',
        fontFamily: 'Inter',
        x: 0,
        y: 0,
        width: 50,
        height: 20,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        zIndex: 0,
        blendMode: 'normal'
      }
    ],
    createdAt: 1,
    updatedAt: 1
  }
}

function videoDocument(): CanvasDocument {
  return {
    ...document(),
    elements: [
      {
        id: 'video-1',
        type: 'raster',
        revision: 4,
        mediaType: 'video',
        name: 'Generating video',
        x: 12,
        y: 18,
        width: 720,
        height: 405,
        rotation: 0.25,
        scaleX: 1.5,
        scaleY: 0.75,
        opacity: 0.6,
        visible: false,
        locked: true,
        zIndex: 2,
        blendMode: 'screen',
        assetId: null,
        metadata: {
          generation: { status: 'pending', mediaType: 'video' }
        }
      }
    ]
  }
}

describe('Canvas mutation patch semantics', () => {
  test('metadata-only raster patches do not materialize element defaults', () => {
    const mutation = canvasMutationSchema.parse({
      mutationId: 'mutation-video-failed',
      type: 'element.patch',
      payload: {
        documentId: 'document-1',
        elementId: 'video-1',
        elementType: 'raster',
        expectedRevision: 4,
        patch: {
          metadata: {
            generation: {
              status: 'failed',
              mediaType: 'video',
              error: 'Provider timed out'
            }
          }
        }
      }
    })

    expect(mutation.payload.patch).toEqual({
      metadata: {
        generation: {
          status: 'failed',
          mediaType: 'video',
          error: 'Provider timed out'
        }
      }
    })

    const next = applyCanvasMutationToDocument(videoDocument(), mutation, {
      now: 2
    })
    expect(next?.elements[0]).toMatchObject({
      type: 'raster',
      mediaType: 'video',
      rotation: 0.25,
      scaleX: 1.5,
      scaleY: 0.75,
      opacity: 0.6,
      visible: false,
      locked: true,
      blendMode: 'screen',
      assetId: null,
      metadata: {
        generation: {
          status: 'failed',
          mediaType: 'video',
          error: 'Provider timed out'
        }
      }
    })
  })

  test('removes optional document and element fields after wire parsing', () => {
    const withoutTitle = applyCanvasMutationToDocument(
      document(),
      canvasMutationSchema.parse({
        mutationId: 'mutation-1',
        type: 'document.patch',
        payload: {
          documentId: 'document-1',
          expectedRevision: 3,
          patch: {},
          unset: ['title']
        }
      }),
      { now: 2 }
    )
    const withoutFont = applyCanvasMutationToDocument(
      withoutTitle,
      canvasMutationSchema.parse({
        mutationId: 'mutation-2',
        type: 'element.patch',
        payload: {
          documentId: 'document-1',
          elementId: 'text-1',
          elementType: 'text',
          expectedRevision: 2,
          patch: {},
          unset: ['fontFamily']
        }
      }),
      { now: 3 }
    )

    expect(withoutTitle).not.toHaveProperty('title')
    expect(withoutFont?.elements[0]).not.toHaveProperty('fontFamily')
  })

  test('rejects attempts to unset required fields', () => {
    expect(
      canvasMutationSchema.safeParse({
        mutationId: 'mutation-1',
        type: 'element.patch',
        payload: {
          documentId: 'document-1',
          elementId: 'text-1',
          elementType: 'text',
          expectedRevision: 2,
          patch: {},
          unset: ['text']
        }
      }).success
    ).toBe(false)
  })
})
