import { z } from 'zod'

export const canvasResourceTypeSchema = z.enum(['image', 'video', 'audio', 'text'])

export const canvasResourceMetadataSchema = z
  .object({
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional()
  })
  .catchall(z.unknown())

export const canvasResourceSchema = z.object({
  id: z.string().min(1),
  type: canvasResourceTypeSchema,
  url: z.string().default(''),
  assetId: z.string().nullable().optional(),
  modelUrl: z.string().nullable().optional(),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  metadata: canvasResourceMetadataSchema.optional(),
  createdAt: z.number(),
  createdBy: z.string().min(1)
})

export const edgeDependencyTypeSchema = z.enum(['data', 'reference', 'wait'])

export const resourceFilterSchema = z.object({
  types: z.array(canvasResourceTypeSchema).optional(),
  ids: z.array(z.string()).optional()
})

export type CanvasResourceType = z.infer<typeof canvasResourceTypeSchema>
export type CanvasResource = z.infer<typeof canvasResourceSchema>
export type EdgeDependencyType = z.infer<typeof edgeDependencyTypeSchema>
export type ResourceFilter = z.infer<typeof resourceFilterSchema>
