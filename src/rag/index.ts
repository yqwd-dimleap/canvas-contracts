import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasAgentActionSchema } from '../canvas/agent/actions.js'

// ============================================================================
// Canvas Recipe Feedback
// ============================================================================

export const canvasRecipeFeedbackRequestSchema = z.object({
  recipeId: z.string().min(1),
  intent: z.string().min(1),
  intentKind: z.enum(['image', 'video', 'storyboard']),
  actions: z.array(canvasAgentActionSchema),
  userRating: z.number().int().min(1).max(5),
  adjustmentCount: z.number().int().min(0),
  projectId: z.string().optional(),
  userId: z.string().optional()
})

export const canvasRecipeFeedbackResponseSchema = apiSuccessResponseSchema(
  z.object({
    message: z.string(),
    indexed: z.boolean()
  })
)

// ============================================================================
// RAG Search - Canvas Recipes
// ============================================================================

export const ragSearchCanvasRecipesRequestSchema = z.object({
  query: z.string().min(1),
  intentKind: z.enum(['image', 'video', 'storyboard']).optional(),
  topK: z.number().int().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.7)
})

export const ragCanvasRecipeResultSchema = z.object({
  id: z.string(),
  intent: z.string(),
  intentKind: z.string(),
  actions: z.array(canvasAgentActionSchema),
  successScore: z.number(),
  score: z.number()
})

export const ragSearchCanvasRecipesResponseSchema = apiSuccessResponseSchema(
  z.object({
    results: z.array(ragCanvasRecipeResultSchema),
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

export type CanvasRecipeFeedbackRequest = z.infer<
  typeof canvasRecipeFeedbackRequestSchema
>
export type CanvasRecipeFeedbackResponse = z.infer<
  typeof canvasRecipeFeedbackResponseSchema
>
export type RagSearchCanvasRecipesRequest = z.infer<
  typeof ragSearchCanvasRecipesRequestSchema
>
export type RagCanvasRecipeResult = z.infer<typeof ragCanvasRecipeResultSchema>
export type RagSearchCanvasRecipesResponse = z.infer<
  typeof ragSearchCanvasRecipesResponseSchema
>
export type RagSearchPromptsRequest = z.infer<
  typeof ragSearchPromptsRequestSchema
>
export type RagPromptResult = z.infer<typeof ragPromptResultSchema>
export type RagSearchPromptsResponse = z.infer<
  typeof ragSearchPromptsResponseSchema
>
