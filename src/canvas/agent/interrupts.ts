import { z } from 'zod'

/**
 * 中断-恢复上行契约。
 *
 * Agent 通过 `canvas2d_request_user_input` 工具触发 LangGraph interrupt，
 * 运行暂停并下发 `agent.interrupt`（needsUserInput: true）。前端通过
 * LangGraph 协议的 `input.respond` 上行本 payload 作为 resume 值，
 * 后端以 `Command({ resume })` 恢复被中断的图。
 */
export const canvasAgentInterruptResponseSchema = z.object({
  /** 用户对澄清问题的回答（自由文本或选中的建议 intent）。 */
  text: z.string().min(1)
})

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
 * 宽松解析 input.respond 的 response 值：
 * 接受契约对象或裸字符串（SDK 层 response 类型为 any）。
 */
export function parseCanvasAgentInterruptResponse(
  value: unknown
): CanvasAgentInterruptResponse | null {
  if (typeof value === 'string' && value.trim()) {
    return { text: value.trim() }
  }
  const parsed = canvasAgentInterruptResponseSchema.safeParse(value)
  if (!parsed.success) return null
  const text = parsed.data.text.trim()
  return text ? { text } : null
}
