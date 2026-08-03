import { z } from 'zod'

/** Admin-owned model metadata used by the public home-page model showcase. */
export const AI_MODEL_SHOWCASE_METADATA_KEY = 'showcase'

const modelShowcaseUrlSchema = z
  .string()
  .trim()
  .url()
  .max(4096)
  .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
    message: 'Showcase media URLs must use HTTP or HTTPS.'
  })

export const modelShowcaseMediaSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('image'),
      url: modelShowcaseUrlSchema
    })
    .strict(),
  z
    .object({
      type: z.literal('video'),
      url: modelShowcaseUrlSchema,
      posterUrl: modelShowcaseUrlSchema.optional()
    })
    .strict()
])

export const modelShowcaseConfigSchema = z
  .object({
    visible: z.boolean().default(true),
    sortOrder: z.number().int().min(-9999).max(9999).default(0),
    description: z.string().trim().min(1).max(320).optional(),
    media: modelShowcaseMediaSchema.optional()
  })
  .strict()

export type ModelShowcaseMedia = z.infer<typeof modelShowcaseMediaSchema>
export type ModelShowcaseConfig = z.infer<typeof modelShowcaseConfigSchema>

export const DEFAULT_MODEL_SHOWCASE_CONFIG: ModelShowcaseConfig = {
  visible: true,
  sortOrder: 0
}

export function readModelShowcaseConfig(
  metadata: Record<string, unknown> | null | undefined
): ModelShowcaseConfig {
  const parsed = modelShowcaseConfigSchema.safeParse(
    metadata?.[AI_MODEL_SHOWCASE_METADATA_KEY]
  )
  return parsed.success ? parsed.data : { ...DEFAULT_MODEL_SHOWCASE_CONFIG }
}

export function mergeModelShowcaseConfig(
  metadata: Record<string, unknown> | null | undefined,
  showcase: ModelShowcaseConfig
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [AI_MODEL_SHOWCASE_METADATA_KEY]: modelShowcaseConfigSchema.parse(showcase)
  }
}
