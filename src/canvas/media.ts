import { z } from 'zod'
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
  modelUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  storage: canvasResourceStorageSchema.optional(),
  width: z.number().positive().nullable().optional(),
  height: z.number().positive().nullable().optional(),
  position: xyPositionSchema.nullable()
})

export type XYPositionContract = z.infer<typeof xyPositionSchema>
export type CanvasMediaKind = z.infer<typeof canvasMediaKindSchema>
export type CanvasMediaEntry = z.infer<typeof canvasMediaEntrySchema>
