import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { canvasResourceStorageSchema } from '../canvas/resources/types.js'
import { MEDIA_PSD_MIME_TYPES } from '../media/index.js'
import { timestampSchema } from '../shared/timestamp.js'

export const workspaceAssetTypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'document',
  'font',
  'vector',
  'design'
])

export const workspaceAssetStatusSchema = z.enum([
  'uploading',
  'processing',
  'ready',
  'failed',
  'archived'
])

export const workspaceAssetSourceKindSchema = z.enum([
  'upload',
  'generation',
  'media_job',
  'import',
  'agent'
])

export const workspaceAssetOriginKindSchema = z.enum([
  'library_import',
  'canvas_upload',
  'generation_result',
  'agent_generation',
  'model_reference',
  'media_processing',
  'unknown'
])

export const workspaceAssetOriginSchema = z
  .object({
    kind: workspaceAssetOriginKindSchema.default('unknown'),
    channel: z.string().min(1).optional(),
    projectId: z.string().nullable().optional(),
    entrypoint: z.string().optional(),
    documentId: z.string().optional(),
    elementId: z.string().optional(),
    actionId: z.string().optional(),
    runId: z.string().optional(),
    taskId: z.string().optional(),
    recordedAt: z.string().optional()
  })
  .catchall(z.unknown())

/** Immutable provenance for a logical workspace asset. */
export const workspaceAssetSourceSchema = z
  .object({
    kind: workspaceAssetSourceKindSchema,
    generationTaskId: z.string().min(1).optional(),
    mediaJobId: z.string().min(1).optional(),
    sourceAssetId: z.string().min(1).optional()
  })
  .strict()
  .superRefine((source, context) => {
    // `generationTaskId` is intentionally optional: assets produced before the
    // task id was persisted alongside the result carry a truthful
    // `kind: 'generation'` with no recoverable task. Downgrading them to
    // 'import' would misstate provenance, so the link stays best-effort.
    if (source.kind === 'media_job' && !source.mediaJobId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaJobId'],
        message: 'ASSET_MEDIA_JOB_REQUIRED'
      })
    }
  })

export const workspaceAssetOriginalMediaSchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  viewPath: z.string().min(1).optional(),
  publicUrl: z.string().min(1).optional()
})

export const workspaceImageDerivativesSchema = z.object({
  original: z.string().min(1),
  preview: z.string().min(1),
  thumb: z.string().min(1),
  thumbnails: z.object({
    w128: z.string().min(1),
    w320: z.string().min(1),
    w640: z.string().min(1),
    w1280: z.string().min(1),
    w2048: z.string().min(1)
  })
})

export const WORKSPACE_IMAGE_THUMBNAIL_FORMAT = 'avif' as const
export const WORKSPACE_MODEL_REFERENCE_WIDTH = 768 as const
export const WORKSPACE_MODEL_REFERENCE_FORMAT = 'webp' as const
export const WORKSPACE_MODEL_REFERENCE_QUALITY = 76 as const

export const workspaceImageDerivativeMetadataSchema = z.object({
  format: z.literal(WORKSPACE_IMAGE_THUMBNAIL_FORMAT),
  original: z.object({
    url: z.string().min(1),
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional()
  }),
  derivatives: workspaceImageDerivativesSchema,
  modelReference: z.object({
    url: z.string().min(1),
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional()
  }),
  preview: z.object({
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional()
  }),
  thumbnail: z.object({
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional()
  })
})

export const workspaceAssetImageMediaSchema = z.object({
  isAnimated: z.boolean().optional(),
  model: z
    .object({
      url: z.string().min(1),
      width: z.number().nonnegative().optional(),
      height: z.number().nonnegative().optional(),
      format: z.string().optional()
    })
    .optional(),
  preview: z
    .object({
      url: z.string().min(1),
      width: z.number().nonnegative().optional(),
      format: z.string().optional()
    })
    .optional(),
  thumbnail: z
    .object({
      url: z.string().min(1),
      width: z.number().nonnegative().optional(),
      height: z.number().nonnegative().optional(),
      format: z.string().optional()
    })
    .optional(),
  derivatives: workspaceImageDerivativesSchema.optional()
})

export const workspaceAssetVideoMediaSchema = z.object({
  poster: z
    .object({
      url: z.string().min(1),
      key: z.string().min(1).optional(),
      mimeType: z.string().min(1).optional(),
      size: z.number().int().nonnegative().optional()
    })
    .optional(),
  preview: z.object({ url: z.string().min(1) }).optional()
})

export const workspaceAssetMediaMetadataSchema = z.object({
  type: z.enum(['image', 'video']),
  original: workspaceAssetOriginalMediaSchema,
  image: workspaceAssetImageMediaSchema.optional(),
  video: workspaceAssetVideoMediaSchema.optional()
})

export const workspaceAssetMetadataSchema = z
  .object({
    media: workspaceAssetMediaMetadataSchema.optional(),
    folderId: z.string().min(1).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).default([])
  })
  .strict()

export const WORKSPACE_ASSET_SEARCH_MAX_TOKENS = 64 as const
export const WORKSPACE_ASSET_SEARCH_MAX_TOKEN_LENGTH = 48 as const
export const WORKSPACE_ASSET_SEARCH_MIN_QUERY_LENGTH = 1 as const

export const workspaceAssetSearchSchema = z
  .object({
    tokens: z.array(z.string().min(1)).max(WORKSPACE_ASSET_SEARCH_MAX_TOKENS)
  })
  .strict()

/**
 * Every status except `archived`, listed explicitly.
 *
 * The default listing wants "not archived", but expressing that as `$ne` makes
 * it a range predicate, which cannot feed an index-ordered sort — Mongo falls
 * back to a blocking in-memory SORT of the whole match. An `$in` over equality
 * values keeps the sort index-provided (SORT_MERGE).
 */
export const WORKSPACE_ASSET_ACTIVE_STATUSES = [
  'uploading',
  'processing',
  'ready',
  'failed'
] as const

export const workspaceAssetSchema = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    createdByUserId: z.string().min(1),
    type: workspaceAssetTypeSchema,
    status: workspaceAssetStatusSchema,
    name: z.string().trim().min(1).max(512),
    mimeType: z.string().min(1),
    size: z.number().int().nonnegative(),
    /** Presentation URL resolved only after workspace authorization. */
    url: z.string().nullable(),
    storage: canvasResourceStorageSchema,
    source: workspaceAssetSourceSchema,
    /** Context at creation time; it does not make the project own the asset. */
    origin: workspaceAssetOriginSchema.default({ kind: 'unknown' }),
    metadata: workspaceAssetMetadataSchema.default({
      folderId: null,
      tags: []
    }),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()

export const workspaceAssetDocumentSchema = workspaceAssetSchema.extend({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  /**
   * Persistence-only search projection. Derived from `name`/`mimeType` on every
   * write, never client-supplied and never returned by the API — the store
   * strips it before parsing through `workspaceAssetSchema`, which is strict.
   */
  search: workspaceAssetSearchSchema.optional()
})

export const WORKSPACE_ASSET_FOLDER_MAX_DEPTH = 8 as const
export const WORKSPACE_ASSET_FOLDER_PATH_SEPARATOR = '/' as const

/**
 * Materialized ancestor path, e.g. `/root-id/child-id/`. Subtree reads are a
 * single indexed prefix range instead of a recursive walk, which is what keeps
 * folder listing flat-cost as the tree grows.
 */
export const workspaceAssetFolderSchema = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    createdByUserId: z.string().min(1),
    name: z.string().trim().min(1).max(128),
    parentId: z.string().min(1).nullable(),
    path: z.string().min(1),
    depth: z.number().int().min(0).max(WORKSPACE_ASSET_FOLDER_MAX_DEPTH),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .strict()

export const workspaceAssetFolderDocumentSchema =
  workspaceAssetFolderSchema.extend({
    createdAt: timestampSchema,
    updatedAt: timestampSchema
  })

export const workspaceAssetFolderCreateRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(128),
    parentId: z.string().min(1).nullable().optional()
  })
  .strict()

export const workspaceAssetFolderPatchRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(128).optional(),
    /** `null` moves the folder to the workspace root. */
    parentId: z.string().min(1).nullable().optional()
  })
  .strict()
  .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: 'FOLDER_PATCH_EMPTY'
  })

export const workspaceAssetFolderDeleteQuerySchema = z
  .object({
    /**
     * Without this the request fails with 409 when the folder still holds
     * subfolders or assets. With it, the subtree is removed and every asset
     * beneath it is reparented to this folder's parent — never deleted.
     */
    cascade: z.boolean().optional()
  })
  .strict()

export const workspaceAssetFolderListResponseSchema = z.object({
  folders: z.array(workspaceAssetFolderSchema)
})

export const workspaceAssetFolderResponseSchema = z.object({
  folder: workspaceAssetFolderSchema
})

export const workspaceAssetFolderDeleteResponseSchema = z.object({
  success: z.literal(true),
  deletedFolders: z.number().int().nonnegative(),
  reparentedAssets: z.number().int().nonnegative()
})

export const workspaceAssetFolderListApiResponseSchema =
  apiSuccessResponseSchema(workspaceAssetFolderListResponseSchema)

export const workspaceAssetFolderApiResponseSchema = apiSuccessResponseSchema(
  workspaceAssetFolderResponseSchema
)

export const workspaceAssetFolderDeleteApiResponseSchema =
  apiSuccessResponseSchema(workspaceAssetFolderDeleteResponseSchema)

export const workspaceAssetReferenceTypeSchema = z.enum([
  'canvas_raster',
  'canvas_mask',
  'brand_cover',
  'brand_logo',
  'brand_imagery',
  'brand_font',
  'media_input',
  'media_output'
])

export const workspaceAssetReferenceTargetSchema = z.enum([
  'project_canvas',
  'brand_kit_version',
  'media_job'
])

/** Queryable projection of immutable asset references. */
export const workspaceAssetReferenceSchema = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    assetId: z.string().min(1),
    targetType: workspaceAssetReferenceTargetSchema,
    targetId: z.string().min(1),
    referenceType: workspaceAssetReferenceTypeSchema,
    createdAt: timestampSchema,
    updatedAt: timestampSchema
  })
  .strict()

export const workspaceAssetMediaSourcesSchema = z.object({
  originalUrl: z.string().nullable(),
  displayUrl: z.string().nullable(),
  downloadUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  motionUrl: z.string().nullable(),
  isAnimated: z.boolean(),
  derivatives: workspaceImageDerivativesSchema.nullable()
})

export const WORKSPACE_UPLOAD_MAX_PARTS = 10_000 as const

export const workspaceUploadModeSchema = z.enum(['auto', 'single', 'multipart'])

export const workspaceUploadKindSchema = z.enum(['objects'])

export const workspaceUploadAssetMetadataSchema = z
  .object({
    assetId: z.string().min(8).max(128).optional(),
    name: z.string().max(512).optional(),
    folderId: z.string().min(1).max(128).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).optional()
  })
  .strict()

export const workspaceUploadCreateRequestSchema = z
  .object({
    filename: z.string().max(512).optional(),
    contentType: z.string().max(256).optional(),
    size: z.number().int().nonnegative(),
    kind: workspaceUploadKindSchema.optional(),
    mode: workspaceUploadModeSchema.optional(),
    multipartThresholdBytes: z.number().int().positive().optional()
  })
  .strict()

export const workspaceUploadSessionSchema = z.object({
  key: z.string().min(1),
  mode: z.enum(['single', 'multipart']),
  uploadId: z.string().min(1).optional(),
  uploadUrl: z.string().min(1).optional(),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  partSize: z.number().int().positive().optional(),
  partCount: z.number().int().positive().optional(),
  expiresInSeconds: z.number().int().positive().optional(),
  viewPath: z.string().min(1),
  publicUrl: z.string().min(1).optional()
})

export const workspaceUploadPartRequestSchema = z
  .object({
    key: z.string().min(1).max(2048),
    uploadId: z.string().min(1).max(2048),
    partNumber: z.number().int().min(1).max(WORKSPACE_UPLOAD_MAX_PARTS)
  })
  .strict()

export const workspaceUploadPartBodySchema =
  workspaceUploadPartRequestSchema.pick({
    key: true
  })

export const workspaceUploadPartResponseSchema = z.object({
  uploadUrl: z.string().min(1)
})

export const workspaceUploadMultipartPartSchema = z.object({
  partNumber: z.number().int().min(1).max(WORKSPACE_UPLOAD_MAX_PARTS),
  etag: z.string().min(1).max(512)
})

export const workspaceUploadMultipartCompleteRequestSchema = z
  .object({
    key: z.string().min(1).max(2048),
    uploadId: z.string().min(1).max(2048),
    parts: z
      .array(workspaceUploadMultipartPartSchema)
      .min(1)
      .max(WORKSPACE_UPLOAD_MAX_PARTS)
  })
  .strict()

export const workspaceUploadAbortRequestSchema =
  workspaceUploadMultipartCompleteRequestSchema.pick({
    key: true,
    uploadId: true
  })

export const workspaceUploadAbortBodySchema =
  workspaceUploadAbortRequestSchema.pick({ key: true })

function isSupportedWorkspaceUploadMimeType(value: string): boolean {
  const normalized = value.split(';')[0]?.trim().toLowerCase() ?? ''
  return (
    normalized.startsWith('image/') ||
    normalized.startsWith('video/') ||
    normalized.startsWith('audio/') ||
    MEDIA_PSD_MIME_TYPES.includes(
      normalized as (typeof MEDIA_PSD_MIME_TYPES)[number]
    )
  )
}

export const workspaceUploadCompleteRequestSchema = z
  .object({
    key: z.string().min(1).max(2048),
    uploadId: z.string().min(1).max(2048).optional(),
    parts: z.array(workspaceUploadMultipartPartSchema).optional(),
    mimeType: z
      .string()
      .min(1)
      .max(256)
      .refine(isSupportedWorkspaceUploadMimeType, {
        message: 'Only image, video, and audio assets are supported'
      }),
    size: z.number().int().nonnegative(),
    publicUrl: z.string().url().max(2048).optional(),
    viewPath: z.string().min(1).max(2048).optional(),
    asset: workspaceUploadAssetMetadataSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (Boolean(value.uploadId) !== Boolean(value.parts)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'uploadId and parts must be provided together'
      })
    }
  })

export const workspaceUploadCompleteResultSchema = z.object({
  assetId: z.string().min(1),
  url: z.string().min(1),
  asset: workspaceAssetSchema,
  persisted: z.boolean().default(true),
  created: z.boolean().default(false)
})

export const workspaceAssetPatchRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(512).optional(),
    folderId: z.string().min(1).max(128).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).optional()
  })
  .strict()

export const WORKSPACE_ASSET_LIST_DEFAULT_LIMIT = 48 as const
export const WORKSPACE_ASSET_LIST_MAX_LIMIT = 200 as const

export const workspaceAssetSortSchema = z.enum([
  'updatedAt',
  'createdAt',
  'name'
])

export const workspaceAssetOrderSchema = z.enum(['asc', 'desc'])

/**
 * Keyset pagination. The cursor encodes the sort key value plus the `_id`
 * tiebreaker of the last row, so paging cost stays flat instead of growing
 * with offset — and rows cannot be skipped or repeated when the underlying
 * set shifts mid-scroll, which offset paging cannot avoid.
 *
 * A cursor is only meaningful for the exact filter+sort it was issued for; the
 * server rejects one whose sort or order does not match the request.
 */
export const workspaceAssetCursorSchema = z
  .object({
    sort: workspaceAssetSortSchema,
    order: workspaceAssetOrderSchema,
    /** Sort key value of the last row: ISO string, or name. */
    value: z.string(),
    id: z.string().min(1)
  })
  .strict()

export const workspaceAssetListQuerySchema = z
  .object({
    query: z.string().trim().max(128).optional(),
    type: workspaceAssetTypeSchema.optional(),
    status: workspaceAssetStatusSchema.optional(),
    folderId: z.string().min(1).max(128).nullable().optional(),
    /** Include every descendant of `folderId`, not just direct children. */
    recursive: z.boolean().optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(WORKSPACE_ASSET_LIST_MAX_LIMIT)
      .default(WORKSPACE_ASSET_LIST_DEFAULT_LIMIT),
    sort: workspaceAssetSortSchema.default('updatedAt'),
    order: workspaceAssetOrderSchema.default('desc'),
    cursor: z.string().min(1).optional()
  })
  .strict()

export const listWorkspaceAssetsResponseSchema = z.object({
  assets: z.array(workspaceAssetSchema),
  hasMore: z.boolean(),
  /** Opaque; pass back verbatim as `cursor`. Null when the page is last. */
  nextCursor: z.string().nullable()
})

export const workspaceAssetResponseSchema = z.object({
  asset: workspaceAssetSchema
})

export const workspaceAssetDeleteResponseSchema = z.object({
  success: z.literal(true)
})

export const workspaceUploadCreateApiResponseSchema = apiSuccessResponseSchema(
  z.object({ upload: workspaceUploadSessionSchema })
)

export const workspaceUploadPartApiResponseSchema = apiSuccessResponseSchema(
  workspaceUploadPartResponseSchema
)

export const workspaceUploadAbortApiResponseSchema = apiSuccessResponseSchema(
  z.object({ success: z.literal(true) })
)

export const workspaceUploadCompleteApiResponseSchema =
  apiSuccessResponseSchema(workspaceUploadCompleteResultSchema)

/**
 * Import an external http(s) media URL into a workspace asset.
 *
 * Unlike the presigned upload flow (which requires a local file), this lets the
 * server download a remote reference image/video — e.g. one surfaced by media
 * search — and persist it as an owned asset so it can be placed on the canvas
 * with a durable, deduped URL instead of a fragile external link.
 */
export const workspaceAssetImportUrlRequestSchema = z
  .object({
    url: z.string().url().max(4096),
    mediaKind: z.enum(['image', 'video']),
    name: z.string().max(512).optional(),
    folderId: z.string().min(1).max(128).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).optional()
  })
  .strict()

export const workspaceAssetImportUrlResultSchema = z.object({
  assetId: z.string().min(1),
  url: z.string().min(1),
  mediaKind: z.enum(['image', 'video']),
  asset: workspaceAssetSchema
})

export const listWorkspaceAssetsApiResponseSchema = apiSuccessResponseSchema(
  listWorkspaceAssetsResponseSchema
)

export const workspaceAssetApiResponseSchema = apiSuccessResponseSchema(
  workspaceAssetResponseSchema
)

export const workspaceAssetDeleteApiResponseSchema = apiSuccessResponseSchema(
  workspaceAssetDeleteResponseSchema
)

export const workspaceAssetImportUrlApiResponseSchema =
  apiSuccessResponseSchema(workspaceAssetImportUrlResultSchema)

export type WorkspaceAssetType = z.infer<typeof workspaceAssetTypeSchema>
export type WorkspaceAssetStatus = z.infer<typeof workspaceAssetStatusSchema>
export type WorkspaceAssetSourceKind = z.infer<
  typeof workspaceAssetSourceKindSchema
>
export type WorkspaceAssetOriginKind = z.infer<
  typeof workspaceAssetOriginKindSchema
>
export type WorkspaceAssetOrigin = z.infer<typeof workspaceAssetOriginSchema>
export type WorkspaceAssetSource = z.infer<typeof workspaceAssetSourceSchema>
export type WorkspaceImageDerivatives = z.infer<
  typeof workspaceImageDerivativesSchema
>
export type WorkspaceImageDerivativeMetadata = z.infer<
  typeof workspaceImageDerivativeMetadataSchema
>
export type WorkspaceAssetMediaMetadata = z.infer<
  typeof workspaceAssetMediaMetadataSchema
>
export type WorkspaceAssetMetadata = z.infer<
  typeof workspaceAssetMetadataSchema
>
export type WorkspaceAsset = z.infer<typeof workspaceAssetSchema>
export type WorkspaceAssetDocument = z.infer<
  typeof workspaceAssetDocumentSchema
>
export type WorkspaceAssetReferenceType = z.infer<
  typeof workspaceAssetReferenceTypeSchema
>
export type WorkspaceAssetReferenceTarget = z.infer<
  typeof workspaceAssetReferenceTargetSchema
>
export type WorkspaceAssetReference = z.infer<
  typeof workspaceAssetReferenceSchema
>
export type WorkspaceAssetImportUrlRequest = z.infer<
  typeof workspaceAssetImportUrlRequestSchema
>
export type WorkspaceAssetImportUrlResult = z.infer<
  typeof workspaceAssetImportUrlResultSchema
>
export type WorkspaceAssetMediaSources = z.infer<
  typeof workspaceAssetMediaSourcesSchema
>
export type WorkspaceUploadCreateRequest = z.infer<
  typeof workspaceUploadCreateRequestSchema
>
export type WorkspaceUploadSession = z.infer<
  typeof workspaceUploadSessionSchema
>
export type WorkspaceUploadPartRequest = z.infer<
  typeof workspaceUploadPartRequestSchema
>
export type WorkspaceUploadPartResponse = z.infer<
  typeof workspaceUploadPartResponseSchema
>
export type WorkspaceUploadAbortRequest = z.infer<
  typeof workspaceUploadAbortRequestSchema
>
export type WorkspaceUploadCompleteRequest = z.infer<
  typeof workspaceUploadCompleteRequestSchema
>
export type WorkspaceUploadCompleteResult = z.infer<
  typeof workspaceUploadCompleteResultSchema
>
export type WorkspaceAssetPatchRequest = z.infer<
  typeof workspaceAssetPatchRequestSchema
>
export type WorkspaceAssetSearch = z.infer<typeof workspaceAssetSearchSchema>
export type WorkspaceAssetSort = z.infer<typeof workspaceAssetSortSchema>
export type WorkspaceAssetOrder = z.infer<typeof workspaceAssetOrderSchema>
export type WorkspaceAssetCursor = z.infer<typeof workspaceAssetCursorSchema>
export type WorkspaceAssetListQuery = z.infer<
  typeof workspaceAssetListQuerySchema
>
export type ListWorkspaceAssetsResponse = z.infer<
  typeof listWorkspaceAssetsResponseSchema
>
export type WorkspaceAssetFolder = z.infer<typeof workspaceAssetFolderSchema>
export type WorkspaceAssetFolderDocument = z.infer<
  typeof workspaceAssetFolderDocumentSchema
>
export type WorkspaceAssetFolderCreateRequest = z.infer<
  typeof workspaceAssetFolderCreateRequestSchema
>
export type WorkspaceAssetFolderPatchRequest = z.infer<
  typeof workspaceAssetFolderPatchRequestSchema
>

/** Ancestor ids of a folder, root first, excluding the folder itself. */
export function workspaceAssetFolderAncestorIds(path: string): string[] {
  return path.split(WORKSPACE_ASSET_FOLDER_PATH_SEPARATOR).filter(Boolean)
}

/** Materialized path a child of `parent` must carry. */
export function workspaceAssetFolderChildPath(
  parent: Pick<WorkspaceAssetFolder, 'id' | 'path'> | null
): string {
  const separator = WORKSPACE_ASSET_FOLDER_PATH_SEPARATOR
  if (!parent) return separator
  return `${parent.path}${parent.id}${separator}`
}

/** Escape a value used inside a RegExp so user input cannot alter the pattern. */
export function escapeRegExpLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
