import { z } from 'zod'

/**
 * 公开作品（featured works）DTO —— 单一真相源。
 *
 * canvas-agent 的 GET /api/public/works[/:id] 输出、前端首页画廊与作品详情
 * （RSC works-repository 及 `components/works/*`、`components/home/*`）共读此形状。
 * 类型此前散落在 `canvas-frontend/types/workspace/works.ts`，现下沉到 contracts，
 * 前端该文件改为再导出这里的类型，避免两端各自定义漂移。
 *
 * 这是**展示层 DTO**：字段语义面向渲染，非数据库原始文档。后端 featured 文档到
 * 此 DTO 的映射见 agent 侧 `featuredWorkToPublicWork`。
 */

export const workMediumSchema = z.enum(['image', 'video'])
export const workSourceSchema = z.enum(['curated', 'community'])
export const workQualitySchema = z.enum(['auto', 'high', 'medium', 'low'])
export const workMediaSourceSchema = z.enum([
  'cover',
  'preview',
  'session',
  'run',
  'resource',
  'asset'
])

export const agentActionIdSchema = z.enum([
  'remix',
  'upscale',
  'remove-bg',
  'restyle',
  'animate',
  'extend',
  'describe'
])

/** 作品详情页可执行的 Agent 动作按钮。 */
export const agentActionSchema = z.object({
  id: agentActionIdSchema,
  label: z.string(),
  description: z.string(),
  available: z.boolean()
})

/** 作品封面的动效（悬停播放）来源。 */
export const workCoverMotionSchema = z.object({
  type: workMediumSchema,
  src: z.string(),
  poster: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  durationSec: z.number().optional()
})

/** 作品下的单条媒体（封面 + 生成产物），详情页画廊逐条渲染。 */
export const workMediaSchema = z.object({
  id: z.string(),
  medium: workMediumSchema,
  src: z.string(),
  poster: z.string(),
  width: z.number(),
  height: z.number(),
  durationSec: z.number().optional(),
  source: workMediaSourceSchema.optional(),
  label: z.string().optional(),
  createdAt: z.string().optional(),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  model: z.string().optional(),
  seed: z.string().optional(),
  guidance: z.number().optional(),
  steps: z.number().optional(),
  size: z.string().optional(),
  quality: workQualitySchema.optional(),
  runId: z.string().optional(),
  generationSource: z.enum(['media', 'work']).optional()
})

export const workAuthorSchema = z.object({
  name: z.string(),
  handle: z.string(),
  avatar: z.string().optional()
})

/** 公开作品完整 DTO。 */
export const workSchema = z.object({
  id: z.string(),
  source: workSourceSchema,
  title: z.string(),
  author: workAuthorSchema,
  createdAt: z.string(),
  medium: workMediumSchema,
  src: z.string(),
  poster: z.string(),
  coverMotion: workCoverMotionSchema.optional(),
  width: z.number(),
  height: z.number(),
  durationSec: z.number().optional(),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  model: z.string(),
  seed: z.string().optional(),
  guidance: z.number().optional(),
  steps: z.number().optional(),
  size: z.string(),
  quality: workQualitySchema.optional(),
  tags: z.array(z.string()),
  categories: z.array(z.string()).optional(),
  agentActions: z.array(agentActionSchema),
  related: z.array(z.string()),
  media: z.array(workMediaSchema).optional()
})

export type WorkMedium = z.infer<typeof workMediumSchema>
export type WorkMedia = z.infer<typeof workMediaSchema>
export type Work = z.infer<typeof workSchema>
