import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasPlanActionSchema } from '../workflow/plan.js'

// ============================================================================
// Workflow Feedback
// ============================================================================

export const workflowFeedbackRequestSchema = z.object({
  workflowId: z.string().min(1),
  intent: z.string().min(1),
  intentKind: z.enum(['image', 'video', 'storyboard']),
  actions: z.array(canvasPlanActionSchema),
  userRating: z.number().int().min(1).max(5),
  adjustmentCount: z.number().int().min(0),
  projectId: z.string().optional(),
  userId: z.string().optional()
})

export const workflowFeedbackResponseSchema = apiSuccessResponseSchema(
  z.object({
    message: z.string(),
    indexed: z.boolean()
  })
)

// ============================================================================
// RAG Search - Workflows
// ============================================================================

export const ragSearchWorkflowsRequestSchema = z.object({
  query: z.string().min(1),
  intentKind: z.enum(['image', 'video', 'storyboard']).optional(),
  topK: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.7)
})

export const ragWorkflowResultSchema = z.object({
  id: z.string(),
  intent: z.string(),
  intentKind: z.string(),
  actions: z.array(canvasPlanActionSchema),
  successScore: z.number(),
  score: z.number()
})

export const ragSearchWorkflowsResponseSchema = apiSuccessResponseSchema(
  z.object({
    results: z.array(ragWorkflowResultSchema),
    query: z.string(),
    totalResults: z.number()
  })
)

// ============================================================================
// RAG Search - Prompts
// ============================================================================

export const ragSearchPromptsRequestSchema = z.object({
  query: z.string().min(1),
  style: z.string().optional(),
  target: z.enum(['image', 'video']).optional(),
  topK: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.7)
})

export const ragPromptResultSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  style: z.string(),
  target: z.string(),
  score: z.number()
})

export const ragSearchPromptsResponseSchema = apiSuccessResponseSchema(
  z.object({
    results: z.array(ragPromptResultSchema),
    query: z.string(),
    totalResults: z.number()
  })
)

// ============================================================================
// Types
// ============================================================================

export type WorkflowFeedbackRequest = z.infer<
  typeof workflowFeedbackRequestSchema
>
export type WorkflowFeedbackResponse = z.infer<
  typeof workflowFeedbackResponseSchema
>
export type RagSearchWorkflowsRequest = z.infer<
  typeof ragSearchWorkflowsRequestSchema
>
export type RagWorkflowResult = z.infer<typeof ragWorkflowResultSchema>
export type RagSearchWorkflowsResponse = z.infer<
  typeof ragSearchWorkflowsResponseSchema
>
export type RagSearchPromptsRequest = z.infer<
  typeof ragSearchPromptsRequestSchema
>
export type RagPromptResult = z.infer<typeof ragPromptResultSchema>
export type RagSearchPromptsResponse = z.infer<
  typeof ragSearchPromptsResponseSchema
>
