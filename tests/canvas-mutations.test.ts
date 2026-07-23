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

describe('Canvas mutation unset semantics', () => {
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
