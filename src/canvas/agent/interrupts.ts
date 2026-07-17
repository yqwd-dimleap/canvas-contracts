import { z } from 'zod'

/**
 * 中断-恢复上行契约。
 *
 * Agent 通过 `canvas2d_request_user_input` 工具触发 LangGraph interrupt，
 * 运行暂停并下发 `agent.interrupt`（needsUserInput: true）。前端通过
 * LangGraph 协议的 `input.respond` 上行本 payload 作为 resume 值，
 * 后端以 `Command({ resume })` 恢复被中断的图。
 */
export const canvasAgentInterruptResponseSchema = z
  .object({
    messageId: z.string().trim().min(1),
    /** 用户对澄清问题的回答（自由文本或选中的建议 intent）。 */
    text: z.string().min(1)
  })
  .strict()

export type CanvasAgentInterruptResponse = z.infer<
  typeof canvasAgentInterruptResponseSchema
>

/**
 * 中断 ID 约定：`${runId}:interrupt`。
 * 单 run 至多一个待恢复中断；ID 可从事件/运行时状态直接推导，
 * 也用于 input.respond 时校验 resume 目标未过期。
 */
export function canvasAgentInterruptIdForRun(runId: string) {
  return `${runId}:interrupt`
}

/**
 * Parse input.respond without accepting legacy bare-string responses.
 */
export function parseCanvasAgentInterruptResponse(
  value: unknown
): CanvasAgentInterruptResponse | null {
  const parsed = canvasAgentInterruptResponseSchema.safeParse(value)
  if (!parsed.success) return null
  const text = parsed.data.text.trim()
  return text ? { messageId: parsed.data.messageId, text } : null
}
