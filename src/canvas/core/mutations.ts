import { z } from 'zod'
import { canvasResourceSchema } from '../resources/types.js'
import {
  canvasAdjustmentElementSchema,
  canvasDocumentElementSchema,
  canvasDocumentSchema,
  canvasGroupElementSchema,
  canvasMaskElementSchema,
  canvasPathElementSchema,
  canvasRasterElementSchema,
  canvasShapeElementSchema,
  canvasTextElementSchema,
  canvasVectorElementSchema
} from './document.js'

export const canvasMutationOriginSchema = z.enum(['user', 'agent', 'system'])
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

const mutationIdentitySchema = z.object({
  mutationId: z.string().trim().min(1)
})

const rasterPatchSchema = canvasRasterElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const textPatchSchema = canvasTextElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const shapePatchSchema = canvasShapeElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const vectorPatchSchema = canvasVectorElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const pathPatchSchema = canvasPathElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const groupPatchSchema = canvasGroupElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const maskPatchSchema = canvasMaskElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()
const adjustmentPatchSchema = canvasAdjustmentElementSchema
  .omit({ id: true, type: true, revision: true })
  .partial()
  .strict()

export const canvasElementPatchSchema = z.discriminatedUnion('elementType', [
  z
    .object({
      elementType: z.literal('raster'),
      patch: rasterPatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('text'),
      patch: textPatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('shape'),
      patch: shapePatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('vector'),
      patch: vectorPatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('path'),
      patch: pathPatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('group'),
      patch: groupPatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('mask'),
      patch: maskPatchSchema
    })
    .strict(),
  z
    .object({
      elementType: z.literal('adjustment'),
      patch: adjustmentPatchSchema
    })
    .strict()
])

export const canvasDocumentPatchSchema = canvasDocumentSchema
  .omit({
    id: true,
    projectId: true,
    schemaVersion: true,
    revision: true,
    elements: true,
    selectedElementIds: true,
    createdAt: true,
    updatedAt: true
  })
  .partial()
  .strict()

const documentCreateMutationSchema = mutationIdentitySchema
  .extend({
    type: z.literal('document.create'),
    payload: z
      .object({
        document: canvasDocumentSchema
      })
      .strict()
  })
  .strict()
const documentPatchMutationSchema = mutationIdentitySchema
  .extend({
    type: z.literal('document.patch'),
    payload: z
      .object({
        documentId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative(),
        patch: canvasDocumentPatchSchema
      })
      .strict()
  })
  .strict()
const documentDeleteMutationSchema = mutationIdentitySchema
  .extend({
    type: z.literal('document.delete'),
    payload: z
      .object({
        documentId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict()
const elementAddMutationSchema = mutationIdentitySchema
  .extend({
    type: z.literal('element.add'),
    payload: z
      .object({
        documentId: z.string().min(1),
        expectedDocumentRevision: z.number().int().nonnegative(),
        element: canvasDocumentElementSchema
      })
      .strict()
  })
  .strict()

const elementPatchPreconditionSchema = z.object({
  documentId: z.string().min(1),
  elementId: z.string().min(1),
  expectedRevision: z.number().int().nonnegative()
})

function elementPatchMutationSchema<
  TElementType extends string,
  TPatch extends z.ZodType
>(elementType: TElementType, patch: TPatch) {
  return mutationIdentitySchema
    .extend({
      type: z.literal('element.patch'),
      payload: elementPatchPreconditionSchema
        .extend({
          elementType: z.literal(elementType),
          patch
        })
        .strict()
    })
    .strict()
}

const elementPatchMutationSchemas = [
  elementPatchMutationSchema('raster', rasterPatchSchema),
  elementPatchMutationSchema('text', textPatchSchema),
  elementPatchMutationSchema('shape', shapePatchSchema),
  elementPatchMutationSchema('vector', vectorPatchSchema),
  elementPatchMutationSchema('path', pathPatchSchema),
  elementPatchMutationSchema('group', groupPatchSchema),
  elementPatchMutationSchema('mask', maskPatchSchema),
  elementPatchMutationSchema('adjustment', adjustmentPatchSchema)
] as const

const elementDeleteMutationSchema = mutationIdentitySchema
  .extend({
    type: z.literal('element.delete'),
    payload: z
      .object({
        documentId: z.string().min(1),
        elementId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict()
const elementReorderMutationSchema = mutationIdentitySchema
  .extend({
    type: z.literal('element.reorder'),
    payload: z
      .object({
        documentId: z.string().min(1),
        elementId: z.string().min(1),
        expectedRevision: z.number().int().nonnegative(),
        zIndex: z.number().int().nonnegative()
      })
      .strict()
  })
  .strict()

export const canvasMutationSchema = z.union([
  documentCreateMutationSchema,
  documentPatchMutationSchema,
  documentDeleteMutationSchema,
  elementAddMutationSchema,
  ...elementPatchMutationSchemas,
  elementDeleteMutationSchema,
  elementReorderMutationSchema
])

export const canvasMutationTransactionSchema = z
  .object({
    transactionId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    origin: canvasMutationOriginSchema,
    originRunId: z.string().trim().min(1).optional(),
    baseRevision: z.number().int().nonnegative(),
    mutations: z.array(canvasMutationSchema).min(1).max(500)
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>()
    for (const [index, mutation] of value.mutations.entries()) {
      if (ids.has(mutation.mutationId)) {
        context.addIssue({
          code: 'custom',
          path: ['mutations', index, 'mutationId'],
          message: 'mutationId must be unique within a transaction'
        })
      }
      ids.add(mutation.mutationId)
    }
    if (value.origin === 'agent' && !value.originRunId) {
      context.addIssue({
        code: 'custom',
        path: ['originRunId'],
        message: 'originRunId is required for agent transactions'
      })
    }
  })

export const canvasMutationConflictSchema = z
  .object({
    conflictId: z.string().trim().min(1),
    transactionId: z.string().trim().min(1),
    mutationId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    documentId: z.string().trim().min(1).optional(),
    elementId: z.string().trim().min(1).optional(),
    expectedRevision: z.number().int().nonnegative(),
    actualRevision: z.number().int().nonnegative(),
    userCandidate: z.unknown().optional(),
    agentCandidate: z.unknown().optional(),
    status: z.enum(['pending', 'keep_user', 'apply_agent']).default('pending'),
    createdAt: z.string().datetime()
  })
  .strict()

export const canvasMutationReceiptSchema = z
  .object({
    transactionId: z.string().trim().min(1),
    projectId: z.string().trim().min(1),
    status: z.enum(['committed', 'conflicted', 'skipped']),
    committedRevision: z.number().int().nonnegative(),
    appliedMutationIds: z.array(z.string().min(1)),
    skippedMutationIds: z.array(z.string().min(1)).default([]),
    changedDocumentIds: z.array(z.string().min(1)).default([]),
    changedElementIds: z.array(z.string().min(1)).default([]),
    conflicts: z.array(canvasMutationConflictSchema).default([]),
    committedAt: z.string().datetime()
  })
  .strict()

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

export const canvasTransientEffectSchema = z.discriminatedUnion('type', [
  z.object({
    effectId: z.string().min(1),
    type: z.literal('element.select'),
    payload: z.object({
      documentId: z.string().min(1),
      elementIds: z.array(z.string().min(1)).default([])
    })
  }),
  z.object({
    effectId: z.string().min(1),
    type: z.literal('element.status'),
    payload: z.object({
      documentId: z.string().min(1).optional(),
      elementId: z.string().min(1),
      status: canvasOperationStatusSchema.nullable(),
      detail: z.string().optional()
    })
  }),
  z.object({
    effectId: z.string().min(1),
    type: z.literal('element.generationProgress'),
    payload: z.object({
      documentId: z.string().min(1).optional(),
      elementId: z.string().min(1),
      progress: z.number().min(0).max(100),
      previewResource: canvasResourceSchema.optional(),
      message: z.string().optional()
    })
  }),
  z.object({
    effectId: z.string().min(1),
    type: z.literal('element.highlight'),
    payload: z.object({
      documentId: z.string().min(1).optional(),
      elementIds: z.array(z.string().min(1)),
      duration: z.number().positive().optional(),
      style: canvasOperationHighlightStyleSchema.optional()
    })
  }),
  z.object({
    effectId: z.string().min(1),
    type: z.literal('element.clearHighlight'),
    payload: z.object({
      documentId: z.string().min(1).optional(),
      elementIds: z.array(z.string().min(1)).optional()
    })
  }),
  z.object({
    effectId: z.string().min(1),
    type: z.literal('viewport.set'),
    payload: z.object({
      x: z.number(),
      y: z.number(),
      zoom: z.number().positive()
    })
  }),
  z.object({
    effectId: z.string().min(1),
    type: z.literal('viewport.focus'),
    payload: z.object({
      documentId: z.string().min(1).optional(),
      elementId: z.string().min(1).optional(),
      bounds: canvasBoundsSchema.optional(),
      zoom: z.number().positive().optional()
    })
  })
])

export const canvasConflictResolutionSchema = z
  .object({
    conflictId: z.string().trim().min(1),
    choice: z.enum(['keep_user', 'apply_agent'])
  })
  .strict()

export type CanvasMutationOrigin = z.infer<typeof canvasMutationOriginSchema>
export type CanvasOperationStatus = z.infer<typeof canvasOperationStatusSchema>
export type CanvasOperationHighlightStyle = z.infer<
  typeof canvasOperationHighlightStyleSchema
>
export type CanvasPoint = z.infer<typeof canvasPointSchema>
export type CanvasBounds = z.infer<typeof canvasBoundsSchema>
export type CanvasElementPatch = z.infer<typeof canvasElementPatchSchema>
export type CanvasDocumentPatch = z.infer<typeof canvasDocumentPatchSchema>
export type CanvasMutation = z.infer<typeof canvasMutationSchema>
export type CanvasMutationTransaction = z.infer<
  typeof canvasMutationTransactionSchema
>
export type CanvasMutationConflict = z.infer<
  typeof canvasMutationConflictSchema
>
export type CanvasMutationReceipt = z.infer<typeof canvasMutationReceiptSchema>
export type CanvasTransientEffect = z.infer<typeof canvasTransientEffectSchema>
export type CanvasConflictResolution = z.infer<
  typeof canvasConflictResolutionSchema
>
