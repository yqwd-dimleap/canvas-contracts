import { z } from 'zod'
import { canvasAgentActionSchema } from '../canvas/agent/actions.js'

// ============================================================================
// Canvas Recipe Feedback
// ============================================================================

export const canvasRecipeFeedbackRequestSchema = z.object({
  recipeId: z.string().min(1),
  intent: z.string().min(1),
  intentKind: z.enum(['image', 'video']),
  actions: z.array(canvasAgentActionSchema),
  userRating: z.number().int().min(1).max(5),
  adjustmentCount: z.number().int().min(0),
  projectId: z.string().optional(),
  userId: z.string().optional()
})
