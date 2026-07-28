import { z } from 'zod'

/**
 * 生成请求的运行时上下文 schema —— 前端 → agent 的请求体。
 * 顶层保持小而稳定；所有模型参数统一走 params +
 * metadata.payload.request.body 模板，不再从顶层运行时字段直通。
 */

export const canvasGenerationTargetSchema = z
  .object({
    source: z.enum(['canvas2d', 'agent', 'api']).default('api'),
    documentId: z.string().min(1).max(128).optional(),
    elementId: z.string().min(1).max(128).optional(),
    resourceId: z.string().min(1).max(128).optional(),
    actionId: z.string().min(1).max(128).optional()
  })
  .strict()

export const generationParamsSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Model control values. Keys must match metadata.payload.controls; metadata.payload.request.body maps them to the provider request.'
  )

export const generationSystemSchema = z
  .object({
    /** Frontend project id; used by agent-side asset registration only. */
    projectId: z.string().min(1).max(128).nullable().optional(),
    /** Renderer-agnostic Canvas2D target for persistence/events. */
    canvasTarget: canvasGenerationTargetSchema.optional()
  })
  .strict()

/**
 * Provider-neutral media reference vocabulary.
 *
 * References are deliberately model-independent. Provider-specific fields
 * such as image_url, video_url, imgUrl, or drivingAudioUrl are only rendered
 * from metadata.payload.request.body after server-side media resolution.
 */
export const generationReferenceMediaTypeSchema = z.enum([
  'image',
  'video',
  'audio'
])

export const generationReferenceRoleSchema = z.enum([
  'reference',
  'first_frame',
  'last_frame',
  'source',
  'clip',
  'driving_audio',
  'style',
  'mask',
  'reference_voice'
])

/**
 * Reference roles are provider-neutral, but not interchangeable. Keeping this
 * matrix at the contract boundary prevents an apparently valid request such as
 * an audio `first_frame` from reaching a provider template.
 */
const REFERENCE_ROLES_BY_MEDIA_TYPE = {
  image: new Set([
    'reference',
    'first_frame',
    'last_frame',
    'source',
    'style',
    'mask'
  ]),
  video: new Set(['reference', 'source', 'clip']),
  audio: new Set(['reference', 'driving_audio', 'reference_voice'])
} as const

export const generationReferenceSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('asset'),
      assetId: z.string().trim().min(1).max(128)
    })
    .strict(),
  z
    .object({
      kind: z.literal('url'),
      url: z.string().trim().min(1).max(16_000)
    })
    .strict()
])

export const generationReferenceSchema = z
  .object({
    mediaType: generationReferenceMediaTypeSchema,
    role: generationReferenceRoleSchema.default('reference'),
    source: generationReferenceSourceSchema
  })
  .strict()
  .superRefine((reference, context) => {
    if (
      REFERENCE_ROLES_BY_MEDIA_TYPE[reference.mediaType].has(reference.role)
    ) {
      return
    }
    context.addIssue({
      code: 'custom',
      path: ['role'],
      message: `Role "${reference.role}" is not valid for ${reference.mediaType} media.`
    })
  })

export const generationReferencesSchema = z
  .object({
    items: z.array(generationReferenceSchema).max(16).default([])
  })
  .strict()

export type GenerationReference = z.infer<typeof generationReferenceSchema>
export type GenerationReferences = z.infer<typeof generationReferencesSchema>

function referenceIdentity(reference: GenerationReference): string {
  return `${reference.mediaType}:${reference.role}:${reference.source.kind}:${
    reference.source.kind === 'asset'
      ? reference.source.assetId
      : reference.source.url
  }`
}

/** Keep source order while removing semantically duplicate references. */
export function mergeGenerationReferences(
  ...groups: ReadonlyArray<readonly GenerationReference[]>
): GenerationReferences {
  const seen = new Set<string>()
  const items: GenerationReference[] = []
  for (const group of groups) {
    for (const reference of group) {
      const identity = referenceIdentity(reference)
      if (seen.has(identity)) continue
      seen.add(identity)
      items.push(reference)
    }
  }
  return { items }
}

export const imageGenerationParamsSchema = z
  .object({
    prompt: z.string().describe('Generation prompt.'),
    model: z
      .string()
      .min(1)
      .describe('Configured model id from GET /api/ai-image/models.'),
    params: generationParamsSchema.default({}),
    references: generationReferencesSchema
      .default({ items: [] })
      .describe('Reference media; kept separate from model controls.'),
    system: generationSystemSchema
      .default({})
      .describe('Canvas persistence context; omit for standalone API tests.')
  })
  .strict()

export const videoGenerationParamsSchema = z
  .object({
    prompt: z.string().describe('Generation prompt.'),
    model: z
      .string()
      .min(1)
      .describe('Configured model id from GET /api/ai-video/models.'),
    params: generationParamsSchema.default({}),
    references: generationReferencesSchema
      .default({ items: [] })
      .describe('Reference media; kept separate from model controls.'),
    system: generationSystemSchema
      .default({})
      .describe('Canvas persistence context; omit for standalone API tests.')
  })
  .strict()

/** Chat 消息（front-end → agent 的结构化消息数组）。 */
export const chatGenerationMessageSchema = z.looseObject({
  role: z.string().min(1),
  content: z.unknown()
})

export const chatGenerationParamsSchema = z
  .object({
    model: z.string().min(1),
    prompt: z.string().default(''),
    messages: z.array(chatGenerationMessageSchema).default([]),
    params: generationParamsSchema.default({}),
    references: generationReferencesSchema.default({ items: [] }),
    system: generationSystemSchema.default({})
  })
  .strict()
