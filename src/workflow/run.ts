import { z } from 'zod'
import { canvasOperationSchema } from '../canvas/operations.js'
import { agentSuggestionSchema } from '../events/canvas-events.js'
import { canvasIntentKindSchema, canvasPlanActionSchema } from './plan.js'

export const agentRunStatusSchema = z.enum([
  'queued',
  'pending',
  'running',
  'planning',
  'acting',
  'observing',
  'critiquing',
  'repairing',
  'persisting',
  'requires_confirmation',
  'succeeded',
  'completed',
  'skipped',
  'failed',
  'cancelled'
])

export const agentRunPhaseSchema = z.enum([
  'plan',
  'act',
  'observe',
  'critique',
  'repair',
  'persist'
])

export const agentRunEventNameSchema = z.enum([
  'agent.run.started',
  'agent.run.completed',
  'agent.run.failed',
  'agent.run.cancelled',
  'agent.message.started',
  'agent.message.delta',
  'agent.message.completed',
  'agent.thinking',
  'agent.step.started',
  'agent.step.completed',
  'agent.step.failed',
  'tool.call.started',
  'tool.call.completed',
  'tool.call.failed',
  'generation.queued',
  'generation.completed',
  'generation.failed',
  'canvas.operation',
  'agent.suggestions',
  'review.completed',
  'repair.suggested',
  'action.requires_confirmation',
  'action.materialized'
])

export const agentTraceSpanSchema = z.object({
  traceId: z.string().min(1),
  spanId: z.string().min(1),
  parentSpanId: z.string().min(1).optional(),
  name: z.string().min(1),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1).optional(),
  attributes: z.record(z.string(), z.unknown()).default({})
})

export const agentTraceSchema = z.object({
  traceId: z.string().min(1),
  spans: z.array(agentTraceSpanSchema).default([])
})

export const agentToolCallStatusSchema = z.enum([
  'started',
  'completed',
  'failed'
])

export const agentToolCallSchema = z.object({
  runId: z.string().min(1),
  toolCallId: z.string().min(1),
  actionId: z.string().min(1).optional(),
  traceId: z.string().min(1).optional(),
  toolName: z.string().min(1),
  status: agentToolCallStatusSchema,
  input: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().min(1),
      retryable: z.boolean().optional(),
      details: z.unknown().optional()
    })
    .optional(),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional()
})

export const agentThinkingSchema = z
  .object({
    phase: agentRunPhaseSchema.optional(),
    summary: z.string().min(1),
    intentKind: canvasIntentKindSchema.optional(),
    confidence: z.number().min(0).max(1).optional(),
    details: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown())

export const agentExecutionMediaSchema = z
  .object({
    actionId: z.string().min(1).optional(),
    nodeId: z.string().min(1).optional(),
    type: z.enum(['image', 'video']),
    url: z.string().min(1),
    assetId: z.string().nullable().optional(),
    mimeType: z.string().min(1).optional(),
    prompt: z.string().optional(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown())

export const agentExecutionObservationSchema = z
  .object({
    projectId: z.string().nullable().optional(),
    resultCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    generatedMedia: z.array(agentExecutionMediaSchema).default([]),
    summary: z.string().min(1),
    needsCritique: z.boolean().default(true),
    needsRepair: z.boolean().default(false)
  })
  .catchall(z.unknown())

export const agentExecutionReviewSchema = z
  .object({
    actionId: z.string().min(1).optional(),
    nodeId: z.string().min(1).optional(),
    resultType: z.enum(['image', 'video']).optional(),
    resultUrl: z.string().min(1).optional(),
    verdict: z.enum(['pass', 'needs_human_review', 'repair_recommended']),
    score: z.number().nullable().optional(),
    issues: z.array(z.string()).default([]),
    suggestedFixes: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([])
  })
  .catchall(z.unknown())

export const agentExecutionCritiqueSchema = z
  .object({
    projectId: z.string().nullable().optional(),
    verdict: z.enum(['pass', 'needs_human_review', 'repair_recommended']),
    resultCount: z.number().int().nonnegative(),
    reviews: z.array(agentExecutionReviewSchema).default([]),
    summary: z.string().min(1)
  })
  .catchall(z.unknown())

export const agentExecutionRepairSuggestionSchema = z
  .object({
    actionId: z.string().min(1).optional(),
    nodeId: z.string().min(1).optional(),
    diagnosis: z.string().min(1),
    actions: z.array(canvasPlanActionSchema).default([]),
    retry: z
      .object({
        recommended: z.boolean(),
        reason: z.string().min(1)
      })
      .optional()
  })
  .catchall(z.unknown())

export const agentExecutionRepairPlanSchema = z
  .object({
    projectId: z.string().nullable().optional(),
    suggestions: z.array(agentExecutionRepairSuggestionSchema).default([]),
    summary: z.string().min(1)
  })
  .catchall(z.unknown())

export const agentRunStepSchema = z.object({
  runId: z.string().min(1),
  stepId: z.string().min(1),
  actionId: z.string().min(1).optional(),
  traceId: z.string().min(1).optional(),
  phase: agentRunPhaseSchema,
  title: z.string().min(1),
  status: agentRunStatusSchema,
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  summary: z.string().optional(),
  input: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().min(1),
      retryable: z.boolean().optional(),
      details: z.unknown().optional()
    })
    .optional()
})

export const agentRunSchema = z.object({
  runId: z.string().min(1),
  traceId: z.string().min(1).optional(),
  projectId: z.string().nullable(),
  profileId: z.string().optional(),
  intent: z.string().min(1),
  status: agentRunStatusSchema,
  strategy: z.enum(['json', 'agent', 'hybrid']).default('hybrid'),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  summary: z.string().optional(),
  actions: z.array(canvasPlanActionSchema).default([]),
  steps: z.array(agentRunStepSchema).default([]),
  toolCalls: z.array(agentToolCallSchema).default([]),
  trace: agentTraceSchema.optional()
})

const agentRunEventBaseSchema = z.object({
  runId: z.string().min(1),
  traceId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  timestamp: z.string().min(1),
  sequence: z.number().int().nonnegative().optional()
})

export const agentMessageStreamEventSchema = z.union([
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.message.started'),
    data: z.object({
      messageId: z.string().min(1),
      role: z.literal('assistant'),
      phase: agentRunPhaseSchema.optional()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.message.delta'),
    data: z.object({
      messageId: z.string().min(1),
      role: z.literal('assistant'),
      delta: z.string()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.message.completed'),
    data: z.object({
      messageId: z.string().min(1),
      role: z.literal('assistant'),
      content: z.string()
    })
  })
])

export const agentRunEventSchema = z.union([
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.run.started'),
    data: agentRunSchema.pick({
      runId: true,
      traceId: true,
      projectId: true,
      profileId: true,
      intent: true,
      status: true,
      strategy: true,
      startedAt: true
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.run.completed'),
    data: agentRunSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.run.failed'),
    data: z.object({
      message: z.string().min(1),
      code: z.string().optional(),
      retryable: z.boolean().optional()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.run.cancelled'),
    data: z.object({
      message: z.string().min(1),
      reason: z.string().min(1).optional(),
      cancelledBy: z.enum(['user', 'system', 'timeout']).default('user')
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.message.started'),
    data: z.object({
      messageId: z.string().min(1),
      role: z.literal('assistant'),
      phase: agentRunPhaseSchema.optional()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.message.delta'),
    data: z.object({
      messageId: z.string().min(1),
      role: z.literal('assistant'),
      delta: z.string()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.message.completed'),
    data: z.object({
      messageId: z.string().min(1),
      role: z.literal('assistant'),
      content: z.string()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.thinking'),
    data: agentThinkingSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.enum([
      'agent.step.started',
      'agent.step.completed',
      'agent.step.failed'
    ]),
    data: agentRunStepSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.enum([
      'tool.call.started',
      'tool.call.completed',
      'tool.call.failed'
    ]),
    data: agentToolCallSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.enum([
      'generation.queued',
      'generation.completed',
      'generation.failed'
    ]),
    data: z.record(z.string(), z.unknown())
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('canvas.operation'),
    data: z.object({
      operation: canvasOperationSchema,
      transient: z.boolean().default(false),
      sequence: z.number().int().nonnegative().optional()
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('agent.suggestions'),
    data: z.object({
      suggestions: z.array(agentSuggestionSchema).min(1).max(5)
    })
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('review.completed'),
    data: agentExecutionCritiqueSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('repair.suggested'),
    data: agentExecutionRepairPlanSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('action.requires_confirmation'),
    data: canvasPlanActionSchema
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('action.materialized'),
    data: z.object({
      actionId: z.string().min(1).optional(),
      ref: z.string().min(1).optional(),
      realNodeId: z.string().min(1).optional(),
      action: canvasPlanActionSchema
    })
  })
])

export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>
export type AgentRunPhase = z.infer<typeof agentRunPhaseSchema>
export type AgentRunEventName = z.infer<typeof agentRunEventNameSchema>
export type AgentTraceSpan = z.infer<typeof agentTraceSpanSchema>
export type AgentTrace = z.infer<typeof agentTraceSchema>
export type AgentToolCallStatus = z.infer<typeof agentToolCallStatusSchema>
export type AgentToolCall = z.infer<typeof agentToolCallSchema>
export type AgentThinking = z.infer<typeof agentThinkingSchema>
export type AgentExecutionMedia = z.infer<typeof agentExecutionMediaSchema>
export type AgentExecutionObservation = z.infer<
  typeof agentExecutionObservationSchema
>
export type AgentExecutionReview = z.infer<typeof agentExecutionReviewSchema>
export type AgentExecutionCritique = z.infer<
  typeof agentExecutionCritiqueSchema
>
export type AgentExecutionRepairSuggestion = z.infer<
  typeof agentExecutionRepairSuggestionSchema
>
export type AgentExecutionRepairPlan = z.infer<
  typeof agentExecutionRepairPlanSchema
>
export type AgentRunStep = z.infer<typeof agentRunStepSchema>
export type AgentRun = z.infer<typeof agentRunSchema>
export type { AgentSuggestion } from '../events/canvas-events.js'
export type AgentRunEvent = z.infer<typeof agentRunEventSchema>
export type AgentMessageStreamEvent = z.infer<
  typeof agentMessageStreamEventSchema
>
export type AgentRuntimeEvent = AgentRunEvent | AgentMessageStreamEvent
