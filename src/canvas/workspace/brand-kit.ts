import { z } from 'zod'
import { apiSuccessResponseSchema } from '../../api/response.js'
import { timestampSchema } from '../../shared/timestamp.js'

export const workspaceBrandKitTokensSchema = z.record(z.string(), z.unknown())

export const workspaceBrandKitSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  name: z.string(),
  description: z.string().default(''),
  coverAssetId: z.string().nullable().default(null),
  assetIds: z.array(z.string()).default([]),
  tokens: workspaceBrandKitTokensSchema.default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
})

export const workspaceBrandKitDocumentSchema = workspaceBrandKitSchema.extend({
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const workspaceBrandKitRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().max(2000).optional(),
    coverAssetId: z.string().trim().min(1).max(128).nullable().optional(),
    assetIds: z.array(z.string().trim().min(1).max(128)).max(500).optional(),
    tokens: workspaceBrandKitTokensSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict()

export const listWorkspaceBrandKitsResponseSchema = z.object({
  kits: z.array(workspaceBrandKitSchema)
})

export const workspaceBrandKitResponseSchema = z.object({
  kit: workspaceBrandKitSchema
})

export const workspaceBrandKitDeleteResponseSchema = z.object({
  success: z.literal(true)
})

export const listWorkspaceBrandKitsApiResponseSchema = apiSuccessResponseSchema(
  listWorkspaceBrandKitsResponseSchema
)

export const workspaceBrandKitApiResponseSchema = apiSuccessResponseSchema(
  workspaceBrandKitResponseSchema
)

export const workspaceBrandKitDeleteApiResponseSchema =
  apiSuccessResponseSchema(workspaceBrandKitDeleteResponseSchema)

export type WorkspaceBrandKit = z.infer<typeof workspaceBrandKitSchema>
export type WorkspaceBrandKitDocument = z.infer<
  typeof workspaceBrandKitDocumentSchema
>
export type WorkspaceBrandKitRequest = z.infer<
  typeof workspaceBrandKitRequestSchema
>
