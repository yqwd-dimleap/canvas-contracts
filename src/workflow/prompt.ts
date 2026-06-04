import { z } from 'zod'
import { agentProfileSummarySchema } from '../agent/profiles.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasAgentBaseRequestSchema } from './plan.js'

/**
 * Improve Prompt Request
 * 提示词优化请求（针对图片或视频生成）
 */
export const improvePromptRequestSchema = canvasAgentBaseRequestSchema.extend({
  prompt: z.string().min(1),
  target: z.enum(['image', 'video']).default('image'),
  styleGuide: z.string().optional()
})

/**
 * Improve Prompt Response
 * 提示词优化结果
 */
export const improvePromptResponseSchema = apiSuccessResponseSchema(
  z.object({
    profile: agentProfileSummarySchema,
    target: z.enum(['image', 'video']),
    originalPrompt: z.string(),
    improvedPrompt: z.string(),
    notes: z.array(z.string()).default([])
  })
)

export type ImprovePromptRequest = z.infer<typeof improvePromptRequestSchema>
export type ImprovePromptResponse = z.infer<typeof improvePromptResponseSchema>
