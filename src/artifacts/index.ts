import { z } from 'zod'
import { canvasMutationTransactionSchema } from '../canvas/core/mutations.js'

export const artifactStatusSchema = z.enum([
  'created',
  'updating',
  'completed',
  'failed',
  'deleted'
])

export const artifactTypeSchema = z.enum([
  'text',
  'markdown',
  'canvas-transaction',
  'image',
  'video',
  'document',
  'data'
])

const artifactBaseSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  traceId: z.string().min(1).optional(),
  type: artifactTypeSchema,
  status: artifactStatusSchema,
  title: z.string().min(1).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
})

export const textArtifactSchema = artifactBaseSchema.extend({
  type: z.enum(['text', 'markdown']),
  content: z.object({
    text: z.string()
  })
})

export const canvasTransactionArtifactSchema = artifactBaseSchema.extend({
  type: z.literal('canvas-transaction'),
  content: z.object({
    transaction: canvasMutationTransactionSchema
  })
})

export const mediaArtifactSchema = artifactBaseSchema.extend({
  type: z.enum(['image', 'video']),
  content: z.object({
    url: z.string().min(1).optional(),
    assetId: z.string().nullable().optional(),
    mimeType: z.string().min(1).optional(),
    prompt: z.string().optional(),
    elementId: z.string().min(1).optional(),
    actionId: z.string().min(1).optional()
  })
})

export const genericArtifactSchema = artifactBaseSchema.extend({
  type: z.enum(['document', 'data']),
  content: z.unknown()
})

export const artifactSchema = z.discriminatedUnion('type', [
  textArtifactSchema,
  canvasTransactionArtifactSchema,
  mediaArtifactSchema,
  genericArtifactSchema
])

export const artifactPatchSchema = z.object({
  status: artifactStatusSchema.optional(),
  title: z.string().min(1).optional(),
  content: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export type ArtifactStatus = z.infer<typeof artifactStatusSchema>
export type ArtifactType = z.infer<typeof artifactTypeSchema>
export type Artifact = z.infer<typeof artifactSchema>
export type TextArtifact = z.infer<typeof textArtifactSchema>
export type CanvasTransactionArtifact = z.infer<
  typeof canvasTransactionArtifactSchema
>
export type MediaArtifact = z.infer<typeof mediaArtifactSchema>
export type GenericArtifact = z.infer<typeof genericArtifactSchema>
export type ArtifactPatch = z.infer<typeof artifactPatchSchema>
