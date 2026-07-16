import type { CanvasDocument, CanvasDocumentElement } from './document.js'
import {
  canvasDocumentElementSchema,
  canvasDocumentSchema
} from './document.js'
import type { CanvasOperation } from './operations.js'

/**
 * Pure `CanvasOperation → CanvasDocument` reducer.
 *
 * This is the single implementation of how agent-emitted canvas operations
 * materialize into a persisted `CanvasDocument`. The frontend store and the
 * canvas-agent terminal write-back both fold operations through it, so the
 * document a closed tab reloads from the cloud is identical to what a live
 * client would have produced.
 *
 * Only operations that change durable document content are handled:
 * `document.*`, `element.add|patch|delete|reorder`, and `batch`. Ephemeral
 * runtime operations (`element.status|generationProgress|highlight|
 * clearHighlight|select`, `viewport.*`) carry no persisted document state and
 * return the document unchanged.
 */
export function applyCanvasOperationToDocument(
  document: CanvasDocument | null,
  operation: CanvasOperation,
  options: { now?: number } = {}
): CanvasDocument | null {
  const now = options.now ?? Date.now()

  switch (operation.type) {
    case 'batch':
      return operation.payload.operations.reduce(
        (current, item) =>
          applyCanvasOperationToDocument(current, item, { now }),
        document
      )

    case 'document.create': {
      const parsed = canvasDocumentSchema.safeParse(operation.payload.document)
      return parsed.success ? parsed.data : document
    }

    case 'document.patch': {
      if (!document || document.id !== operation.payload.documentId) {
        return document
      }
      const merged = {
        ...document,
        ...operation.payload.patch,
        id: document.id,
        elements: document.elements,
        updatedAt: now
      }
      const parsed = canvasDocumentSchema.safeParse(merged)
      return parsed.success ? parsed.data : document
    }

    case 'document.delete':
      return document && document.id === operation.payload.documentId
        ? null
        : document

    case 'element.add': {
      if (!document || document.id !== operation.payload.documentId) {
        return document
      }
      const parsed = canvasDocumentElementSchema.safeParse(
        operation.payload.element
      )
      if (!parsed.success) return document
      return withElements(
        document,
        upsertElement(document.elements, parsed.data),
        now
      )
    }

    case 'element.patch': {
      if (!document || document.id !== operation.payload.documentId) {
        return document
      }
      const elements = document.elements.map((element) => {
        if (element.id !== operation.payload.elementId) return element
        const merged = {
          ...element,
          ...operation.payload.patch,
          id: element.id,
          type: element.type
        }
        const parsed = canvasDocumentElementSchema.safeParse(merged)
        return parsed.success ? parsed.data : element
      })
      return withElements(document, elements, now)
    }

    case 'element.delete': {
      if (!document || document.id !== operation.payload.documentId) {
        return document
      }
      return withElements(
        document,
        document.elements.filter(
          (element) => element.id !== operation.payload.elementId
        ),
        now
      )
    }

    case 'element.reorder': {
      if (!document || document.id !== operation.payload.documentId) {
        return document
      }
      const elements = document.elements.map((element) =>
        element.id === operation.payload.elementId
          ? ({
              ...element,
              zIndex: operation.payload.zIndex
            } as CanvasDocumentElement)
          : element
      )
      return withElements(document, elements, now)
    }

    default:
      // Ephemeral runtime operations carry no persisted document state.
      return document
  }
}

/** Fold a run's full operation stream onto a document in arrival order. */
export function applyCanvasOperationsToDocument(
  document: CanvasDocument | null,
  operations: readonly CanvasOperation[],
  options: { now?: number } = {}
): CanvasDocument | null {
  return operations.reduce(
    (current, operation) =>
      applyCanvasOperationToDocument(current, operation, options),
    document
  )
}

function upsertElement(
  elements: readonly CanvasDocumentElement[],
  element: CanvasDocumentElement
): CanvasDocumentElement[] {
  const index = elements.findIndex((item) => item.id === element.id)
  if (index === -1) return [...elements, element]
  return elements.map((item) => (item.id === element.id ? element : item))
}

function withElements(
  document: CanvasDocument,
  elements: CanvasDocumentElement[],
  now: number
): CanvasDocument {
  return {
    ...document,
    elements,
    selectedElementIds: document.selectedElementIds.filter((id) =>
      elements.some((element) => element.id === id)
    ),
    updatedAt: now
  }
}
