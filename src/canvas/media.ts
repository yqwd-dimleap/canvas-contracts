import { z } from 'zod'

export const xyPositionSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const canvasMediaKindSchema = z.enum(['image', 'video'])

export const canvasMediaEntrySchema = z.object({
  id: z.string().min(1),
  src: z.string(),
  kind: canvasMediaKindSchema,
  assetId: z.string().nullable().optional(),
  modelUrl: z.string().nullable().optional(),
  position: xyPositionSchema.nullable()
})

export type XYPositionContract = z.infer<typeof xyPositionSchema>
export type CanvasMediaKind = z.infer<typeof canvasMediaKindSchema>
export type CanvasMediaEntry = z.infer<typeof canvasMediaEntrySchema>
