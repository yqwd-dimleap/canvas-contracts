import { z } from 'zod'
import { agentProfileSummarySchema } from '../agent/profiles.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasAgentBaseRequestSchema } from './plan.js'

/**
 * Review Result Request
 * 结果评审请求（节点生成结果的质量评估）
 */
export const reviewResultRequestSchema = canvasAgentBaseRequestSchema.extend({
  nodeId: z.string().min(1),
  prompt: z.string().optional(),
  resultUrl: z.string().min(1),
  resultType: z.enum(['image', 'video'])
})

/**
 * Review Result Response
 * 结果评审结果（通过/需人工审查/建议修复）
 */
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

export type ReviewResultRequest = z.infer<typeof reviewResultRequestSchema>
export type ReviewResultResponse = z.infer<typeof reviewResultResponseSchema>
