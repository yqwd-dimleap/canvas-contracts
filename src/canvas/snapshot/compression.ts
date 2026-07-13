import { z } from 'zod'
import {
  canvasDocumentElementSchema,
  canvasDocumentSchema
} from '../core/document.js'

export const canvasDiffChangeSchema = z.object({
  type: z.enum(['added', 'updated', 'deleted']),
  documentId: z.string().optional(),
  elementId: z.string().optional(),
  document: canvasDocumentSchema.optional(),
  element: canvasDocumentElementSchema.optional(),
  updates: z.record(z.string(), z.unknown()).optional()
})

export const canvasDiffSnapshotSchema = z.object({
  type: z.literal('diff'),
  baseVersion: z.string(),
  version: z.string(),
  timestamp: z.number(),
  changes: z.object({
    documents: z.array(canvasDiffChangeSchema).default([]),
    elements: z.array(canvasDiffChangeSchema).default([])
  })
})

export const canvasSemanticSummarySchema = z.object({
  summary: z.string(),
  statistics: z.object({
    documentCount: z.number(),
    elementCount: z.number(),
    elementTypes: z.record(z.string(), z.number()),
    selectedCount: z.number(),
    lastModified: z.number()
  }),
  theme: z.string().optional(),
  keyTopics: z.array(z.string()).optional(),
  completionStatus: z
    .enum(['empty', 'planning', 'in-progress', 'near-complete', 'complete'])
    .optional()
})

export const canvasCompressedSnapshotSchema = z.object({
  type: z.literal('compressed'),
  version: z.string(),
  timestamp: z.number(),
  semantic: canvasSemanticSummarySchema,
  keyDocuments: z.array(canvasDocumentSchema).default([]),
  keyElements: z.array(canvasDocumentElementSchema).default([]),
  statistics: z.object({
    totalDocuments: z.number(),
    totalElements: z.number(),
    compressedElements: z.number(),
    compressionRatio: z.number()
  })
})

export const canvasVersionedSnapshotSchema = z.object({
  type: z.literal('full'),
  version: z.string(),
  timestamp: z.number(),
  documents: z.array(canvasDocumentSchema)
})

export const canvasSnapshotVariantSchema = z.discriminatedUnion('type', [
  canvasVersionedSnapshotSchema,
  canvasDiffSnapshotSchema,
  canvasCompressedSnapshotSchema
])

export const compressionStrategySchema = z.object({
  method: z.enum(['none', 'diff', 'semantic', 'hybrid']),
  maxKeyElements: z.number().default(24),
  summaryLanguage: z.enum(['zh', 'en']).default('zh'),
  enableDiff: z.boolean().default(true),
  enableSemantic: z.boolean().default(true)
})

export type CanvasDiffChange = z.infer<typeof canvasDiffChangeSchema>
export type CanvasDiffSnapshot = z.infer<typeof canvasDiffSnapshotSchema>
export type CanvasSemanticSummary = z.infer<typeof canvasSemanticSummarySchema>
export type CanvasCompressedSnapshot = z.infer<
  typeof canvasCompressedSnapshotSchema
>
export type CanvasVersionedSnapshot = z.infer<
  typeof canvasVersionedSnapshotSchema
>
export type CanvasSnapshotVariant = z.infer<typeof canvasSnapshotVariantSchema>
export type CompressionStrategy = z.infer<typeof compressionStrategySchema>
