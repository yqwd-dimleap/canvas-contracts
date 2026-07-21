import { z } from 'zod'
import { artifactSchema } from '../artifacts/index.js'
import {
  canvasMutationReceiptSchema,
  canvasMutationTransactionSchema,
  canvasTransientEffectSchema
} from '../canvas/core/mutations.js'
import { canvasAgentSuggestionsSchema } from './suggestions.js'

/**
 * Application protocol version. This is independent from the npm package
 * version and stays on the established Canvas Agent v2 wire baseline.
 */
export const CANVAS_AGENT_PROTOCOL_VERSION = 'v2' as const
export const CANVAS_AGENT_ASSISTANT_ID = 'canvas-agent' as const
export const CANVAS_AGENT_GRAPH_NAME = 'canvas-agent' as const
export const CANVAS_AGENT_LANGGRAPH_ROUTE_PREFIX =
  '/api/agent/canvas/v2' as const
export const CANVAS_AGENT_LANGGRAPH_STREAM_PROTOCOL = 'v2-websocket' as const

export const CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS = [
  'lifecycle',
  'messages',
  'input',
  'custom:activity',
  'custom:canvas',
  'custom:artifact'
] as const

export const CANVAS_AGENT_LANGGRAPH_UI_CHANNELS =
  CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS
export const CANVAS_AGENT_LANGGRAPH_DEFAULT_CHANNELS =
  CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS
export const CANVAS_AGENT_LANGGRAPH_CUSTOM_CHANNELS = [
  'custom:activity',
  'custom:canvas',
  'custom:artifact'
] as const
export const CANVAS_AGENT_LANGGRAPH_REPLAY_CHANNELS = [] as const

export type CanvasAgentLangGraphDefaultChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_DEFAULT_CHANNELS)[number]
export type CanvasAgentLangGraphSupportedChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS)[number]
export type CanvasAgentLangGraphUiChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_UI_CHANNELS)[number]
export type CanvasAgentLangGraphCustomChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_CUSTOM_CHANNELS)[number]

export const canvasAgentRunLifecycleStatusSchema = z.enum([
  'queued',
  'running',
  'interrupted',
  'completed',
  'failed',
  'cancelled'
])

export const canvasAgentActivitySchema = z
  .object({
    id: z.string().trim().min(1),
    /** Structural role in the projected run timeline. */
    scope: z.enum(['stage', 'tool']).optional(),
    /** Tool activities point at the stage that owns them. */
    parentId: z.string().trim().min(1).optional(),
    kind: z.enum([
      'preparing',
      'inspecting_canvas',
      'planning',
      'searching',
      'generating_media',
      'editing_canvas',
      'finalizing'
    ]),
    title: z.string().trim().min(1).max(160),
    status: z.enum([
      'pending',
      'running',
      'waiting',
      'completed',
      'failed',
      'cancelled'
    ]),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    detail: z.string().trim().min(1).max(500).optional(),
    progress: z.number().min(0).max(100).optional()
  })
  .strict()

export const canvasAgentInterruptSchema = z
  .object({
    id: z.string().trim().min(1),
    kind: z.enum(['clarification', 'canvas_conflict']),
    title: z.string().trim().min(1).max(160),
    prompt: z.string().trim().min(1).max(2_000),
    options: z
      .array(
        z
          .object({
            value: z.string().trim().min(1),
            label: z.string().trim().min(1).max(120),
            description: z.string().trim().min(1).max(240).optional()
          })
          .strict()
      )
      .max(8)
      .default([]),
    createdAt: z.string().datetime()
  })
  .strict()

export const canvasAgentStreamMessageSchema = z
  .object({
    id: z.string().trim().min(1),
    role: z.enum(['user', 'assistant']),
    runId: z.string().trim().min(1).optional(),
    content: z.string(),
    status: z.enum(['pending', 'streaming', 'completed', 'failed']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })
  .strict()

export const canvasAgentArtifactRefSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.string().trim().min(1),
    status: z.string().trim().min(1),
    title: z.string().trim().min(1).optional(),
    // The run that produced this artifact. A thread snapshot aggregates refs
    // across every run, so a card must carry its own run id to attach to the
    // right assistant message and to avoid one run's snapshot dropping another
    // run's cards. Optional for back-compat with pre-existing thin rows.
    runId: z.string().trim().min(1).optional(),
    // Full artifact body so a completed run's cards (e.g. the web-search
    // briefing) survive a reload. Snapshots replay refs, not live frames, so a
    // ref without content cannot re-render a media/reference card. Kept optional
    // and unconstrained: only card-bearing artifacts populate it, and the shape
    // is owned by the artifacts contract, not this transport schema.
    content: z.unknown().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()

const frameFields = {
  type: z.literal('event'),
  event_id: z.string().trim().min(1),
  seq: z.number().int().nonnegative(),
  run_id: z.string().trim().min(1),
  thread_id: z.string().trim().min(1)
} as const

const rootNamespaceSchema = z.tuple([])

export const canvasAgentLifecycleFrameSchema = z
  .object({
    ...frameFields,
    method: z.literal('lifecycle'),
    params: z
      .object({
        namespace: rootNamespaceSchema,
        timestamp: z.string().datetime(),
        data: z
          .object({
            event: z.enum([
              'started',
              'running',
              'interrupted',
              'completed',
              'failed'
            ]),
            status: canvasAgentRunLifecycleStatusSchema,
            error: z.string().trim().min(1).optional()
          })
          .strict()
      })
      .strict()
  })
  .strict()

export const canvasAgentMessageFrameSchema = z
  .object({
    ...frameFields,
    method: z.literal('messages'),
    params: z
      .object({
        namespace: rootNamespaceSchema,
        timestamp: z.string().datetime(),
        data: z.discriminatedUnion('event', [
          z
            .object({
              event: z.literal('message.start'),
              message: canvasAgentStreamMessageSchema
            })
            .strict(),
          z
            .object({
              event: z.literal('message.delta'),
              messageId: z.string().trim().min(1),
              delta: z.string().min(1)
            })
            .strict(),
          z
            .object({
              event: z.literal('message.finish'),
              message: canvasAgentStreamMessageSchema
            })
            .strict()
        ])
      })
      .strict()
  })
  .strict()

export const canvasAgentInputFrameSchema = z
  .object({
    ...frameFields,
    method: z.literal('input.requested'),
    params: z
      .object({
        namespace: rootNamespaceSchema,
        timestamp: z.string().datetime(),
        data: z
          .object({
            interrupt_id: z.string().trim().min(1),
            payload: canvasAgentInterruptSchema
          })
          .strict()
      })
      .strict()
  })
  .strict()

export const canvasAgentActivityFrameSchema = z
  .object({
    ...frameFields,
    method: z.literal('custom'),
    params: z
      .object({
        namespace: rootNamespaceSchema,
        timestamp: z.string().datetime(),
        data: z
          .object({
            name: z.literal('activity'),
            payload: z.discriminatedUnion('event', [
              z
                .object({
                  event: z.literal('activity.upsert'),
                  activity: canvasAgentActivitySchema
                })
                .strict(),
              z
                .object({
                  event: z.literal('suggestions.replace'),
                  suggestions: canvasAgentSuggestionsSchema
                })
                .strict()
            ])
          })
          .strict()
      })
      .strict()
  })
  .strict()

export const canvasAgentCanvasFrameSchema = z
  .object({
    ...frameFields,
    method: z.literal('custom'),
    params: z
      .object({
        namespace: rootNamespaceSchema,
        timestamp: z.string().datetime(),
        data: z
          .object({
            name: z.literal('canvas'),
            payload: z.discriminatedUnion('event', [
              z
                .object({
                  event: z.literal('transaction.committed'),
                  transaction: canvasMutationTransactionSchema,
                  receipt: canvasMutationReceiptSchema
                })
                .strict(),
              z
                .object({
                  event: z.literal('effect'),
                  effect: canvasTransientEffectSchema
                })
                .strict()
            ])
          })
          .strict()
      })
      .strict()
  })
  .strict()

export const canvasAgentArtifactFrameSchema = z
  .object({
    ...frameFields,
    method: z.literal('custom'),
    params: z
      .object({
        namespace: rootNamespaceSchema,
        timestamp: z.string().datetime(),
        data: z
          .object({
            name: z.literal('artifact'),
            payload: z.discriminatedUnion('event', [
              z
                .object({
                  event: z.literal('artifact.upsert'),
                  artifact: artifactSchema
                })
                .strict(),
              z
                .object({
                  event: z.literal('artifact.delete'),
                  artifactId: z.string().trim().min(1)
                })
                .strict()
            ])
          })
          .strict()
      })
      .strict()
  })
  .strict()

export const canvasAgentLangGraphProtocolEventSchema = z.union([
  canvasAgentLifecycleFrameSchema,
  canvasAgentMessageFrameSchema,
  canvasAgentInputFrameSchema,
  canvasAgentActivityFrameSchema,
  canvasAgentCanvasFrameSchema,
  canvasAgentArtifactFrameSchema
])

export const canvasAgentThreadSnapshotSchema = z
  .object({
    protocolVersion: z.literal(CANVAS_AGENT_PROTOCOL_VERSION),
    projectId: z.string().trim().min(1),
    threadId: z.string().trim().min(1),
    currentRun: z
      .object({
        runId: z.string().trim().min(1),
        status: canvasAgentRunLifecycleStatusSchema,
        startedAt: z.string().datetime().optional(),
        completedAt: z.string().datetime().optional()
      })
      .strict()
      .nullable(),
    assistantMessage: canvasAgentStreamMessageSchema.nullable(),
    activities: z.array(canvasAgentActivitySchema),
    interrupt: canvasAgentInterruptSchema.nullable(),
    suggestions: canvasAgentSuggestionsSchema,
    artifacts: z.array(canvasAgentArtifactRefSchema),
    appliedThroughSeq: z.number().int().min(-1),
    canvasRevision: z.number().int().nonnegative()
  })
  .strict()

export const canvasAgentLangGraphThreadStateResponseSchema = z
  .object({
    values: canvasAgentThreadSnapshotSchema,
    // LangGraph SDK ThreadState envelope. Canvas materializes interrupts and
    // lifecycle inside values, so graph checkpoint/task fields stay empty.
    next: z.array(z.never()).length(0),
    tasks: z.array(z.never()).length(0),
    metadata: z.object({}).strict(),
    checkpoint: z.null(),
    parent_checkpoint: z.null(),
    created_at: z.null()
  })
  .strict()

export type CanvasAgentActivity = z.infer<typeof canvasAgentActivitySchema>
export type CanvasAgentInterrupt = z.infer<typeof canvasAgentInterruptSchema>
export type CanvasAgentStreamMessage = z.infer<
  typeof canvasAgentStreamMessageSchema
>
export type CanvasAgentArtifactRef = z.infer<
  typeof canvasAgentArtifactRefSchema
>
export type CanvasAgentLangGraphProtocolEvent = z.infer<
  typeof canvasAgentLangGraphProtocolEventSchema
>
export type CanvasAgentThreadSnapshot = z.infer<
  typeof canvasAgentThreadSnapshotSchema
>
export type CanvasAgentLangGraphThreadStateResponse = z.infer<
  typeof canvasAgentLangGraphThreadStateResponseSchema
>
