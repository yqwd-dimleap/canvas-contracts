import type {
  ProjectCanvasAgentMessage,
  ProjectCanvasAgentMessageStatus
} from '../workspace/conversation.js'
import type { CanvasAgentUiMessage, CanvasAgentUiState } from './ui-state.js'

function messageText(message: CanvasAgentUiMessage): string {
  if (typeof message.content === 'string') return message.content
  return message.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
}

function persistedStatus(
  state: CanvasAgentUiState,
  role: ProjectCanvasAgentMessage['role'],
  runId: string | undefined,
  previous: ProjectCanvasAgentMessage | undefined
): ProjectCanvasAgentMessageStatus {
  if (role === 'user') return 'completed'
  if (!state.runId || runId !== state.runId) {
    return previous?.status ?? 'completed'
  }
  if (state.status === 'queued') return 'pending'
  if (state.status === 'running') return 'streaming'
  if (state.status === 'failed') return 'failed'
  if (state.status === 'cancelled') return 'cancelled'
  return 'completed'
}

function messageRunId(
  id: string,
  state: CanvasAgentUiState
): string | undefined {
  const separator = id.indexOf(':')
  if (separator > 0 && !id.startsWith('optimistic-')) {
    return id.slice(0, separator)
  }
  return state.runId ?? undefined
}

/**
 * Project a LangGraph run's UI state into the durable conversation format.
 *
 * The runtime values frame is a bounded text snapshot: it never carries the
 * persisted title, canvas media/operations, attachments, or applied-result
 * bookkeeping. Those live only on the durable message, so they are carried
 * forward by identity — replacing a message wholesale would silently strip
 * generated media and status detail from history. Existing timestamps are
 * preserved so streaming token frames do not churn message identity.
 *
 * Shared by the frontend store and the canvas-agent terminal write-back; there
 * is exactly one implementation.
 */
export function projectRuntimeConversationMessages(
  state: CanvasAgentUiState,
  existing: readonly ProjectCanvasAgentMessage[],
  options: { now?: number } = {}
): ProjectCanvasAgentMessage[] {
  const now = options.now ?? Date.now()
  const existingById = new Map(existing.map((message) => [message.id, message]))
  const stateTimestamp = state.updatedAt
    ? Date.parse(state.updatedAt)
    : Number.NaN
  const fallbackTimestamp = Number.isFinite(stateTimestamp)
    ? stateTimestamp
    : now

  const projected = state.messages.flatMap(
    (message, index): ProjectCanvasAgentMessage[] => {
      if (message.type !== 'human' && message.type !== 'ai') return []
      // Optimistic messages only bridge the connection window in the runtime
      // view. Persisting them would let a partial state replace durable history.
      if (message.id?.startsWith('optimistic-')) return []
      const role = message.type === 'human' ? 'user' : 'assistant'
      const id =
        typeof message.id === 'string' && message.id.trim()
          ? message.id
          : `${state.threadId ?? 'thread'}:${role}:${index}`
      const previous = existingById.get(id)
      const content = messageText(message)
      const runId = messageRunId(id, state)
      const status = persistedStatus(state, role, runId, previous)
      const traceId =
        runId && runId === state.runId ? state.traceId : previous?.traceId
      return [
        {
          id,
          role,
          content,
          status,
          ...(runId ? { runId } : {}),
          ...(traceId ? { traceId } : {}),
          ...(previous?.title ? { title: previous.title } : {}),
          ...(previous?.canvas ? { canvas: previous.canvas } : {}),
          ...(previous?.attachments?.length
            ? { attachments: previous.attachments }
            : {}),
          ...(typeof previous?.lastEventSequence === 'number'
            ? { lastEventSequence: previous.lastEventSequence }
            : {}),
          ...(typeof previous?.appliedRunResultAt === 'number'
            ? { appliedRunResultAt: previous.appliedRunResultAt }
            : {}),
          createdAt: previous?.createdAt ?? fallbackTimestamp + index,
          updatedAt:
            previous?.content === content && previous.status === status
              ? previous.updatedAt
              : fallbackTimestamp
        }
      ]
    }
  )

  // A live values frame is a bounded runtime snapshot, not the canonical
  // conversation. Reconcile it into the durable local history by identity so a
  // new/partial run can never erase earlier turns.
  const messages = existing.filter(
    (message) => !message.id.startsWith('optimistic-')
  )
  const indices = new Map(messages.map((message, index) => [message.id, index]))
  for (const message of projected) {
    const index = indices.get(message.id)
    if (index === undefined) {
      indices.set(message.id, messages.length)
      messages.push(message)
      continue
    }
    messages[index] = message
  }
  return messages
}

export function conversationMessagesChanged(
  current: readonly ProjectCanvasAgentMessage[],
  next: readonly ProjectCanvasAgentMessage[]
): boolean {
  if (current.length !== next.length) return true
  return current.some((message, index) => {
    const candidate = next[index]
    return (
      !candidate ||
      message.id !== candidate.id ||
      message.role !== candidate.role ||
      message.content !== candidate.content ||
      message.status !== candidate.status ||
      message.runId !== candidate.runId ||
      message.traceId !== candidate.traceId
    )
  })
}
