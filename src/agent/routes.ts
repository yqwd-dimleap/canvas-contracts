import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasContextSchema, canvasSelectionSchema } from '../canvas/context.js'
import { agentModelProfileSchema, agentProfileSummarySchema } from './profiles.js'

export const agentChatRequestSchema = z.object({
  message: z.string().min(1),
  profileId: z.string().optional()
})

export const agentChatResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    content: z.unknown(),
    messages: z.array(z.unknown())
  })
)

export const canvasAgentBaseRequestSchema = z.object({
  projectId: z.string().nullable().optional(),
  profileId: z.string().optional(),
  canvas: canvasContextSchema,
  selection: canvasSelectionSchema
})

export const canvasPlanRequestSchema = canvasAgentBaseRequestSchema.extend({
  intent: z.string().min(1)
})

export const canvasPlanActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('createNode'),
    nodeType: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('patchNodeData'),
    nodeId: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  }),
  z.object({
    type: z.literal('createEdge'),
    source: z.string().min(1),
    target: z.string().min(1),
    data: z.record(z.string(), z.unknown()).default({})
  })
])

export const canvasPlanResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    projectId: z.string().nullable(),
    summary: z.string(),
    executionMode: z.enum(['manualConfirm', 'autoExecute']),
    context: z.object({
      nodeCount: z.number(),
      edgeCount: z.number(),
      resourceCount: z.number(),
      selectedNodeIds: z.array(z.string())
    }),
    actions: z.array(canvasPlanActionSchema),
    questions: z.array(z.string())
  })
)

export const improvePromptRequestSchema = canvasAgentBaseRequestSchema.extend({
  prompt: z.string().min(1),
  target: z.enum(['image', 'video']).default('image'),
  styleGuide: z.string().optional()
})

export const improvePromptResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    target: z.enum(['image', 'video']),
    originalPrompt: z.string(),
    improvedPrompt: z.string(),
    notes: z.array(z.string()).default([])
  })
)

export const reviewResultRequestSchema = canvasAgentBaseRequestSchema.extend({
  nodeId: z.string().min(1),
  prompt: z.string().optional(),
  resultUrl: z.string().min(1),
  resultType: z.enum(['image', 'video'])
})

export const reviewResultResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    nodeId: z.string(),
    resultType: z.enum(['image', 'video']),
    resultUrl: z.string(),
    verdict: z.enum(['pass', 'needs_human_review', 'repair_recommended']),
    score: z.number().nullable(),
    issues: z.array(z.string()),
    suggestedFixes: z.array(z.string()),
    notes: z.array(z.string()).default([])
  })
)

export const repairNodeRequestSchema = canvasAgentBaseRequestSchema.extend({
  nodeId: z.string().min(1),
  issue: z.string().optional(),
  lastError: z.string().optional()
})

export const repairNodeResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    nodeId: z.string(),
    diagnosis: z.string(),
    actions: z.array(canvasPlanActionSchema),
    retry: z.object({
      recommended: z.boolean(),
      reason: z.string()
    })
  })
)

export const listAgentProfilesResponseSchema = apiSuccessResponseSchema(
  z.object({
    profiles: z.array(agentModelProfileSchema)
  })
)

export type AgentChatRequest = z.infer<typeof agentChatRequestSchema>
export type AgentChatResponse = z.infer<typeof agentChatResponseSchema>
export type CanvasAgentBaseRequest = z.infer<typeof canvasAgentBaseRequestSchema>
export type CanvasPlanRequest = z.infer<typeof canvasPlanRequestSchema>
export type CanvasPlanAction = z.infer<typeof canvasPlanActionSchema>
export type CanvasPlanResponse = z.infer<typeof canvasPlanResponseSchema>
export type ImprovePromptRequest = z.infer<typeof improvePromptRequestSchema>
export type ImprovePromptResponse = z.infer<typeof improvePromptResponseSchema>
export type ReviewResultRequest = z.infer<typeof reviewResultRequestSchema>
export type ReviewResultResponse = z.infer<typeof reviewResultResponseSchema>
export type RepairNodeRequest = z.infer<typeof repairNodeRequestSchema>
export type RepairNodeResponse = z.infer<typeof repairNodeResponseSchema>
export type ListAgentProfilesResponse = z.infer<typeof listAgentProfilesResponseSchema>
