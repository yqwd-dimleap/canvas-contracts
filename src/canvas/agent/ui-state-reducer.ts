import {
  isCanvasAgentArtifactEvent,
  mediaFromCanvasAgentArtifactEvent,
  mergeCanvasAgentLangGraphRuntimeEvent
} from '../../agent/langgraph-runtime.js'
import type { Artifact } from '../../artifacts/index.js'
import type { SequencedSystemEvent } from '../../events/core.js'
import { reduceAgentRunStatus } from './run-state.js'
import type {
  CanvasAgentUiMessage,
  CanvasAgentUiOperationRecord,
  CanvasAgentUiState
} from './ui-state.js'

/**
 * Applies one canonical runtime event to the UI projection.
 *
 * Both the Agent state builder and browser custom-event stream use this pure
 * reducer. Event IDs make replay/resubscribe idempotent; values frames remain
 * authoritative synchronization anchors.
 */
export function applyCanvasAgentUiEvent(
  state: CanvasAgentUiState,
  event: SequencedSystemEvent
): CanvasAgentUiState {
  const runtimeEvent = event.event
  if (state.events.some((item) => item.event.id === runtimeEvent.id)) {
    return state
  }
  const runtime = mergeCanvasAgentLangGraphRuntimeEvent(
    state.runtime ?? undefined,
    event
  )
  let next: CanvasAgentUiState = {
    ...state,
    runId: runtimeEvent.runId || state.runId,
    traceId:
      typeof runtimeEvent.metadata?.traceId === 'string'
        ? runtimeEvent.metadata.traceId
        : state.traceId,
    runtime,
    events: upsertEvent(state.events, event).slice(-200),
    updatedAt: runtimeEvent.timestamp,
    status: reduceAgentRunStatus(
      state.status === 'idle' ? 'queued' : state.status,
      runtimeEvent
    )
  }

  if (runtimeEvent.type === 'run.failed') {
    next = { ...next, error: runtimeEvent.error.message }
  } else if (runtimeEvent.type === 'run.cancelled') {
    next = { ...next, error: runtimeEvent.reason }
  }

  if (runtimeEvent.type === 'token.delta') {
    next = appendAssistantDelta(
      next,
      runtimeEvent.runId,
      runtimeEvent.tokenId,
      runtimeEvent.delta
    )
  } else if (runtimeEvent.type === 'token.complete') {
    next = setAssistantContent(
      next,
      runtimeEvent.runId,
      runtimeEvent.tokenId,
      runtimeEvent.content
    )
  } else if (runtimeEvent.type === 'canvas.operation') {
    const record: CanvasAgentUiOperationRecord = {
      id:
        runtimeEvent.artifactId ??
        `${runtimeEvent.runId}-${event.sequence ?? runtimeEvent.id}`,
      operation: runtimeEvent.operation,
      ...(runtimeEvent.artifactId
        ? { artifactId: runtimeEvent.artifactId }
        : {}),
      transient: runtimeEvent.transient ?? false,
      sequence:
        typeof runtimeEvent.metadata?.sequence === 'number'
          ? runtimeEvent.metadata.sequence
          : event.sequence,
      timestamp: runtimeEvent.timestamp
    }
    next = {
      ...next,
      operations: upsertById(next.operations, record).slice(-80)
    }
  }

  if (isCanvasAgentArtifactEvent(event)) {
    next = {
      ...next,
      artifacts: mergeArtifact(next.artifacts, event),
      media: mergeMedia(next.media, mediaFromCanvasAgentArtifactEvent(event))
    }
  }

  return next
}

function assistantMessageId(runId: string, tokenId?: string) {
  return tokenId?.trim() ? `${runId}:${tokenId}` : `${runId}:assistant`
}

function upsertMessage(
  state: CanvasAgentUiState,
  message: CanvasAgentUiMessage
): CanvasAgentUiState {
  const id = message.id
  const index = id ? state.messages.findIndex((item) => item.id === id) : -1
  if (index === -1) return { ...state, messages: [...state.messages, message] }
  const messages = [...state.messages]
  messages[index] = { ...messages[index]!, ...message }
  return { ...state, messages }
}

function appendAssistantDelta(
  state: CanvasAgentUiState,
  runId: string,
  tokenId: string | undefined,
  delta: string
): CanvasAgentUiState {
  const id = assistantMessageId(runId, tokenId)
  const existing = state.messages.find((message) => message.id === id)
  const current =
    existing?.type === 'ai' && typeof existing.content === 'string'
      ? existing.content
      : ''
  return upsertMessage(state, {
    id,
    type: 'ai',
    content: `${current}${delta}`
  })
}

function setAssistantContent(
  state: CanvasAgentUiState,
  runId: string,
  tokenId: string | undefined,
  content: string
) {
  return upsertMessage(state, {
    id: assistantMessageId(runId, tokenId),
    type: 'ai',
    content
  })
}

function upsertEvent(
  events: SequencedSystemEvent[],
  next: SequencedSystemEvent
) {
  const index = events.findIndex((item) => item.event.id === next.event.id)
  if (index === -1) return [...events, next]
  const copy = [...events]
  copy[index] = next
  return copy
}

function upsertById<T extends { id: string }>(items: T[], next: T) {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [...items, next]
  const copy = [...items]
  copy[index] = { ...copy[index]!, ...next }
  return copy
}

function mergeArtifact(artifacts: Artifact[], event: SequencedSystemEvent) {
  const runtimeEvent = event.event
  if (runtimeEvent.type === 'artifact.delete') {
    return artifacts.filter(
      (artifact) => artifact.id !== runtimeEvent.artifactId
    )
  }
  if (runtimeEvent.type === 'artifact.update') {
    return runtimeEvent.artifact
      ? upsertById(artifacts, runtimeEvent.artifact)
      : artifacts
  }
  if (
    runtimeEvent.type === 'artifact.create' ||
    runtimeEvent.type === 'artifact.complete'
  ) {
    return upsertById(artifacts, runtimeEvent.artifact)
  }
  return artifacts
}

function mergeMedia<T extends { id: string }>(existing: T[], next: T[]) {
  if (next.length === 0) return existing
  return next.reduce((items, item) => upsertById(items, item), existing)
}
