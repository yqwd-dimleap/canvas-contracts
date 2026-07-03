import { z } from 'zod'
import { canvasIntentKindSchema, canvasPlanActionSchema } from './plan.js'

export const agentRunStatusSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
])

export const agentRunPhaseSchema = z.enum(['plan', 'act', 'observe', 'persist'])

export const agentRunStepStatusSchema = z.enum([
  'pending',
  'running',
  'requires_confirmation',
  'succeeded',
  'failed',
  'skipped',
  'cancelled'
])

export const agentRunStrategySchema = z.enum(['deep-agent'])

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

export const agentRunStepSchema = z.object({
  runId: z.string().min(1),
  stepId: z.string().min(1),
  actionId: z.string().min(1).optional(),
  traceId: z.string().min(1).optional(),
  phase: agentRunPhaseSchema,
  title: z.string().min(1),
  status: agentRunStepStatusSchema,
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
  strategy: agentRunStrategySchema,
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  summary: z.string().optional(),
  actions: z.array(canvasPlanActionSchema).default([]),
  steps: z.array(agentRunStepSchema).default([]),
  toolCalls: z.array(agentToolCallSchema).default([]),
  trace: agentTraceSchema.optional()
})

export type AgentRunStatus = z.infer<typeof agentRunStatusSchema>
export type AgentRunPhase = z.infer<typeof agentRunPhaseSchema>
export type AgentRunStepStatus = z.infer<typeof agentRunStepStatusSchema>
export type AgentRunStrategy = z.infer<typeof agentRunStrategySchema>
export type AgentTraceSpan = z.infer<typeof agentTraceSpanSchema>
export type AgentTrace = z.infer<typeof agentTraceSchema>
export type AgentToolCallStatus = z.infer<typeof agentToolCallStatusSchema>
export type AgentToolCall = z.infer<typeof agentToolCallSchema>
export type AgentThinking = z.infer<typeof agentThinkingSchema>
export type AgentExecutionMedia = z.infer<typeof agentExecutionMediaSchema>
export type AgentExecutionObservation = z.infer<
  typeof agentExecutionObservationSchema
>
export type AgentRunStep = z.infer<typeof agentRunStepSchema>
export type AgentRun = z.infer<typeof agentRunSchema>
