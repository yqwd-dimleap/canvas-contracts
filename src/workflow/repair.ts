import { z } from 'zod'
import { agentProfileSummarySchema } from '../agent/profiles.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasAgentBaseRequestSchema, canvasPlanActionSchema } from './plan.js'

/**
 * Repair Node Request
 * 节点修复请求（诊断并修复失败的节点）
 */
export const repairNodeRequestSchema = canvasAgentBaseRequestSchema.extend({
  nodeId: z.string().min(1),
  issue: z.string().optional(),
  lastError: z.string().optional()
})

/**
 * Repair Node Response
 * 节点修复结果（诊断结果、修复动作、是否建议重试）
 */
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

export type RepairNodeRequest = z.infer<typeof repairNodeRequestSchema>
export type RepairNodeResponse = z.infer<typeof repairNodeResponseSchema>
