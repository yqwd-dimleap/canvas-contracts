import { describe, expect, test } from 'bun:test'
import type { CanvasAgentUiState } from '../src/canvas/agent/ui-state.js'
import { applyCanvasAgentUiEvent } from '../src/canvas/agent/ui-state-reducer.js'
import type { SequencedSystemEvent } from '../src/events/core.js'

function emptyState(): CanvasAgentUiState {
  return {
    threadId: 'thread-1',
    runId: 'run-1',
    turnId: 'run-1',
    parentRunId: null,
    traceId: 'trace-1',
    status: 'running',
    request: null,
    messages: [],
    runtime: null,
    events: [],
    operations: [],
    artifacts: [],
    media: []
  }
}

function sequenced(
  sequence: number,
  event: SequencedSystemEvent['event']
): SequencedSystemEvent {
  return { sequence, event }
}

describe('Canvas Agent shared UI state reducer', () => {
  test('is idempotent when a token event is replayed', () => {
    const event = sequenced(1, {
      id: 'token-1',
      runId: 'run-1',
      timestamp: '2026-07-16T00:00:00.000Z',
      type: 'token.delta',
      tokenId: 'assistant',
      delta: 'hello'
    })

    const once = applyCanvasAgentUiEvent(emptyState(), event)
    const replayed = applyCanvasAgentUiEvent(once, event)

    expect(replayed).toBe(once)
    expect(replayed.messages[0]?.content).toBe('hello')
    expect(replayed.events).toHaveLength(1)
  })

  test('merges tool lifecycle updates into one runtime tool call', () => {
    const started = sequenced(1, {
      id: 'tool-start',
      runId: 'run-1',
      timestamp: '2026-07-16T00:00:00.000Z',
      type: 'tool.start',
      toolId: 'tool-1',
      toolName: 'canvas2d_inspect_scene',
      input: {},
      agentId: 'canvas-agent'
    })
    const completed = sequenced(2, {
      id: 'tool-result',
      runId: 'run-1',
      timestamp: '2026-07-16T00:00:01.000Z',
      type: 'tool.result',
      toolId: 'tool-1',
      toolName: 'canvas2d_inspect_scene',
      result: { count: 1 },
      durationMs: 1000,
      agentId: 'canvas-agent'
    })

    const state = applyCanvasAgentUiEvent(
      applyCanvasAgentUiEvent(emptyState(), started),
      completed
    )

    expect(state.runtime?.tools).toHaveLength(1)
    expect(state.runtime?.tools[0]?.status).toBe('finished')
  })

  test('records a Canvas operation once across replay', () => {
    const operation = sequenced(3, {
      id: 'operation-1',
      runId: 'run-1',
      timestamp: '2026-07-16T00:00:02.000Z',
      type: 'canvas.operation',
      operation: {
        type: 'element.delete',
        payload: {
          documentId: 'document-1',
          elementId: 'element-1'
        }
      }
    })

    const once = applyCanvasAgentUiEvent(emptyState(), operation)
    const replayed = applyCanvasAgentUiEvent(once, operation)

    expect(replayed.operations).toHaveLength(1)
    expect(replayed.operations[0]?.operation.type).toBe('element.delete')
  })

  test('does not regress a terminal status on a late start event', () => {
    const completed = sequenced(4, {
      id: 'completed-1',
      runId: 'run-1',
      timestamp: '2026-07-16T00:00:03.000Z',
      type: 'run.completed',
      artifactIds: [],
      durationMs: 100,
      stats: { toolCalls: 0, eventsEmitted: 1 }
    })
    const lateStarted = sequenced(5, {
      id: 'started-late',
      runId: 'run-1',
      timestamp: '2026-07-16T00:00:04.000Z',
      type: 'run.started',
      intent: 'late',
      mode: 'plan-execute'
    })

    const state = applyCanvasAgentUiEvent(
      applyCanvasAgentUiEvent(emptyState(), completed),
      lateStarted
    )

    expect(state.status).toBe('completed')
  })
})
