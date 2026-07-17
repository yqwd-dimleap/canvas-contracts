import type { CanvasDocument, CanvasDocumentElement } from './document.js'
import type { CanvasMutation, CanvasMutationTransaction } from './mutations.js'

function withDocumentRevision(document: CanvasDocument, now: number) {
  return {
    ...document,
    revision: document.revision + 1,
    updatedAt: now
  }
}

/** Pure authoritative mutation reducer with document/element preconditions. */
export function applyCanvasMutationToDocument(
  document: CanvasDocument | null,
  mutation: CanvasMutation,
  options?: { now?: number }
): CanvasDocument | null {
  const now = options?.now ?? Date.now()

  if (mutation.type === 'document.create') {
    return document ? document : mutation.payload.document
  }
  if (!document) return null
  if (mutation.payload.documentId !== document.id) return document

  switch (mutation.type) {
    case 'document.patch':
      if (document.revision !== mutation.payload.expectedRevision) {
        return document
      }
      return withDocumentRevision(
        { ...document, ...mutation.payload.patch },
        now
      )
    case 'document.delete':
      return document.revision === mutation.payload.expectedRevision
        ? null
        : document
    case 'element.add':
      if (document.revision !== mutation.payload.expectedDocumentRevision) {
        return document
      }
      if (
        document.elements.some(
          (element) => element.id === mutation.payload.element.id
        )
      ) {
        return document
      }
      return withDocumentRevision(
        {
          ...document,
          elements: [...document.elements, mutation.payload.element]
        },
        now
      )
    case 'element.patch': {
      const index = document.elements.findIndex(
        (element) => element.id === mutation.payload.elementId
      )
      const element = document.elements[index]
      if (
        !element ||
        element.type !== mutation.payload.elementType ||
        element.revision !== mutation.payload.expectedRevision
      ) {
        return document
      }
      const nextElement = {
        ...element,
        ...mutation.payload.patch,
        id: element.id,
        type: element.type,
        revision: element.revision + 1
      } as CanvasDocumentElement
      const elements = document.elements.slice()
      elements[index] = nextElement
      return withDocumentRevision({ ...document, elements }, now)
    }
    case 'element.delete': {
      const element = document.elements.find(
        (item) => item.id === mutation.payload.elementId
      )
      if (!element || element.revision !== mutation.payload.expectedRevision) {
        return document
      }
      return withDocumentRevision(
        {
          ...document,
          elements: document.elements.filter(
            (item) => item.id !== mutation.payload.elementId
          ),
          selectedElementIds: document.selectedElementIds.filter(
            (id) => id !== mutation.payload.elementId
          )
        },
        now
      )
    }
    case 'element.reorder': {
      const index = document.elements.findIndex(
        (item) => item.id === mutation.payload.elementId
      )
      const element = document.elements[index]
      if (!element || element.revision !== mutation.payload.expectedRevision) {
        return document
      }
      const elements = document.elements.slice()
      elements[index] = {
        ...element,
        zIndex: mutation.payload.zIndex,
        revision: element.revision + 1
      }
      return withDocumentRevision({ ...document, elements }, now)
    }
  }
}

export function applyCanvasMutationTransactionToDocument(
  document: CanvasDocument | null,
  transaction: CanvasMutationTransaction,
  options?: { now?: number }
): CanvasDocument | null {
  const now = options?.now ?? Date.now()
  return transaction.mutations.reduce<CanvasDocument | null>(
    (current, mutation) =>
      applyCanvasMutationToDocument(current, mutation, { now }),
    document
  )
}
