import type {
  CanvasAgentArtifactMedia,
  CanvasAgentLangGraphRuntime
} from '../../agent/langgraph-runtime.js'
import type { Artifact } from '../../artifacts/index.js'
import type { SequencedSystemEvent } from '../../events/core.js'
import type { CanvasOperation } from '../core/operations.js'
import type { CanvasRunRequest } from './actions.js'

export type CanvasAgentUiTextContent = {
  type: 'text'
  text: string
}

export type CanvasAgentUiImageContent = {
  type: 'image_url'
  image_url:
    | string
    | {
        url: string
        detail?: 'auto' | 'low' | 'high'
      }
}

export type CanvasAgentUiMessageContent =
  | string
  | Array<CanvasAgentUiTextContent | CanvasAgentUiImageContent>

export type CanvasAgentUiToolCall = {
  id?: string
  name: string
  args: Record<string, unknown>
  type?: 'tool_call'
}

export type CanvasAgentUiMessage =
  | {
      id?: string
      type: 'human'
      content: CanvasAgentUiMessageContent
      name?: string
      additional_kwargs?: Record<string, unknown>
      response_metadata?: Record<string, unknown>
    }
  | {
      id?: string
      type: 'ai'
      content: CanvasAgentUiMessageContent
      name?: string
      tool_calls?: CanvasAgentUiToolCall[]
      invalid_tool_calls?: Array<Record<string, unknown>>
      additional_kwargs?: Record<string, unknown>
      response_metadata?: Record<string, unknown>
      usage_metadata?: Record<string, unknown>
    }
  | {
      id?: string
      type: 'tool'
      content: CanvasAgentUiMessageContent
      tool_call_id: string
      status?: 'success' | 'error'
      artifact?: unknown
      name?: string
      additional_kwargs?: Record<string, unknown>
      response_metadata?: Record<string, unknown>
    }
  | {
      id?: string
      type: 'system'
      content: CanvasAgentUiMessageContent
      name?: string
      additional_kwargs?: Record<string, unknown>
      response_metadata?: Record<string, unknown>
    }

export type CanvasAgentUiOperationRecord = {
  id: string
  operation: CanvasOperation
  artifactId?: string
  transient?: boolean
  sequence?: number
  timestamp?: string
}

export type CanvasAgentUiState = {
  threadId: string | null
  runId: string | null
  traceId: string | null
  status:
    | 'idle'
    | 'queued'
    | 'running'
    | 'interrupted'
    | 'completed'
    | 'failed'
    | 'cancelled'
  request: CanvasRunRequest | null
  messages: CanvasAgentUiMessage[]
  runtime: CanvasAgentLangGraphRuntime | null
  events: SequencedSystemEvent[]
  operations: CanvasAgentUiOperationRecord[]
  artifacts: Artifact[]
  media: CanvasAgentArtifactMedia[]
  error?: string
  updatedAt?: string
}
