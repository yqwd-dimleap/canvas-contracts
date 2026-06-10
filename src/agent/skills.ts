import { z } from 'zod'
import { agentProfileTaskSchema } from './profiles.js'

/**
 * Agent Skills
 *
 * 用户可在对话面板工具栏选择的「技能」。技能不是一个独立的后端 agent，
 * 而是一段注入到 canvas 规划/对话系统提示里的行为修饰（systemPromptAddon），
 * 可选地声明一个更契合的 profile task 作为语义提示。
 *
 * 单一真相源：前端工具栏与后端注入都从 AGENT_SKILLS 读取。
 */
export const agentSkillIdSchema = z.enum([
  'creative-direction',
  'prompt-refinement',
  'critique-repair'
])

export const agentSkillSchema = z.object({
  id: agentSkillIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  /** 拼接到规划/对话系统提示末尾，引导 agent 的行为侧重。 */
  systemPromptAddon: z.string().min(1),
  /** 语义提示：该技能更契合的 profile task（本期仅作提示，不强制切换 profile）。 */
  preferredTask: agentProfileTaskSchema.optional()
})

export type AgentSkillId = z.infer<typeof agentSkillIdSchema>
export type AgentSkill = z.infer<typeof agentSkillSchema>

export const AGENT_SKILLS: readonly AgentSkill[] = [
  {
    id: 'creative-direction',
    name: 'Creative direction',
    description: '以创意总监视角拓展画面方向、风格与叙事张力。',
    systemPromptAddon: [
      'Act as a creative director.',
      'Prioritize visual concept, mood, composition and narrative tension.',
      'Offer bold, specific creative directions rather than generic suggestions.'
    ].join(' ')
  },
  {
    id: 'prompt-refinement',
    name: 'Prompt refinement',
    description: '把粗略想法打磨成精准、可生成的高质量提示词。',
    systemPromptAddon: [
      'Act as a prompt engineer.',
      'Refine the user intent into precise, production-ready generation prompts.',
      'Make subject, style, lighting, camera and detail cues explicit and unambiguous.'
    ].join(' '),
    preferredTask: 'prompt-director'
  },
  {
    id: 'critique-repair',
    name: 'Critique and repair',
    description: '审视已有结果，定位问题并给出可执行的修复方案。',
    systemPromptAddon: [
      'Act as a critical reviewer.',
      'Inspect existing canvas results, identify concrete weaknesses, and propose actionable repairs.',
      'Be specific about what to change and why.'
    ].join(' '),
    preferredTask: 'critic'
  }
] as const

/** 按 id 查找内置技能。 */
export function findAgentSkill(
  id: AgentSkillId | string | null | undefined
): AgentSkill | undefined {
  if (!id) return undefined
  return AGENT_SKILLS.find((skill) => skill.id === id)
}
