import { z } from 'zod'
import { canvasResourceSchema } from '../resources/types.js'
import {
  canvasDocumentElementSchema,
  canvasDocumentSchema
} from './document.js'

export const canvasPointSchema = z.object({
  x: z.number(),
  y: z.number()
})

export const canvasBoundsSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative()
})

export const canvasOperationSourceSchema = z.enum(['user', 'agent', 'system'])

export const canvasOperationStatusSchema = z.enum([
  'planning',
  'generating',
  'loading',
  'complete',
  'error'
])

export const canvasOperationHighlightStyleSchema = z.enum([
  'primary',
  'success',
  'warning',
  'error'
])

export const documentCreateOperationSchema = z.object({
  type: z.literal('document.create'),
  payload: z.object({
    document: canvasDocumentSchema
  })
})

export const documentPatchOperationSchema = z.object({
  type: z.literal('document.patch'),
  payload: z.object({
    documentId: z.string().min(1),
    patch: z.record(z.string(), z.unknown()).default({})
  })
})

export const documentDeleteOperationSchema = z.object({
  type: z.literal('document.delete'),
  payload: z.object({
    documentId: z.string().min(1)
  })
})

export const elementAddOperationSchema = z.object({
  type: z.literal('element.add'),
  payload: z.object({
    documentId: z.string().min(1),
    element: canvasDocumentElementSchema
  })
})

export const elementPatchOperationSchema = z.object({
  type: z.literal('element.patch'),
  payload: z.object({
    documentId: z.string().min(1),
    elementId: z.string().min(1),
    patch: z.record(z.string(), z.unknown()).default({})
  })
})

export const elementDeleteOperationSchema = z.object({
  type: z.literal('element.delete'),
  payload: z.object({
    documentId: z.string().min(1),
    elementId: z.string().min(1)
  })
})

export const elementReorderOperationSchema = z.object({
  type: z.literal('element.reorder'),
  payload: z.object({
    documentId: z.string().min(1),
    elementId: z.string().min(1),
    zIndex: z.number().int().nonnegative()
  })
})

export const elementSelectOperationSchema = z.object({
  type: z.literal('element.select'),
  payload: z.object({
    documentId: z.string().min(1),
    elementIds: z.array(z.string().min(1)).default([])
  })
})

export const elementStatusOperationSchema = z.object({
  type: z.literal('element.status'),
  payload: z.object({
    documentId: z.string().min(1).optional(),
    elementId: z.string().min(1),
    status: canvasOperationStatusSchema.nullable(),
    detail: z.string().optional()
  })
})

export const elementGenerationProgressOperationSchema = z.object({
  type: z.literal('element.generationProgress'),
  payload: z.object({
    documentId: z.string().min(1).optional(),
    elementId: z.string().min(1),
    progress: z.number().min(0).max(100),
    previewResource: canvasResourceSchema.optional(),
    message: z.string().optional()
  })
})

export const elementHighlightOperationSchema = z.object({
  type: z.literal('element.highlight'),
  payload: z.object({
    documentId: z.string().min(1).optional(),
    elementIds: z.array(z.string().min(1)),
    duration: z.number().positive().optional(),
    style: canvasOperationHighlightStyleSchema.optional()
  })
})

export const elementClearHighlightOperationSchema = z.object({
  type: z.literal('element.clearHighlight'),
  payload: z.object({
    documentId: z.string().min(1).optional(),
    elementIds: z.array(z.string().min(1)).optional()
  })
})

export const viewportSetOperationSchema = z.object({
  type: z.literal('viewport.set'),
  payload: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().positive()
  })
})

export const viewportFocusOperationSchema = z.object({
  type: z.literal('viewport.focus'),
  payload: z.object({
    documentId: z.string().min(1).optional(),
    elementId: z.string().min(1).optional(),
    bounds: canvasBoundsSchema.optional(),
    zoom: z.number().positive().optional()
  })
})

const canvasOperationBaseSchema = z.discriminatedUnion('type', [
  documentCreateOperationSchema,
  documentPatchOperationSchema,
  documentDeleteOperationSchema,
  elementAddOperationSchema,
  elementPatchOperationSchema,
  elementDeleteOperationSchema,
  elementReorderOperationSchema,
  elementSelectOperationSchema,
  elementStatusOperationSchema,
  elementGenerationProgressOperationSchema,
  elementHighlightOperationSchema,
  elementClearHighlightOperationSchema,
  viewportSetOperationSchema,
  viewportFocusOperationSchema
])

export const batchOperationSchema: z.ZodType<{
  type: 'batch'
  payload: {
    operations: z.infer<typeof canvasOperationBaseSchema>[]
    label?: string
  }
}> = z.lazy(() =>
  z.object({
    type: z.literal('batch'),
    payload: z.object({
      operations: z.array(canvasOperationBaseSchema),
      label: z.string().optional()
    })
  })
)

export const canvasOperationSchema = z.union([
  canvasOperationBaseSchema,
  batchOperationSchema
])

export const operationMetadataSchema = z.object({
  id: z.string().min(1),
  timestamp: z.number(),
  source: canvasOperationSourceSchema,
  transient: z.boolean().default(false)
})

export const canvasOperationRecordSchema = z.object({
  operation: canvasOperationSchema,
  metadata: operationMetadataSchema
})

export type CanvasPoint = z.infer<typeof canvasPointSchema>
export type CanvasBounds = z.infer<typeof canvasBoundsSchema>
export type CanvasOperationSource = z.infer<typeof canvasOperationSourceSchema>
export type CanvasOperationStatus = z.infer<typeof canvasOperationStatusSchema>
export type CanvasOperationHighlightStyle = z.infer<
  typeof canvasOperationHighlightStyleSchema
>
export type CanvasOperation = z.infer<typeof canvasOperationSchema>
export type OperationMetadata = z.infer<typeof operationMetadataSchema>
export type CanvasOperationRecord = z.infer<typeof canvasOperationRecordSchema>
export type DocumentCreateOperation = z.infer<
  typeof documentCreateOperationSchema
>
export type DocumentPatchOperation = z.infer<
  typeof documentPatchOperationSchema
>
export type DocumentDeleteOperation = z.infer<
  typeof documentDeleteOperationSchema
>
export type ElementAddOperation = z.infer<typeof elementAddOperationSchema>
export type ElementPatchOperation = z.infer<typeof elementPatchOperationSchema>
export type ElementDeleteOperation = z.infer<
  typeof elementDeleteOperationSchema
>
export type ElementReorderOperation = z.infer<
  typeof elementReorderOperationSchema
>
export type ElementSelectOperation = z.infer<
  typeof elementSelectOperationSchema
>
export type ElementStatusOperation = z.infer<
  typeof elementStatusOperationSchema
>
export type ElementGenerationProgressOperation = z.infer<
  typeof elementGenerationProgressOperationSchema
>
export type ElementHighlightOperation = z.infer<
  typeof elementHighlightOperationSchema
>
export type ElementClearHighlightOperation = z.infer<
  typeof elementClearHighlightOperationSchema
>
export type ViewportSetOperation = z.infer<typeof viewportSetOperationSchema>
export type ViewportFocusOperation = z.infer<
  typeof viewportFocusOperationSchema
>
export type BatchOperation = z.infer<typeof batchOperationSchema>
