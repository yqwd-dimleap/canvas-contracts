import { z } from 'zod'
import { canvasPlanActionSchema } from './plan.js'

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
  'agent.step.started',
  'agent.step.completed',
  'agent.step.failed',
  'tool.call.started',
  'tool.call.completed',
  'tool.call.failed',
  'generation.queued',
  'generation.completed',
  'generation.failed',
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
    event: z.literal('review.completed'),
    data: z.record(z.string(), z.unknown())
  }),
  agentRunEventBaseSchema.extend({
    event: z.literal('repair.suggested'),
    data: z.record(z.string(), z.unknown())
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
export type AgentRunStep = z.infer<typeof agentRunStepSchema>
export type AgentRun = z.infer<typeof agentRunSchema>
export type AgentRunEvent = z.infer<typeof agentRunEventSchema>
