import { z } from 'zod'

export const canvasMediaKindSchema = z.enum(['image', 'video'])

export const canvasResourceTypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'text'
])

export const canvasResourceMetadataSchema = z
  .object({
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional(),
    text: z.string().optional(),
    referenceVoice: z.string().optional()
  })
  .catchall(z.unknown())

export const canvasResourceStorageSchema = z
  .object({
    key: z.string().min(1).optional(),
    viewPath: z.string().min(1).optional(),
    publicUrl: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.key || value.viewPath || value.publicUrl), {
    message: 'At least one storage locator is required'
  })

export const canvasResourceSchema = z.object({
  id: z.string().min(1),
  type: canvasResourceTypeSchema,
  url: z.string().default(''),
  assetId: z.string().nullable().optional(),
  storage: canvasResourceStorageSchema.optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  metadata: canvasResourceMetadataSchema.optional(),
  createdAt: z.number(),
  createdBy: z.string().min(1)
})

export type CanvasResourceType = z.infer<typeof canvasResourceTypeSchema>
export type CanvasResourceMetadata = z.infer<
  typeof canvasResourceMetadataSchema
>
export type CanvasResourceStorage = z.infer<typeof canvasResourceStorageSchema>
export type CanvasResource = z.infer<typeof canvasResourceSchema>
