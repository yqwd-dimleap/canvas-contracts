import { describe, expect, test } from 'bun:test'
import {
  CANVAS_DOCUMENT_SCHEMA_VERSION,
  type CanvasDocument
} from '../src/canvas/core/document.js'
import {
  applyCanvasMutationToDocument,
  applyCanvasMutationTransactionToDocument
} from '../src/canvas/core/document-operations.js'
import { canvasMutationTransactionSchema } from '../src/canvas/core/mutations.js'

function baseDocument(): CanvasDocument {
  return {
    id: 'doc-1',
    schemaVersion: CANVAS_DOCUMENT_SCHEMA_VERSION,
    revision: 0,
    width: 1024,
    height: 1024,
    selectedElementIds: [],
    aiAnnotations: [],
    elements: [],
    createdAt: 1,
    updatedAt: 1
  }
}

function rasterElement(id: string, x = 0) {
  return {
    id,
    type: 'raster' as const,
    revision: 0,
    name: id,
    x,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 0,
    blendMode: 'normal' as const,
    mediaType: 'image' as const
  }
}

describe('Canvas mutation transaction', () => {
  test('applies a flat transaction and advances document/element revisions', () => {
    const transaction = canvasMutationTransactionSchema.parse({
      transactionId: 'tx-1',
      projectId: 'project-1',
      origin: 'user',
      baseRevision: 0,
      mutations: [
        {
          mutationId: 'add-1',
          type: 'element.add',
          payload: {
            documentId: 'doc-1',
            expectedDocumentRevision: 0,
            element: rasterElement('el-1')
          }
        },
        {
          mutationId: 'patch-1',
          type: 'element.patch',
          payload: {
            documentId: 'doc-1',
            elementId: 'el-1',
            expectedRevision: 0,
            elementType: 'raster',
            patch: { x: 500 }
          }
        }
      ]
    })
    const document = applyCanvasMutationTransactionToDocument(
      baseDocument(),
      transaction,
      { now: 10 }
    )
    expect(document?.revision).toBe(2)
    expect(document?.elements[0]?.revision).toBe(1)
    expect(document?.elements[0]?.x).toBe(500)
    expect(document?.updatedAt).toBe(10)
  })

  test('does not apply a stale element precondition', () => {
    const document = {
      ...baseDocument(),
      elements: [rasterElement('el-1')]
    }
    const same = applyCanvasMutationToDocument(document, {
      mutationId: 'patch-stale',
      type: 'element.patch',
      payload: {
        documentId: 'doc-1',
        elementId: 'el-1',
        expectedRevision: 9,
        elementType: 'raster',
        patch: { x: 100 }
      }
    })
    expect(same).toBe(document)
  })
})
