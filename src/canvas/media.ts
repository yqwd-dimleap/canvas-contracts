import { z } from 'zod'
import { workspaceAssetMediaMetadataSchema } from '../storage/workspace-assets.js'
import { canvasResourceStorageSchema } from './resources.js'

export const xyPositionSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const canvasMediaKindSchema = z.enum(['image', 'video'])

export const canvasMediaEntrySchema = z.object({
  id: z.string().min(1),
  type: canvasMediaKindSchema,
  url: z.string(),
  assetId: z.string().nullable().optional(),
  storage: canvasResourceStorageSchema.optional(),
  metadata: z
    .object({
      media: workspaceAssetMediaMetadataSchema.optional()
    })
    .catchall(z.unknown())
    .optional(),
  mediaMetadata: workspaceAssetMediaMetadataSchema.nullable().optional(),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  position: xyPositionSchema.nullable()
})

export type XYPositionContract = z.infer<typeof xyPositionSchema>
export type CanvasMediaKind = z.infer<typeof canvasMediaKindSchema>
export type CanvasMediaEntry = z.infer<typeof canvasMediaEntrySchema>
