import type { Artifact } from '../artifacts/index.js'
import type { CanvasOperation } from '../canvas/core/operations.js'
import type { SequencedSystemEvent, SystemEvent } from '../events/core.js'
import {
  type CanvasAgentSuggestionChoice,
  canvasAgentSuggestionChoices
} from './suggestions.js'

export type CanvasAgentActivityPhase =
  | 'initializing'
  | 'reasoning'
  | 'responding'
  | 'tooling'
  | 'applying'
  | 'finalizing'

export type CanvasAgentLangGraphMessage = {
  id: string
  role: 'assistant'
  status: 'streaming' | 'completed'
  textLength: number
  updatedAt: string
}

export type CanvasAgentLangGraphTool = {
  id: string
  name: string
  status: 'running' | 'finished' | 'error' | 'cancelled'
  inputPreview?: string
  outputPreview?: string
  error?: string
  progress?: number
  stage?: string
  startedAt: string
  updatedAt: string
  completedAt?: string
}

export type CanvasAgentLangGraphInterrupt = {
  id: string
  reason: string
  needsUserInput: boolean
  suggestions?: CanvasAgentSuggestionChoice[]
  status: 'waiting' | 'resolved'
  createdAt: string
  updatedAt: string
}

export type CanvasAgentLangGraphCanvasEvent = {
  id: string
  type: 'canvas' | 'artifact'
  label: string
  sequence?: number
  timestamp: string
  documentIds?: string[]
  elementIds?: string[]
  resourceIds?: string[]
  artifactId?: string
}

export type CanvasAgentLangGraphRuntime = {
  transport: 'langgraph'
  phase: CanvasAgentActivityPhase
  currentActivity?: string
  startedAt?: string
  completedAt?: string
  updatedAt: string
  messages: CanvasAgentLangGraphMessage[]
  tools: CanvasAgentLangGraphTool[]
  interrupts: CanvasAgentLangGraphInterrupt[]
  suggestions: CanvasAgentSuggestionChoice[]
  canvasEvents: CanvasAgentLangGraphCanvasEvent[]
}

export type CanvasAgentArtifactMedia = {
  id: string
  type: 'image' | 'video'
  url: string
  assetId?: string | null
  mimeType?: string
  prompt?: string
  elementId?: string
  actionId?: string
  status?: 'pending' | 'running' | 'succeeded' | 'failed'
  metadata?: Record<string, unknown> | null
}

export type CanvasAgentArtifactSystemEvent = SequencedSystemEvent & {
  event: Extract<
    SystemEvent,
    {
      type:
        | 'artifact.create'
        | 'artifact.update'
        | 'artifact.complete'
        | 'artifact.delete'
    }
  >
}

const INTERNAL_ERROR_NEEDLES = [
  'cannot read',
  'undefined',
  'structured output',
  'structuredresponse',
  'typeerror',
  'syntaxerror',
  'zod',
  'schema',
  'parse',
  'langchain',
  'deep agent',
  'stack',
  'trace',
  'http ',
  'fetch failed',
  'websocket connection'
] as const

function isZh(locale?: string | null) {
  return locale?.toLowerCase().startsWith('zh') ?? true
}

function textFromUnknown(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (value instanceof Error) return value.message.trim()
  return ''
}

export function isInternalCanvasAgentErrorMessage(value: unknown) {
  const message = textFromUnknown(value)
  if (!message) return true
  const lower = message.toLowerCase()
  return (
    message.length > 180 ||
    INTERNAL_ERROR_NEEDLES.some((needle) => lower.includes(needle))
  )
}

export function userFacingCanvasAgentErrorMessage(
  value: unknown,
  options?: { locale?: string | null }
) {
  const message = textFromUnknown(value)
  if (!message || isInternalCanvasAgentErrorMessage(message)) {
    return isZh(options?.locale)
      ? '这次处理没有完成。我已保留可用更新，请稍后重试或换一种描述。'
      : 'This agent run did not complete. Available canvas updates were kept; try again later or rephrase the request.'
  }
  return message
}

type CanvasOperationTargets = {
  documentIds: string[]
  elementIds: string[]
  resourceIds: string[]
}

function compactUnique(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  )
}

function mergeCanvasOperationTargets(
  targets: CanvasOperationTargets[]
): CanvasOperationTargets {
  return {
    documentIds: compactUnique(targets.flatMap((target) => target.documentIds)),
    elementIds: compactUnique(targets.flatMap((target) => target.elementIds)),
    resourceIds: compactUnique(targets.flatMap((target) => target.resourceIds))
  }
}

export function targetsFromOperation(
  operation: CanvasOperation
): CanvasOperationTargets {
  switch (operation.type) {
    case 'document.create':
      return {
        documentIds: [operation.payload.document.id],
        elementIds: [],
        resourceIds: []
      }
    case 'document.patch':
    case 'document.delete':
      return {
        documentIds: [operation.payload.documentId],
        elementIds: [],
        resourceIds: []
      }
    case 'element.add':
      return {
        documentIds: [operation.payload.documentId],
        elementIds: [operation.payload.element.id],
        resourceIds: []
      }
    case 'element.patch':
    case 'element.delete':
    case 'element.reorder':
      return {
        documentIds: [operation.payload.documentId],
        elementIds: [operation.payload.elementId],
        resourceIds: []
      }
    case 'element.select':
      return {
        documentIds: [operation.payload.documentId],
        elementIds: operation.payload.elementIds,
        resourceIds: []
      }
    case 'element.status':
    case 'element.generationProgress':
      return {
        documentIds: compactUnique([operation.payload.documentId]),
        elementIds: [operation.payload.elementId],
        resourceIds: []
      }
    case 'element.highlight':
      return {
        documentIds: compactUnique([operation.payload.documentId]),
        elementIds: operation.payload.elementIds,
        resourceIds: []
      }
    case 'element.clearHighlight':
      return {
        documentIds: compactUnique([operation.payload.documentId]),
        elementIds: operation.payload.elementIds ?? [],
        resourceIds: []
      }
    case 'viewport.set':
      return { documentIds: [], elementIds: [], resourceIds: [] }
    case 'viewport.focus':
      return {
        documentIds: compactUnique([operation.payload.documentId]),
        elementIds: compactUnique([operation.payload.elementId]),
        resourceIds: []
      }
    case 'batch':
      return mergeCanvasOperationTargets(
        operation.payload.operations.map(targetsFromOperation)
      )
  }
}

export function targetsFromArtifact(
  artifact: Artifact
): CanvasOperationTargets {
  if (artifact.type === 'canvas-operation') {
    return targetsFromOperation(artifact.content.operation)
  }
  if (artifact.type === 'image' || artifact.type === 'video') {
    return {
      documentIds: [],
      elementIds: compactUnique([artifact.content.elementId]),
      resourceIds: compactUnique([artifact.content.assetId ?? undefined])
    }
  }
  return { documentIds: [], elementIds: [], resourceIds: [] }
}

export function isCanvasAgentArtifactEvent(
  event: SequencedSystemEvent
): event is CanvasAgentArtifactSystemEvent {
  return (
    event.event.type === 'artifact.create' ||
    event.event.type === 'artifact.update' ||
    event.event.type === 'artifact.complete' ||
    event.event.type === 'artifact.delete'
  )
}

function nowIso() {
  return new Date().toISOString()
}

function eventTimestamp(event: SequencedSystemEvent) {
  return event.event.timestamp || nowIso()
}

function previewValue(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim().slice(0, 120)
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (!value || typeof value !== 'object') return fallback
  try {
    return JSON.stringify(value).slice(0, 120)
  } catch {
    return fallback
  }
}

function toolNameFromRuntimeEvent(event: SequencedSystemEvent) {
  const runtimeEvent = event.event
  if (runtimeEvent.type === 'tool.start') return runtimeEvent.toolName
  if (
    runtimeEvent.type === 'tool.progress' ||
    runtimeEvent.type === 'tool.result' ||
    runtimeEvent.type === 'tool.error'
  ) {
    return runtimeEvent.toolId
  }
  return 'tool'
}

function toolIdFromRuntimeEvent(event: SequencedSystemEvent) {
  const runtimeEvent = event.event
  if (
    runtimeEvent.type === 'tool.start' ||
    runtimeEvent.type === 'tool.progress' ||
    runtimeEvent.type === 'tool.result' ||
    runtimeEvent.type === 'tool.error'
  ) {
    return runtimeEvent.toolId
  }
  return runtimeEvent.id
}

function upsertById<T extends { id: string }>(
  items: T[],
  next: T,
  limit: number
) {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [...items, next].slice(-limit)
  const updated = [...items]
  updated[index] = { ...updated[index], ...next }
  return updated
}

function activityPhaseFromRuntimeEvent(
  event: SequencedSystemEvent,
  previous: CanvasAgentActivityPhase | undefined
): CanvasAgentActivityPhase {
  const runtimeEvent = event.event
  if (runtimeEvent.type === 'run.started') return 'initializing'
  if (runtimeEvent.type === 'agent.thinking') return 'reasoning'
  if (
    runtimeEvent.type === 'token.delta' ||
    runtimeEvent.type === 'token.complete'
  ) {
    return 'responding'
  }
  if (runtimeEvent.type.startsWith('tool.')) return 'tooling'
  if (
    runtimeEvent.type.startsWith('canvas.') ||
    runtimeEvent.type.startsWith('artifact.')
  ) {
    return 'applying'
  }
  if (
    runtimeEvent.type === 'run.completed' ||
    runtimeEvent.type === 'run.failed' ||
    runtimeEvent.type === 'run.cancelled'
  ) {
    return 'finalizing'
  }
  return previous ?? 'initializing'
}

function activityFromRuntimeEvent(event: SequencedSystemEvent) {
  const runtimeEvent = event.event
  if (runtimeEvent.type === 'agent.thinking') return runtimeEvent.thought
  if (runtimeEvent.type === 'run.started') {
    return '正在确认已有内容...'
  }
  if (runtimeEvent.type === 'token.delta') return '正在生成回复...'
  if (runtimeEvent.type === 'token.complete') {
    return '回复已生成，正在整理结果...'
  }
  if (runtimeEvent.type === 'tool.start') {
    return toolActivityLabel(runtimeEvent.toolName)
  }
  if (runtimeEvent.type === 'tool.progress') {
    return runtimeEvent.message || runtimeEvent.stage || '正在处理...'
  }
  if (runtimeEvent.type === 'tool.result') return '处理结果已返回。'
  if (runtimeEvent.type === 'tool.error') {
    return '有一步没有完成，正在调整后续步骤。'
  }
  if (runtimeEvent.type === 'canvas.operation') return '正在应用结果...'
  if (runtimeEvent.type === 'artifact.create') return '正在准备结果...'
  if (runtimeEvent.type === 'artifact.update') return '正在更新结果...'
  if (runtimeEvent.type === 'artifact.complete') return '结果已准备好。'
  if (runtimeEvent.type === 'agent.interrupt') return runtimeEvent.reason
  if (runtimeEvent.type === 'run.failed') {
    return userFacingCanvasAgentErrorMessage(runtimeEvent.error.message)
  }
  if (runtimeEvent.type === 'run.cancelled') {
    return runtimeEvent.reason ?? '已停止本次处理。'
  }
  return undefined
}

function toolActivityLabel(name: string) {
  const normalized = name.toLowerCase().replaceAll('.', '_')
  if (
    normalized === 'canvas_inspect' ||
    normalized === 'canvas_inspect_assets' ||
    normalized === 'canvas2d_inspect_scene' ||
    normalized === 'canvas2d_inspect_elements' ||
    normalized === 'canvas2d_inspect_selection'
  ) {
    return '正在查看当前内容...'
  }
  if (
    normalized === 'canvas2d_search_recipes' ||
    normalized === 'prompt_search_templates'
  ) {
    return '正在查找参考方案...'
  }
  if (normalized === 'canvas2d_submit_plan') {
    return '正在整理下一步...'
  }
  if (normalized === 'canvas2d_request_user_input') {
    return '正在等待你的确认...'
  }
  if (normalized === 'canvas2d_execute_actions') {
    return '正在应用画布更新...'
  }
  return '正在处理...'
}

function canvasLabelFromRuntimeEvent(event: SequencedSystemEvent) {
  const runtimeEvent = event.event
  if (runtimeEvent.type === 'canvas.operation') return '内容已更新'
  if (runtimeEvent.type === 'artifact.complete') return '结果已完成'
  if (runtimeEvent.type === 'artifact.update') return '结果已更新'
  if (runtimeEvent.type === 'artifact.create') return '结果已创建'
  return '内容事件'
}

function canvasEventFromRuntimeEvent(
  event: SequencedSystemEvent
): CanvasAgentLangGraphCanvasEvent | null {
  const runtimeEvent = event.event
  if (runtimeEvent.type === 'canvas.operation') {
    return {
      id: runtimeEvent.id,
      type: 'canvas',
      label: canvasLabelFromRuntimeEvent(event),
      sequence: event.sequence,
      timestamp: eventTimestamp(event),
      ...targetsFromOperation(runtimeEvent.operation),
      artifactId: runtimeEvent.artifactId
    }
  }
  if (isCanvasAgentArtifactEvent(event)) {
    const artifact =
      event.event.type === 'artifact.update'
        ? event.event.artifact
        : event.event.type === 'artifact.delete'
          ? undefined
          : event.event.artifact
    return {
      id: event.event.id,
      type: 'artifact',
      label: canvasLabelFromRuntimeEvent(event),
      sequence: event.sequence,
      timestamp: eventTimestamp(event),
      ...(artifact ? targetsFromArtifact(artifact) : {}),
      artifactId: event.event.artifactId
    }
  }
  return null
}

export function mergeCanvasAgentLangGraphRuntimeEvent(
  existing: CanvasAgentLangGraphRuntime | undefined,
  event: SequencedSystemEvent
): CanvasAgentLangGraphRuntime {
  const runtimeEvent = event.event
  const timestamp = eventTimestamp(event)
  let next: CanvasAgentLangGraphRuntime = {
    transport: 'langgraph',
    phase: activityPhaseFromRuntimeEvent(event, existing?.phase),
    currentActivity:
      activityFromRuntimeEvent(event) ?? existing?.currentActivity,
    startedAt:
      existing?.startedAt ??
      (runtimeEvent.type === 'run.started' ? timestamp : undefined),
    completedAt:
      runtimeEvent.type === 'run.completed' ||
      runtimeEvent.type === 'run.failed' ||
      runtimeEvent.type === 'run.cancelled'
        ? timestamp
        : existing?.completedAt,
    updatedAt: timestamp,
    messages: existing?.messages ?? [],
    tools: existing?.tools ?? [],
    interrupts: existing?.interrupts ?? [],
    suggestions: existing?.suggestions ?? [],
    canvasEvents: existing?.canvasEvents ?? []
  }

  if (runtimeEvent.type === 'token.delta') {
    const id = runtimeEvent.tokenId ?? `${runtimeEvent.runId}:assistant`
    const previous = next.messages.find((message) => message.id === id)
    next = {
      ...next,
      messages: upsertById(
        next.messages,
        {
          id,
          role: 'assistant',
          status: 'streaming',
          textLength: (previous?.textLength ?? 0) + runtimeEvent.delta.length,
          updatedAt: timestamp
        },
        8
      )
    }
  }

  if (runtimeEvent.type === 'token.complete') {
    const id = runtimeEvent.tokenId ?? `${runtimeEvent.runId}:assistant`
    next = {
      ...next,
      messages: upsertById(
        next.messages,
        {
          id,
          role: 'assistant',
          status: 'completed',
          textLength: runtimeEvent.content.length,
          updatedAt: timestamp
        },
        8
      )
    }
  }

  if (runtimeEvent.type.startsWith('tool.')) {
    const id = toolIdFromRuntimeEvent(event)
    const previous = next.tools.find((tool) => tool.id === id)
    const base = {
      id,
      name: previous?.name ?? toolNameFromRuntimeEvent(event),
      inputPreview: previous?.inputPreview,
      outputPreview: previous?.outputPreview,
      error: previous?.error,
      progress: previous?.progress,
      stage: previous?.stage,
      startedAt: previous?.startedAt ?? timestamp,
      updatedAt: timestamp,
      completedAt: previous?.completedAt
    }
    if (runtimeEvent.type === 'tool.start') {
      next = {
        ...next,
        tools: upsertById(
          next.tools,
          {
            ...base,
            name: runtimeEvent.toolName,
            status: 'running',
            inputPreview: previewValue(runtimeEvent.input)
          },
          12
        )
      }
    } else if (runtimeEvent.type === 'tool.progress') {
      next = {
        ...next,
        tools: upsertById(
          next.tools,
          {
            ...base,
            status: 'running',
            progress: runtimeEvent.progress,
            stage: runtimeEvent.stage ?? runtimeEvent.message
          },
          12
        )
      }
    } else if (runtimeEvent.type === 'tool.result') {
      next = {
        ...next,
        tools: upsertById(
          next.tools,
          {
            ...base,
            status: 'finished',
            outputPreview: previewValue(runtimeEvent.result, '已返回结果'),
            completedAt: timestamp
          },
          12
        )
      }
    } else if (runtimeEvent.type === 'tool.error') {
      next = {
        ...next,
        tools: upsertById(
          next.tools,
          {
            ...base,
            status: 'error',
            error: userFacingCanvasAgentErrorMessage(
              runtimeEvent.error.message
            ),
            completedAt: timestamp
          },
          12
        )
      }
    }
  }

  if (runtimeEvent.type === 'agent.interrupt') {
    next = {
      ...next,
      interrupts: upsertById(
        next.interrupts,
        {
          id: runtimeEvent.id,
          reason: runtimeEvent.reason,
          needsUserInput: runtimeEvent.needsUserInput,
          suggestions: canvasAgentSuggestionChoices(
            runtimeEvent.metadata?.suggestions
          ),
          status: 'waiting',
          createdAt:
            next.interrupts.find(
              (interrupt) => interrupt.id === runtimeEvent.id
            )?.createdAt ?? timestamp,
          updatedAt: timestamp
        },
        6
      )
    }
  }

  if (runtimeEvent.type === 'agent.suggestions') {
    next = {
      ...next,
      suggestions: canvasAgentSuggestionChoices(runtimeEvent.suggestions)
    }
  }

  const canvasEvent = canvasEventFromRuntimeEvent(event)
  if (canvasEvent) {
    next = {
      ...next,
      canvasEvents: upsertById(next.canvasEvents, canvasEvent, 16)
    }
  }

  if (
    runtimeEvent.type === 'run.completed' ||
    runtimeEvent.type === 'run.failed' ||
    runtimeEvent.type === 'run.cancelled'
  ) {
    next = {
      ...next,
      interrupts: next.interrupts.map((interrupt) =>
        interrupt.status === 'waiting'
          ? { ...interrupt, status: 'resolved', updatedAt: timestamp }
          : interrupt
      ),
      tools: next.tools.map((tool) =>
        tool.status === 'running'
          ? {
              ...tool,
              status:
                runtimeEvent.type === 'run.failed'
                  ? 'error'
                  : runtimeEvent.type === 'run.cancelled'
                    ? 'cancelled'
                    : 'finished',
              completedAt: tool.completedAt ?? timestamp,
              updatedAt: timestamp
            }
          : tool
      )
    }
  }

  return next
}

function mediaFromArtifact(artifact: Artifact): CanvasAgentArtifactMedia[] {
  if (artifact.type !== 'image' && artifact.type !== 'video') return []
  const url = artifact.content.url?.trim()
  if (!url) return []
  const actionId =
    typeof artifact.metadata.actionId === 'string'
      ? artifact.metadata.actionId
      : undefined
  return [
    {
      id: artifact.content.assetId ?? artifact.id,
      type: artifact.type,
      url,
      assetId: artifact.content.assetId ?? null,
      mimeType: artifact.content.mimeType,
      prompt: artifact.content.prompt,
      elementId: artifact.content.elementId,
      actionId,
      status:
        artifact.status === 'failed'
          ? 'failed'
          : artifact.status === 'created' || artifact.status === 'updating'
            ? 'running'
            : 'succeeded',
      metadata: artifact.metadata
    }
  ]
}

export function mediaFromCanvasAgentArtifactEvent(
  event: SequencedSystemEvent
): CanvasAgentArtifactMedia[] {
  const runtimeEvent = event.event
  if (
    runtimeEvent.type === 'artifact.create' ||
    runtimeEvent.type === 'artifact.complete'
  ) {
    return mediaFromArtifact(runtimeEvent.artifact)
  }
  if (runtimeEvent.type === 'artifact.update' && runtimeEvent.artifact) {
    return mediaFromArtifact(runtimeEvent.artifact)
  }
  return []
}
