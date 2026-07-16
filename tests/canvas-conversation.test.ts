import { describe, expect, test } from 'bun:test'
import { projectRuntimeConversationMessages } from '../src/canvas/agent/conversation-projection.js'
import type { CanvasAgentUiState } from '../src/canvas/agent/ui-state.js'
import type { CanvasDocument } from '../src/canvas/core/document.js'
import {
  applyCanvasOperationsToDocument,
  applyCanvasOperationToDocument
} from '../src/canvas/core/document-operations.js'
import { normalizeProjectCanvasConversations } from '../src/canvas/workspace/conversation.js'
import { workspaceProjectCanvasDataSchema } from '../src/canvas/workspace/project.js'

function baseDocument(): CanvasDocument {
  return {
    id: 'doc-1',
    version: 1,
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

describe('applyCanvasOperationToDocument', () => {
  test('folds add/patch/delete/reorder onto a document', () => {
    let doc: CanvasDocument | null = baseDocument()
    doc = applyCanvasOperationToDocument(
      doc,
      {
        type: 'element.add',
        payload: { documentId: 'doc-1', element: rasterElement('el-1') }
      },
      { now: 10 }
    )
    doc = applyCanvasOperationToDocument(
      doc,
      {
        type: 'element.add',
        payload: { documentId: 'doc-1', element: rasterElement('el-2', 200) }
      },
      { now: 11 }
    )
    doc = applyCanvasOperationToDocument(
      doc,
      {
        type: 'element.patch',
        payload: { documentId: 'doc-1', elementId: 'el-1', patch: { x: 500 } }
      },
      { now: 12 }
    )
    doc = applyCanvasOperationToDocument(
      doc,
      {
        type: 'element.reorder',
        payload: { documentId: 'doc-1', elementId: 'el-2', zIndex: 5 }
      },
      { now: 13 }
    )

    expect(doc?.elements.map((element) => element.id)).toEqual(['el-1', 'el-2'])
    expect(doc?.elements.find((el) => el.id === 'el-1')?.x).toBe(500)
    expect(doc?.elements.find((el) => el.id === 'el-2')?.zIndex).toBe(5)
    expect(doc?.updatedAt).toBe(13)

    doc = applyCanvasOperationToDocument(
      doc,
      {
        type: 'element.delete',
        payload: { documentId: 'doc-1', elementId: 'el-1' }
      },
      { now: 14 }
    )
    expect(doc?.elements.map((element) => element.id)).toEqual(['el-2'])
  })

  test('ephemeral operations leave the document untouched', () => {
    const doc = baseDocument()
    const same = applyCanvasOperationsToDocument(doc, [
      {
        type: 'element.select',
        payload: { documentId: 'doc-1', elementIds: ['x'] }
      },
      { type: 'viewport.set', payload: { x: 1, y: 2, zoom: 1 } },
      {
        type: 'element.status',
        payload: { elementId: 'el-1', status: 'generating' }
      }
    ])
    expect(same).toBe(doc)
  })

  test('document.create replaces and document.delete clears', () => {
    const created = applyCanvasOperationToDocument(null, {
      type: 'document.create',
      payload: { document: { ...baseDocument(), id: 'doc-9' } }
    })
    expect(created?.id).toBe('doc-9')
    const deleted = applyCanvasOperationToDocument(created, {
      type: 'document.delete',
      payload: { documentId: 'doc-9' }
    })
    expect(deleted).toBeNull()
  })
})

function runtimeState(
  patch: Partial<CanvasAgentUiState> = {}
): CanvasAgentUiState {
  return {
    threadId: 'conv-1',
    runId: 'run-2',
    turnId: 'turn-2',
    parentRunId: null,
    traceId: 'trace-2',
    status: 'running',
    request: null,
    messages: [
      { id: 'run-2:user', type: 'human', content: 'hello' },
      { id: 'run-2:assistant', type: 'ai', content: 'streaming' }
    ],
    runtime: null,
    events: [],
    operations: [],
    artifacts: [],
    media: [],
    updatedAt: '2026-07-16T10:00:00.000Z',
    ...patch
  }
}

describe('projectRuntimeConversationMessages (shared)', () => {
  test('projects human/ai and carries durable media forward', () => {
    const durable = projectRuntimeConversationMessages(runtimeState(), [], {
      now: 1
    })
    const enriched = durable.map((message) =>
      message.id === 'run-2:assistant'
        ? {
            ...message,
            canvas: {
              media: [
                { id: 'm-1', type: 'image' as const, url: 'https://x/a.png' }
              ]
            }
          }
        : message
    )
    const next = projectRuntimeConversationMessages(
      runtimeState({ updatedAt: '2026-07-16T10:00:01.000Z' }),
      enriched,
      { now: 2 }
    )
    expect(
      next.find((m) => m.id === 'run-2:assistant')?.canvas?.media?.[0]?.url
    ).toBe('https://x/a.png')
  })
})

describe('normalizeProjectCanvasConversations', () => {
  test('drops invalid rows, derives title, keeps valid media', () => {
    const normalized = normalizeProjectCanvasConversations([
      null,
      { id: '', messages: 'nope' },
      {
        id: 'conv-1',
        threadId: 'conv-1',
        messages: [
          { id: 'm1', role: 'user', content: '把它做成视频' },
          {
            id: 'm2',
            role: 'assistant',
            content: 'done',
            canvas: {
              media: [{ id: 'x', type: 'image', url: 'https://x/a.png' }]
            }
          },
          { id: 'bad', role: 'nope', content: 'x' }
        ]
      }
    ])
    expect(normalized).toHaveLength(2)
    const conv = normalized.find((c) => c.id === 'conv-1')
    expect(conv?.title).toBe('把它做成视频')
    expect(conv?.messages).toHaveLength(2)
    expect(conv?.messages[1]?.canvas?.media?.[0]?.url).toBe('https://x/a.png')
  })

  test('canvas data schema normalizes conversations through parse', () => {
    const parsed = workspaceProjectCanvasDataSchema.parse({
      conversations: [{ id: 'c', threadId: null, messages: [] }]
    })
    expect(parsed.conversations[0]?.id).toBe('c')
    expect(parsed.conversations[0]?.title).toBe('新对话')
  })
})
