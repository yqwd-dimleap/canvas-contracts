import { z } from 'zod'
import { apiSuccessResponseSchema } from '../../api/response.js'
import { timestampSchema } from '../../shared/timestamp.js'

export const brandKitStatusSchema = z.enum(['draft', 'published', 'archived'])
export type BrandKitStatus = z.infer<typeof brandKitStatusSchema>

export const brandKitVersionStatusSchema = z.enum([
  'draft',
  'published',
  'superseded'
])
export type BrandKitVersionStatus = z.infer<typeof brandKitVersionStatusSchema>

export const brandColorTokenSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(128),
    role: z.enum(['primary', 'secondary', 'accent', 'neutral', 'semantic'])
  })
  .strict()

export const brandTypographyTokenSchema = z
  .object({
    id: z.string().min(1).max(128),
    role: z.enum(['display', 'heading', 'body', 'caption', 'mono']),
    fontFamily: z.string().trim().min(1).max(256),
    fontAssetId: z.string().min(1).nullable(),
    weights: z.array(z.number().int().min(100).max(900)).min(1).max(9),
    fallbackFamilies: z.array(z.string().trim().min(1).max(256)).max(8)
  })
  .strict()

export const brandAssetRoleSchema = z.enum([
  'logo_primary',
  'logo_secondary',
  'logo_mark',
  'imagery',
  'illustration',
  'icon',
  'pattern'
])

export const brandAssetBindingSchema = z
  .object({
    id: z.string().min(1).max(128),
    assetId: z.string().min(1).max(128),
    role: brandAssetRoleSchema,
    name: z.string().trim().min(1).max(160),
    usage: z.string().trim().max(1000).default('')
  })
  .strict()

export const brandStyleTokensSchema = z
  .object({
    radius: z.array(z.number().nonnegative()).max(12).default([]),
    spacing: z.array(z.number().nonnegative()).max(16).default([]),
    shadows: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(80),
            value: z.string().trim().min(1).max(256)
          })
          .strict()
      )
      .max(16)
      .default([])
  })
  .strict()

export const brandVoiceGuidelinesSchema = z
  .object({
    tone: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
    do: z.array(z.string().trim().min(1).max(1000)).max(50).default([]),
    dont: z.array(z.string().trim().min(1).max(1000)).max(50).default([]),
    notes: z.string().trim().max(10_000).default('')
  })
  .strict()

export const brandKitVersionSchema = z
  .object({
    id: z.string().min(1),
    brandKitId: z.string().min(1),
    workspaceId: z.string().min(1),
    version: z.number().int().positive(),
    revision: z.number().int().nonnegative(),
    status: brandKitVersionStatusSchema,
    colors: z.array(brandColorTokenSchema).max(100).default([]),
    typography: z.array(brandTypographyTokenSchema).max(20).default([]),
    assets: z.array(brandAssetBindingSchema).max(500).default([]),
    styles: brandStyleTokensSchema.default({
      radius: [],
      spacing: [],
      shadows: []
    }),
    voice: brandVoiceGuidelinesSchema.default({
      tone: [],
      do: [],
      dont: [],
      notes: ''
    }),
    createdByUserId: z.string().min(1),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    publishedAt: timestampSchema.nullable()
  })
  .strict()
  .superRefine((version, context) => {
    const ids = [
      ...version.colors.map((token) => token.id),
      ...version.typography.map((token) => token.id),
      ...version.assets.map((asset) => asset.id)
    ]
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'BRAND_KIT_TOKEN_IDS_MUST_BE_UNIQUE'
      })
    }
  })

export const workspaceBrandKitSchema = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000),
    coverAssetId: z.string().min(1).nullable(),
    status: brandKitStatusSchema,
    activeVersionId: z.string().min(1).nullable(),
    revision: z.number().int().nonnegative(),
    createdByUserId: z.string().min(1),
    createdAt: timestampSchema,
    updatedAt: timestampSchema
  })
  .strict()

/** Mongo document and transport use the same timestamp-normalized shape. */
export const workspaceBrandKitDocumentSchema = workspaceBrandKitSchema

export const workspaceBrandKitRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).default(''),
    coverAssetId: z.string().trim().min(1).max(128).nullable().default(null)
  })
  .strict()

export const updateWorkspaceBrandKitRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(2000).optional(),
    coverAssetId: z.string().trim().min(1).max(128).nullable().optional(),
    revision: z.number().int().nonnegative()
  })
  .strict()

export const createBrandKitVersionRequestSchema = z
  .object({
    colors: z.array(brandColorTokenSchema).max(100).default([]),
    typography: z.array(brandTypographyTokenSchema).max(20).default([]),
    assets: z.array(brandAssetBindingSchema).max(500).default([]),
    styles: brandStyleTokensSchema.default({
      radius: [],
      spacing: [],
      shadows: []
    }),
    voice: brandVoiceGuidelinesSchema.default({
      tone: [],
      do: [],
      dont: [],
      notes: ''
    })
  })
  .strict()

export const updateBrandKitVersionRequestSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    colors: z.array(brandColorTokenSchema).max(100).optional(),
    typography: z.array(brandTypographyTokenSchema).max(20).optional(),
    assets: z.array(brandAssetBindingSchema).max(500).optional(),
    styles: brandStyleTokensSchema.optional(),
    voice: brandVoiceGuidelinesSchema.optional()
  })
  .strict()

export const listWorkspaceBrandKitsResponseSchema = z
  .object({ kits: z.array(workspaceBrandKitSchema) })
  .strict()

export const workspaceBrandKitResponseSchema = z
  .object({ kit: workspaceBrandKitSchema })
  .strict()

export const brandKitVersionResponseSchema = z
  .object({ version: brandKitVersionSchema })
  .strict()

export const listBrandKitVersionsResponseSchema = z
  .object({ versions: z.array(brandKitVersionSchema) })
  .strict()

export const publishBrandKitVersionResponseSchema = z
  .object({ kit: workspaceBrandKitSchema, version: brandKitVersionSchema })
  .strict()

export const workspaceBrandKitDeleteResponseSchema = z
  .object({ success: z.literal(true) })
  .strict()

export const listWorkspaceBrandKitsApiResponseSchema = apiSuccessResponseSchema(
  listWorkspaceBrandKitsResponseSchema
)
export const workspaceBrandKitApiResponseSchema = apiSuccessResponseSchema(
  workspaceBrandKitResponseSchema
)
export const brandKitVersionApiResponseSchema = apiSuccessResponseSchema(
  brandKitVersionResponseSchema
)
export const listBrandKitVersionsApiResponseSchema = apiSuccessResponseSchema(
  listBrandKitVersionsResponseSchema
)
export const publishBrandKitVersionApiResponseSchema = apiSuccessResponseSchema(
  publishBrandKitVersionResponseSchema
)
export const workspaceBrandKitDeleteApiResponseSchema =
  apiSuccessResponseSchema(workspaceBrandKitDeleteResponseSchema)

export type BrandColorToken = z.infer<typeof brandColorTokenSchema>
export type BrandTypographyToken = z.infer<typeof brandTypographyTokenSchema>
export type BrandAssetBinding = z.infer<typeof brandAssetBindingSchema>
export type BrandStyleTokens = z.infer<typeof brandStyleTokensSchema>
export type BrandVoiceGuidelines = z.infer<typeof brandVoiceGuidelinesSchema>
export type BrandKitVersion = z.infer<typeof brandKitVersionSchema>
export type WorkspaceBrandKit = z.infer<typeof workspaceBrandKitSchema>
export type WorkspaceBrandKitDocument = z.infer<
  typeof workspaceBrandKitDocumentSchema
>
export type WorkspaceBrandKitRequest = z.infer<
  typeof workspaceBrandKitRequestSchema
>
export type UpdateWorkspaceBrandKitRequest = z.infer<
  typeof updateWorkspaceBrandKitRequestSchema
>
export type CreateBrandKitVersionRequest = z.infer<
  typeof createBrandKitVersionRequestSchema
>
export type UpdateBrandKitVersionRequest = z.infer<
  typeof updateBrandKitVersionRequestSchema
>
