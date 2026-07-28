import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { timestampSchema } from '../shared/timestamp.js'

/**
 * A separate asynchronous processing domain for owned workspace assets.
 *
 * This deliberately does not extend `generation`: model generation keeps its
 * billing/provider lifecycle, while media jobs own deterministic file work
 * such as PSD inspection and layer extraction.
 */

export const MEDIA_PSD_MIME_TYPES = [
  'image/vnd.adobe.photoshop',
  'image/x-photoshop',
  'application/vnd.adobe.photoshop',
  'application/x-photoshop'
] as const

export const mediaPsdMimeTypeSchema = z.enum(MEDIA_PSD_MIME_TYPES)

export const mediaJobOperationSchema = z.enum([
  'psd.inspect',
  'psd.extract-layers'
])

export const mediaJobStatusSchema = z.enum([
  'queued',
  'running',
  'cancelling',
  'succeeded',
  'failed',
  'cancelled'
])

/** Machine-readable stages. The frontend maps these values through i18n. */
export const mediaJobStageSchema = z.enum([
  'queued',
  'reading',
  'parsing',
  'rendering',
  'persisting',
  'completed',
  'failed',
  'cancelled'
])

export const mediaJobInputSchema = z
  .object({
    assetId: z.string().trim().min(1).max(128)
  })
  .strict()

export const mediaJobTargetSchema = z
  .object({
    documentId: z.string().trim().min(1).max(128).optional(),
    elementId: z.string().trim().min(1).max(128).optional(),
    actionId: z.string().trim().min(1).max(128).optional()
  })
  .strict()

export const psdInspectOptionsSchema = z
  .object({
    includeHidden: z.boolean().default(true)
  })
  .strict()

export const psdExtractLayersOptionsSchema = z
  .object({
    layerIds: z
      .array(z.string().trim().min(1).max(256))
      .min(1)
      .max(200)
      .refine((layerIds) => new Set(layerIds).size === layerIds.length, {
        message: 'MEDIA_LAYER_IDS_MUST_BE_UNIQUE'
      }),
    includeHidden: z.boolean().default(false),
    format: z.literal('png').default('png')
  })
  .strict()

const mediaJobRequestBaseSchema = z.object({
  projectId: z.string().trim().min(1).max(128).nullable().optional(),
  target: mediaJobTargetSchema.optional()
})

export const psdInspectMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('psd.inspect'),
    inputs: z.array(mediaJobInputSchema).length(1),
    options: psdInspectOptionsSchema.default({ includeHidden: true })
  })
  .strict()

export const psdExtractLayersMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('psd.extract-layers'),
    inputs: z.array(mediaJobInputSchema).length(1),
    options: psdExtractLayersOptionsSchema
  })
  .strict()

export const createMediaJobRequestSchema = z.discriminatedUnion('operation', [
  psdInspectMediaJobRequestSchema,
  psdExtractLayersMediaJobRequestSchema
])

export const mediaPsdDocumentSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  colorMode: z.string().min(1).optional(),
  depth: z.number().int().positive().optional(),
  channels: z.number().int().positive().optional()
})

export const mediaPsdLayerSchema = z.object({
  sourceLayerId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  zIndex: z.number().int().nonnegative(),
  name: z.string(),
  kind: z.string().min(1),
  bounds: z.object({
    left: z.number().int(),
    top: z.number().int(),
    right: z.number().int(),
    bottom: z.number().int()
  }),
  visible: z.boolean(),
  opacity: z.number().int().min(0).max(255),
  blendMode: z.string().min(1).optional(),
  isGroup: z.boolean(),
  hasMask: z.boolean()
})

export const mediaJobOutputSchema = z.object({
  role: z.literal('layer'),
  assetId: z.string().min(1),
  sourceLayerId: z.string().min(1),
  name: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
})

export const mediaPsdJobResultSchema = z.object({
  kind: z.literal('psd'),
  document: mediaPsdDocumentSchema,
  layers: z.array(mediaPsdLayerSchema).max(1000),
  outputs: z.array(mediaJobOutputSchema).max(200),
  warnings: z.array(z.string().min(1)).max(100).default([])
})

export const mediaJobResultSchema = mediaPsdJobResultSchema

export const mediaJobErrorSchema = z.object({
  code: z.string().min(1),
  retryable: z.boolean().default(false),
  details: z.record(z.string(), z.unknown()).optional()
})

/**
 * Stored/public media job. `options` remains a discriminated operation schema
 * at creation time; this normalized representation keeps persistence reads
 * forward-compatible with additive operation versions.
 */
export const mediaJobSchema = z.object({
  id: z.string().min(1),
  operation: mediaJobOperationSchema,
  operationVersion: z.literal(1),
  userId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  target: mediaJobTargetSchema.optional(),
  inputs: z.array(mediaJobInputSchema).min(1).max(16),
  options: z.union([psdInspectOptionsSchema, psdExtractLayersOptionsSchema]),
  status: mediaJobStatusSchema,
  stage: mediaJobStageSchema,
  progress: z.number().min(0).max(1),
  attempt: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(256),
  requestHash: z.string().min(1),
  retryOf: z.string().min(1).optional(),
  leaseUntil: timestampSchema.nullable().optional(),
  workerId: z.string().min(1).optional(),
  startedAt: timestampSchema.nullable().optional(),
  completedAt: timestampSchema.nullable().optional(),
  cancelRequestedAt: timestampSchema.nullable().optional(),
  result: mediaJobResultSchema.optional(),
  error: mediaJobErrorSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const mediaJobEventSummarySchema = z.object({
  outputCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  primaryAssetId: z.string().min(1).optional()
})

export const mediaOperationDescriptorSchema = z.object({
  operation: mediaJobOperationSchema,
  version: z.literal(1),
  category: z.literal('design'),
  inputMimeTypes: z.array(mediaPsdMimeTypeSchema).min(1),
  minInputs: z.literal(1),
  maxInputs: z.literal(1),
  available: z.boolean(),
  outputRoles: z.array(z.literal('layer'))
})

export const mediaOperationsResponseSchema = z.object({
  operations: z.array(mediaOperationDescriptorSchema)
})

export const mediaJobResponseSchema = z.object({
  job: mediaJobSchema,
  reused: z.boolean().default(false)
})

export const listMediaJobsResponseSchema = z.object({
  jobs: z.array(mediaJobSchema),
  hasMore: z.boolean()
})

export const mediaOperationsApiResponseSchema = apiSuccessResponseSchema(
  mediaOperationsResponseSchema
)
export const mediaJobApiResponseSchema = apiSuccessResponseSchema(
  mediaJobResponseSchema
)
export const listMediaJobsApiResponseSchema = apiSuccessResponseSchema(
  listMediaJobsResponseSchema
)

export type MediaJobOperation = z.infer<typeof mediaJobOperationSchema>
export type MediaJobStatus = z.infer<typeof mediaJobStatusSchema>
export type MediaJobStage = z.infer<typeof mediaJobStageSchema>
export type MediaJobInput = z.infer<typeof mediaJobInputSchema>
export type MediaJobTarget = z.infer<typeof mediaJobTargetSchema>
export type CreateMediaJobRequest = z.infer<typeof createMediaJobRequestSchema>
export type MediaJobResult = z.infer<typeof mediaJobResultSchema>
export type MediaPsdJobResult = z.infer<typeof mediaPsdJobResultSchema>
export type MediaJobError = z.infer<typeof mediaJobErrorSchema>
export type MediaJob = z.infer<typeof mediaJobSchema>
export type MediaJobEventSummary = z.infer<typeof mediaJobEventSummarySchema>
export type MediaOperationDescriptor = z.infer<
  typeof mediaOperationDescriptorSchema
>
