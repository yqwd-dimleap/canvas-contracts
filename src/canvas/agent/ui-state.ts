import type {
  CanvasAgentArtifactMedia,
  CanvasAgentLangGraphRuntime
} from '../../agent/langgraph-runtime.js'
import type { Artifact } from '../../artifacts/index.js'
import type { SequencedSystemEvent } from '../../events/core.js'
import type { CanvasOperation } from '../core/operations.js'
import type { CanvasRunRequest } from './actions.js'
import type { AgentRunStatus } from './run-state.js'

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

/**
 * UI 状态里回传的请求投影。
 *
 * 有意剥掉重字段（canvas 文档快照、conversation 历史、capabilities 清单）：
 * 这些只在 run 启动时对 agent 有意义，UI 只消费 intent/command/selection 等
 * 轻量字段。values 帧会随事件反复推送，携带全量请求会造成 O(n²) 传输放大。
 */
export type CanvasAgentUiRequest = {
  intent: CanvasRunRequest['intent']
  command?: CanvasRunRequest['command']
  selection: CanvasRunRequest['selection']
  projectId?: CanvasRunRequest['projectId']
  locale?: CanvasRunRequest['locale']
  modelId?: CanvasRunRequest['modelId']
  reasoningEffort?: CanvasRunRequest['reasoningEffort']
  skillId?: CanvasRunRequest['skillId']
}

/** 将完整运行请求投影为 UI 状态请求（丢弃画布快照等重字段）。 */
export function toCanvasAgentUiRequest(
  request: CanvasRunRequest
): CanvasAgentUiRequest {
  return {
    intent: request.intent,
    ...(request.command !== undefined ? { command: request.command } : {}),
    selection: request.selection,
    ...(request.projectId !== undefined
      ? { projectId: request.projectId }
      : {}),
    ...(request.locale !== undefined ? { locale: request.locale } : {}),
    ...(request.modelId !== undefined ? { modelId: request.modelId } : {}),
    ...(request.reasoningEffort !== undefined
      ? { reasoningEffort: request.reasoningEffort }
      : {}),
    ...(request.skillId !== undefined ? { skillId: request.skillId } : {})
  }
}

export type CanvasAgentUiState = {
  threadId: string | null
  runId: string | null
  turnId: string | null
  parentRunId: string | null
  traceId: string | null
  status: 'idle' | AgentRunStatus
  request: CanvasAgentUiRequest | null
  messages: CanvasAgentUiMessage[]
  runtime: CanvasAgentLangGraphRuntime | null
  events: SequencedSystemEvent[]
  operations: CanvasAgentUiOperationRecord[]
  artifacts: Artifact[]
  media: CanvasAgentArtifactMedia[]
  error?: string
  updatedAt?: string
}
