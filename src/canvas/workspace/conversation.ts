import { z } from 'zod'
import { systemEventSchema } from '../../events/core.js'
import { canvasOperationSchema } from '../core/operations.js'

/**
 * Canonical durable conversation shapes for a workspace project's Agent panel.
 *
 * This is the single source of truth for how Agent conversations/messages are
 * persisted in `workspace_projects.resources.conversations`. Both the frontend
 * store and the canvas-agent run write-back import these schemas + normalizers;
 * neither side keeps its own copy.
 */

export const projectCanvasAgentMessageStatusSchema = z.enum([
  'pending',
  'streaming',
  'running',
  'completed',
  'cancelled',
  'failed'
])

export const projectCanvasAgentMessageElementRefSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.string().min(1).optional(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed']).optional()
})

export const projectCanvasAgentMessageMediaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['video', 'image']),
  url: z.string().min(1),
  assetId: z.string().min(1).nullable().optional(),
  mimeType: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  elementId: z.string().min(1).optional(),
  actionId: z.string().min(1).optional(),
  status: z.enum(['pending', 'running', 'succeeded', 'failed']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export const projectCanvasAgentMessageDetailSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1)
})

export const projectCanvasAgentMessageCanvasSchema = z.object({
  operations: z.array(canvasOperationSchema).optional(),
  consumedElements: z
    .array(projectCanvasAgentMessageElementRefSchema)
    .optional(),
  outputElements: z.array(projectCanvasAgentMessageElementRefSchema).optional(),
  media: z.array(projectCanvasAgentMessageMediaSchema).optional(),
  details: z.array(projectCanvasAgentMessageDetailSchema).optional(),
  statusText: z.string().min(1).optional()
})

export const projectCanvasAgentMessageAttachmentSchema = z.object({
  type: z.literal('system_event'),
  event: systemEventSchema
})

export const projectCanvasAgentMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'error']),
  title: z.string().optional(),
  content: z.string(),
  status: projectCanvasAgentMessageStatusSchema.optional(),
  runId: z.string().optional(),
  traceId: z.string().optional(),
  lastEventSequence: z.number().optional(),
  appliedRunResultAt: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  attachments: z.array(projectCanvasAgentMessageAttachmentSchema).optional(),
  canvas: projectCanvasAgentMessageCanvasSchema.optional()
})

export const projectCanvasConversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().nullable(),
  threadId: z.string().nullable(),
  messages: z.array(projectCanvasAgentMessageSchema),
  createdAt: z.number(),
  updatedAt: z.number()
})

export type ProjectCanvasAgentMessageStatus = z.infer<
  typeof projectCanvasAgentMessageStatusSchema
>
export type ProjectCanvasAgentMessageElementRef = z.infer<
  typeof projectCanvasAgentMessageElementRefSchema
>
export type ProjectCanvasAgentMessageMedia = z.infer<
  typeof projectCanvasAgentMessageMediaSchema
>
export type ProjectCanvasAgentMessageDetail = z.infer<
  typeof projectCanvasAgentMessageDetailSchema
>
export type ProjectCanvasAgentMessageAttachment = z.infer<
  typeof projectCanvasAgentMessageAttachmentSchema
>
export type ProjectCanvasAgentMessage = z.infer<
  typeof projectCanvasAgentMessageSchema
>
export type ProjectCanvasConversation = z.infer<
  typeof projectCanvasConversationSchema
>

/** Derive a conversation title from its first user message (or a default). */
export function deriveConversationTitle(
  messages: readonly ProjectCanvasAgentMessage[]
): string {
  const firstUser = messages.find((message) => message.role === 'user')
  const text = firstUser?.content.trim() ?? ''
  if (!text) return '新对话'
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length > 30 ? `${oneLine.slice(0, 30)}…` : oneLine
}

/**
 * Collapse duplicate assistant frames. User messages always survive; assistant
 * messages are deduped by (runId,title,content,statusText) and adjacent exact
 * repeats are dropped. A streaming run re-emits the same assistant turn many
 * times, so this keeps durable history from ballooning.
 */
export function dedupeProjectCanvasAgentMessages(
  messages: readonly ProjectCanvasAgentMessage[]
): ProjectCanvasAgentMessage[] {
  const result: ProjectCanvasAgentMessage[] = []
  const seen = new Set<string>()

  for (const message of messages) {
    if (message.role === 'user') {
      result.push(message)
      continue
    }

    const normalizedContent = message.content.trim()
    const statusText = message.canvas?.statusText ?? ''
    const key = `${message.role}:${message.runId ?? ''}:${message.title ?? ''}:${normalizedContent}:${statusText}`
    const previous = result.at(-1)
    const adjacentDuplicate =
      previous?.role === message.role &&
      previous.title === message.title &&
      previous.content.trim() === normalizedContent &&
      (previous.canvas?.statusText ?? '') === statusText

    if ((message.runId && seen.has(key)) || adjacentDuplicate) continue
    if (message.runId) seen.add(key)
    result.push(message)
  }

  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeElementRefs(
  value: unknown
): ProjectCanvasAgentMessageElementRef[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = projectCanvasAgentMessageElementRefSchema.safeParse(
      isRecord(item) ? { ...item, label: item.label ?? item.id } : item
    )
    return parsed.success ? [parsed.data] : []
  })
}

function normalizeMedia(value: unknown): ProjectCanvasAgentMessageMedia[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return []
    const parsed = projectCanvasAgentMessageMediaSchema.safeParse({
      ...item,
      id:
        typeof item.id === 'string' && item.id.trim()
          ? item.id
          : `agent-media-restored-${index}`
    })
    return parsed.success ? [parsed.data] : []
  })
}

function normalizeDetails(value: unknown): ProjectCanvasAgentMessageDetail[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = projectCanvasAgentMessageDetailSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

function normalizeMessageCanvas(
  value: unknown
): ProjectCanvasAgentMessage['canvas'] | undefined {
  if (!isRecord(value)) return undefined
  const consumedElements = normalizeElementRefs(value.consumedElements)
  const outputElements = normalizeElementRefs(value.outputElements)
  const media = normalizeMedia(value.media)
  const details = normalizeDetails(value.details)
  const statusText =
    typeof value.statusText === 'string' && value.statusText.trim()
      ? value.statusText.trim()
      : undefined
  const operations =
    projectCanvasAgentMessageCanvasSchema.shape.operations.safeParse(
      value.operations
    ).data
  if (
    consumedElements.length === 0 &&
    outputElements.length === 0 &&
    media.length === 0 &&
    details.length === 0 &&
    !statusText &&
    !(operations && operations.length > 0)
  ) {
    return undefined
  }
  return {
    ...(operations && operations.length > 0 ? { operations } : {}),
    ...(consumedElements.length > 0 ? { consumedElements } : {}),
    ...(outputElements.length > 0 ? { outputElements } : {}),
    ...(media.length > 0 ? { media } : {}),
    ...(details.length > 0 ? { details } : {}),
    ...(statusText ? { statusText } : {})
  }
}

function normalizeAttachments(
  value: unknown
): ProjectCanvasAgentMessageAttachment[] | undefined {
  if (!Array.isArray(value)) return undefined
  const attachments = value.flatMap((item) => {
    const parsed = projectCanvasAgentMessageAttachmentSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
  return attachments.length > 0 ? attachments : undefined
}

/** Tolerant per-message normalizer: drops structurally invalid rows. */
export function normalizeProjectCanvasAgentMessages(
  value: unknown
): ProjectCanvasAgentMessage[] {
  if (!Array.isArray(value)) return []
  const messages = value.flatMap((item, index): ProjectCanvasAgentMessage[] => {
    if (!isRecord(item)) return []
    const role = item.role
    if (role !== 'user' && role !== 'assistant' && role !== 'error') return []
    const content = typeof item.content === 'string' ? item.content : ''
    const canvas = normalizeMessageCanvas(item.canvas)
    const status = projectCanvasAgentMessageStatusSchema.safeParse(
      item.status
    ).data
    if (!content.trim() && !status && !canvas && role !== 'assistant') {
      return []
    }
    const createdAt =
      typeof item.createdAt === 'number' ? item.createdAt : Date.now()
    const updatedAt =
      typeof item.updatedAt === 'number' ? item.updatedAt : createdAt
    return [
      {
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id
            : `agent-msg-restored-${index}`,
        role,
        ...(typeof item.title === 'string' ? { title: item.title } : {}),
        content,
        ...(status ? { status } : {}),
        ...(typeof item.runId === 'string' && item.runId.trim()
          ? { runId: item.runId.trim() }
          : {}),
        ...(typeof item.traceId === 'string' && item.traceId.trim()
          ? { traceId: item.traceId.trim() }
          : {}),
        ...(typeof item.lastEventSequence === 'number' &&
        Number.isFinite(item.lastEventSequence)
          ? { lastEventSequence: item.lastEventSequence }
          : {}),
        ...(typeof item.appliedRunResultAt === 'number' &&
        Number.isFinite(item.appliedRunResultAt)
          ? { appliedRunResultAt: item.appliedRunResultAt }
          : {}),
        createdAt,
        updatedAt,
        ...((): { attachments?: ProjectCanvasAgentMessageAttachment[] } => {
          const attachments = normalizeAttachments(item.attachments)
          return attachments ? { attachments } : {}
        })(),
        ...(canvas ? { canvas } : {})
      }
    ]
  })
  return dedupeProjectCanvasAgentMessages(messages)
}

/** Pick a valid active conversation id, defaulting to the last conversation. */
export function resolveActiveConversationId(
  conversations: readonly ProjectCanvasConversation[],
  value: unknown
): string | null {
  if (conversations.length === 0) return null
  if (
    typeof value === 'string' &&
    conversations.some((conversation) => conversation.id === value)
  ) {
    return value
  }
  return conversations[conversations.length - 1]!.id
}

/**
 * Tolerant conversation-list normalizer. Invalid entries are dropped, messages
 * are normalized + deduped, and titles are derived when absent. Used on every
 * read (stored data) and PATCH boundary, so it must never throw.
 */
export function normalizeProjectCanvasConversations(
  value: unknown
): ProjectCanvasConversation[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index): ProjectCanvasConversation[] => {
    if (!isRecord(item)) return []
    const messages = normalizeProjectCanvasAgentMessages(item.messages)
    const createdAt =
      typeof item.createdAt === 'number' ? item.createdAt : Date.now()
    const updatedAt =
      typeof item.updatedAt === 'number' ? item.updatedAt : createdAt
    return [
      {
        id:
          typeof item.id === 'string' && item.id.trim()
            ? item.id.trim()
            : `conv-restored-${index}`,
        title:
          typeof item.title === 'string' && item.title.trim()
            ? item.title.trim()
            : deriveConversationTitle(messages),
        threadId:
          typeof item.threadId === 'string' && item.threadId.trim()
            ? item.threadId.trim()
            : null,
        messages,
        createdAt,
        updatedAt
      }
    ]
  })
}
