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
  'psd.extract-layers',
  'image.compose',
  'image.transform',
  'image.vectorize',
  'video.poster',
  'video.compose'
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

/** Draw order is the input order, unless an explicit layer list is supplied. */
export const imageComposeOptionsSchema = z
  .object({
    width: z.number().int().positive().max(16_384),
    height: z.number().int().positive().max(16_384),
    background: z.string().trim().max(64).default('transparent'),
    format: z.enum(['png', 'webp']).default('png'),
    layers: z
      .array(
        z
          .object({
            assetId: z.string().trim().min(1).max(128),
            x: z.number().finite().default(0),
            y: z.number().finite().default(0),
            width: z.number().finite().positive().optional(),
            height: z.number().finite().positive().optional(),
            opacity: z.number().min(0).max(1).default(1)
          })
          .strict()
      )
      .min(2)
      .max(16)
      .optional()
  })
  .strict()

export const imageTransformOptionsSchema = z
  .object({
    width: z.number().int().positive().max(16_384).optional(),
    height: z.number().int().positive().max(16_384).optional(),
    fit: z.enum(['contain', 'cover', 'fill']).default('contain'),
    rotate: z.number().finite().min(-360).max(360).default(0),
    format: z.enum(['png', 'jpeg', 'webp']).default('png'),
    quality: z.number().int().min(1).max(100).default(90)
  })
  .strict()
  .refine((value) => value.width !== undefined || value.height !== undefined, {
    message: 'MEDIA_TRANSFORM_DIMENSIONS_REQUIRED'
  })

/**
 * A deterministic palette/vector density budget. The worker emits a genuine
 * SVG made from color runs; it never pretends an embedded raster is vector.
 */
export const imageVectorizeOptionsSchema = z
  .object({
    colors: z.number().int().min(2).max(64).default(16),
    maxWidth: z.number().int().positive().max(4_096).default(1_024),
    simplify: z.number().min(0).max(1).default(0.25),
    background: z.enum(['transparent', 'flatten']).default('transparent')
  })
  .strict()

export const videoPosterOptionsSchema = z
  .object({
    atSeconds: z.number().finite().nonnegative().default(0),
    width: z.number().int().positive().max(4_096).default(1_280),
    format: z.enum(['jpeg', 'png', 'webp']).default('jpeg'),
    quality: z.number().int().min(1).max(100).default(88)
  })
  .strict()

/**
 * Deterministic final-video assembly. Generative continuity belongs upstream;
 * this operation only normalizes clips and joins them in the declared order.
 */
export const videoComposeOptionsSchema = z
  .object({
    transition: z.enum(['cut', 'crossfade']).default('crossfade'),
    transitionDurationSeconds: z.number().min(0.1).max(1).default(0.25),
    resolution: z.enum(['720p', '1080p']).default('720p'),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30)]).default(24),
    audio: z.enum(['preserve', 'mute']).default('preserve')
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

export const imageComposeMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('image.compose'),
    inputs: z.array(mediaJobInputSchema).min(2).max(16),
    options: imageComposeOptionsSchema
  })
  .strict()
  .superRefine((request, context) => {
    const ids = request.inputs.map((input) => input.assetId)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inputs'],
        message: 'MEDIA_INPUT_ASSET_IDS_MUST_BE_UNIQUE'
      })
    }
    if (request.options.layers) {
      const inputIds = new Set(ids)
      for (const [index, layer] of request.options.layers.entries()) {
        if (!inputIds.has(layer.assetId)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['options', 'layers', index, 'assetId'],
            message: 'MEDIA_COMPOSE_LAYER_MUST_REFERENCE_INPUT'
          })
        }
      }
    }
  })

export const imageTransformMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('image.transform'),
    inputs: z.array(mediaJobInputSchema).length(1),
    options: imageTransformOptionsSchema
  })
  .strict()

export const imageVectorizeMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('image.vectorize'),
    inputs: z.array(mediaJobInputSchema).length(1),
    options: imageVectorizeOptionsSchema
  })
  .strict()

export const videoPosterMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('video.poster'),
    inputs: z.array(mediaJobInputSchema).length(1),
    options: videoPosterOptionsSchema
  })
  .strict()

export const videoComposeMediaJobRequestSchema = mediaJobRequestBaseSchema
  .extend({
    operation: z.literal('video.compose'),
    /** Input order is timeline order. */
    inputs: z.array(mediaJobInputSchema).min(2).max(16),
    options: videoComposeOptionsSchema.default({
      transition: 'crossfade',
      transitionDurationSeconds: 0.25,
      resolution: '720p',
      fps: 24,
      audio: 'preserve'
    })
  })
  .strict()
  .refine(
    (request) =>
      new Set(request.inputs.map((input) => input.assetId)).size ===
      request.inputs.length,
    {
      path: ['inputs'],
      message: 'MEDIA_INPUT_ASSET_IDS_MUST_BE_UNIQUE'
    }
  )

export const createMediaJobRequestSchema = z.discriminatedUnion('operation', [
  psdInspectMediaJobRequestSchema,
  psdExtractLayersMediaJobRequestSchema,
  imageComposeMediaJobRequestSchema,
  imageTransformMediaJobRequestSchema,
  imageVectorizeMediaJobRequestSchema,
  videoPosterMediaJobRequestSchema,
  videoComposeMediaJobRequestSchema
])

export const mediaPsdDocumentSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  colorMode: z.string().min(1).optional(),
  depth: z.number().int().positive().optional(),
  channels: z.number().int().positive().optional()
})

/**
 * Representative type-layer styling.
 *
 * A PSD text layer can carry many style runs; the worker reports the first one
 * plus the full string, which is enough to recreate editable text without
 * pretending to model Photoshop's full typography engine.
 */
export const mediaPsdLayerTextSchema = z.object({
  content: z.string(),
  fontName: z.string().min(1).optional(),
  fontSize: z.number().finite().positive().optional(),
  /** `#rrggbb`, derived from the first style run's fill color. */
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/)
    .optional()
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
  hasMask: z.boolean(),
  text: mediaPsdLayerTextSchema.optional()
})

export const mediaJobOutputSchema = z.object({
  role: z.enum(['layer', 'image', 'vector', 'poster', 'video']),
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

export const mediaRasterJobResultSchema = z.object({
  kind: z.literal('raster'),
  outputs: z.array(mediaJobOutputSchema).length(1),
  warnings: z.array(z.string().min(1)).max(100).default([])
})

export const mediaVectorJobResultSchema = z.object({
  kind: z.literal('vector'),
  outputs: z.array(mediaJobOutputSchema).length(1),
  warnings: z.array(z.string().min(1)).max(100).default([])
})

export const mediaVideoJobResultSchema = z.object({
  kind: z.literal('video'),
  outputs: z.array(mediaJobOutputSchema).length(1),
  warnings: z.array(z.string().min(1)).max(100).default([])
})

export const mediaJobResultSchema = z.discriminatedUnion('kind', [
  mediaPsdJobResultSchema,
  mediaRasterJobResultSchema,
  mediaVectorJobResultSchema,
  mediaVideoJobResultSchema
])

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
  workspaceId: z.string().min(1),
  createdByUserId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  target: mediaJobTargetSchema.optional(),
  inputs: z.array(mediaJobInputSchema).min(1).max(16),
  options: z.union([
    psdInspectOptionsSchema,
    psdExtractLayersOptionsSchema,
    imageComposeOptionsSchema,
    imageTransformOptionsSchema,
    imageVectorizeOptionsSchema,
    videoPosterOptionsSchema,
    videoComposeOptionsSchema
  ]),
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
  category: z.enum(['design', 'image', 'video']),
  inputMimeTypes: z.array(z.string().min(1)).min(1),
  minInputs: z.number().int().positive(),
  maxInputs: z.number().int().positive(),
  available: z.boolean(),
  outputRoles: z.array(z.enum(['layer', 'image', 'vector', 'poster', 'video']))
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
export type MediaRasterJobResult = z.infer<typeof mediaRasterJobResultSchema>
export type MediaVectorJobResult = z.infer<typeof mediaVectorJobResultSchema>
export type MediaVideoJobResult = z.infer<typeof mediaVideoJobResultSchema>
export type VideoComposeOptions = z.infer<typeof videoComposeOptionsSchema>
export type MediaJobError = z.infer<typeof mediaJobErrorSchema>
export type MediaJob = z.infer<typeof mediaJobSchema>
export type MediaJobEventSummary = z.infer<typeof mediaJobEventSummarySchema>
export type MediaOperationDescriptor = z.infer<
  typeof mediaOperationDescriptorSchema
>
