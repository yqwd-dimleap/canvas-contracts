import { z } from 'zod'
import { canvasResourceSchema } from '../resources/types.js'
import { canvas2dViewportSchema } from '../view/canvas2d.js'
import { canvasDocumentSchema } from './document.js'

export const canvasContextSchema = z
  .object({
    documents: z.array(canvasDocumentSchema).default([]),
    activeDocumentId: z.string().nullable().default(null),
    viewport: canvas2dViewportSchema.optional(),
    resources: z.array(canvasResourceSchema).default([])
  })
  .default({
    documents: [],
    activeDocumentId: null,
    resources: []
  })

export const canvasSelectionSchema = z
  .object({
    documentId: z.string().nullable().default(null),
    elementIds: z.array(z.string()).default([]),
    resourceIds: z.array(z.string()).default([])
  })
  .default({
    documentId: null,
    elementIds: [],
    resourceIds: []
  })

export type CanvasContext = z.infer<typeof canvasContextSchema>
export type CanvasSelection = z.infer<typeof canvasSelectionSchema>
