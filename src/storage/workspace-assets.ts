import { z } from 'zod'

export const workspaceAssetTypeSchema = z.enum([
  'image',
  'video',
  'audio',
  'document'
])

export const workspaceAssetOriginKindSchema = z.enum([
  'library_import',
  'canvas_upload',
  'generation_result',
  'agent_generation',
  'model_reference',
  'unknown'
])

export const workspaceAssetStorageSchema = z
  .object({
    key: z.string().min(1).optional(),
    viewPath: z.string().min(1).optional(),
    publicUrl: z.string().min(1).optional()
  })
  .refine((value) => Boolean(value.key || value.viewPath || value.publicUrl), {
    message: 'At least one storage locator is required'
  })

export const workspaceAssetOriginSchema = z
  .object({
    kind: workspaceAssetOriginKindSchema.default('unknown'),
    channel: z.string().min(1).optional(),
    projectId: z.string().nullable().optional(),
    entrypoint: z.string().optional(),
    nodeId: z.string().optional(),
    runId: z.string().optional(),
    taskId: z.string().optional(),
    recordedAt: z.string().optional()
  })
  .catchall(z.unknown())

export const workspaceAssetOriginalMediaSchema = z.object({
  url: z.string().min(1),
  key: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
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
export const WORKSPACE_MODEL_REFERENCE_WIDTH = 1536 as const
export const WORKSPACE_MODEL_REFERENCE_FORMAT = 'webp' as const
export const WORKSPACE_MODEL_REFERENCE_QUALITY = 76 as const

export const workspaceImageDerivativeMetadataSchema = z.object({
  format: z.literal(WORKSPACE_IMAGE_THUMBNAIL_FORMAT),
  original: z.object({
    url: z.string().min(1),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }),
  derivatives: workspaceImageDerivativesSchema,
  modelReference: z.object({
    url: z.string().min(1),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }),
  preview: z.object({
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }),
  thumbnail: z.object({
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  })
})

export const workspaceAssetImageMediaSchema = z.object({
  isAnimated: z.boolean().optional(),
  model: z
    .object({
      url: z.string().min(1),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      format: z.string().optional()
    })
    .optional(),
  preview: z
    .object({
      url: z.string().min(1),
      width: z.number().positive().optional(),
      format: z.string().optional()
    })
    .optional(),
  thumbnail: z
    .object({
      url: z.string().min(1),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      format: z.string().optional()
    })
    .optional(),
  derivatives: workspaceImageDerivativesSchema.optional()
})

export const workspaceAssetVideoMediaSchema = z.object({
  poster: z.object({ url: z.string().min(1) }).optional(),
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
    storage: workspaceAssetStorageSchema.optional(),
    origin: workspaceAssetOriginSchema.optional(),
    media: workspaceAssetMediaMetadataSchema.optional()
  })
  .catchall(z.unknown())

export const workspaceAssetSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  projectId: z.string().nullable(),
  type: workspaceAssetTypeSchema,
  name: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string().nullable(),
  metadata: workspaceAssetMetadataSchema.default({}),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const workspaceAssetMediaSourcesSchema = z.object({
  originalUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  modelUrl: z.string().nullable(),
  motionPreviewUrl: z.string().nullable(),
  derivatives: workspaceImageDerivativesSchema.nullable()
})

export type WorkspaceAssetType = z.infer<typeof workspaceAssetTypeSchema>
export type WorkspaceAssetOriginKind = z.infer<
  typeof workspaceAssetOriginKindSchema
>
export type WorkspaceAssetStorage = z.infer<typeof workspaceAssetStorageSchema>
export type WorkspaceAssetOrigin = z.infer<typeof workspaceAssetOriginSchema>
export type WorkspaceImageDerivatives = z.infer<
  typeof workspaceImageDerivativesSchema
>
export type WorkspaceImageDerivativeMetadata = z.infer<
  typeof workspaceImageDerivativeMetadataSchema
>
export type WorkspaceAssetImageMedia = z.infer<
  typeof workspaceAssetImageMediaSchema
>
export type WorkspaceAssetVideoMedia = z.infer<
  typeof workspaceAssetVideoMediaSchema
>
export type WorkspaceAssetMediaMetadata = z.infer<
  typeof workspaceAssetMediaMetadataSchema
>
export type WorkspaceAssetMetadata = z.infer<
  typeof workspaceAssetMetadataSchema
>
export type WorkspaceAsset = z.infer<typeof workspaceAssetSchema>
export type WorkspaceAssetMediaSources = z.infer<
  typeof workspaceAssetMediaSourcesSchema
>

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringValue(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed || null
}

function numberValue(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function workspaceAssetFromUnknown(row: unknown): WorkspaceAsset {
  const record = recordValue(row) ?? {}
  const metadata = recordValue(record.metadata) ?? {}
  const type =
    record.type === 'video' ||
    record.type === 'audio' ||
    record.type === 'document'
      ? record.type
      : 'image'
  return {
    id: String(record.id ?? ''),
    userId: stringValue(record.userId) ?? undefined,
    projectId: stringValue(record.projectId),
    type,
    name: String(record.name ?? ''),
    mimeType: String(record.mimeType ?? ''),
    size: Number(record.size ?? 0),
    url: stringValue(record.url),
    metadata: metadata as WorkspaceAssetMetadata,
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? '')
  }
}

export function workspaceAssetMediaFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): WorkspaceAssetMediaMetadata | null {
  const media = recordValue(metadata?.media)
  return media ? (media as WorkspaceAssetMediaMetadata) : null
}

export function workspaceAssetStorageFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): WorkspaceAssetStorage | null {
  const storage = recordValue(metadata?.storage)
  if (!storage) return null
  const key = stringValue(storage.key)
  const viewPath = stringValue(storage.viewPath)
  const publicUrl = stringValue(storage.publicUrl)
  if (!key && !viewPath && !publicUrl) return null
  return {
    ...(key ? { key } : {}),
    ...(viewPath ? { viewPath } : {}),
    ...(publicUrl ? { publicUrl } : {})
  }
}

export function workspaceAssetMediaSources(
  asset: Pick<WorkspaceAsset, 'type' | 'url' | 'metadata'>
): WorkspaceAssetMediaSources {
  const media = workspaceAssetMediaFromMetadata(asset.metadata)
  const image = media?.image
  const video = media?.video

  const originalUrl =
    stringValue(media?.original?.url) ?? stringValue(asset.url)
  const thumbnailUrl =
    asset.type === 'image'
      ? stringValue(image?.thumbnail?.url)
      : stringValue(video?.poster?.url)
  const previewUrl =
    asset.type === 'image'
      ? (stringValue(image?.preview?.url) ?? thumbnailUrl)
      : (stringValue(video?.poster?.url) ?? originalUrl)
  const modelUrl =
    asset.type === 'image'
      ? (stringValue(image?.model?.url) ?? originalUrl)
      : originalUrl
  const motionPreviewUrl =
    asset.type === 'video' ? stringValue(video?.preview?.url) : null

  return {
    originalUrl,
    thumbnailUrl,
    previewUrl,
    posterUrl: asset.type === 'video' ? stringValue(video?.poster?.url) : null,
    modelUrl,
    motionPreviewUrl,
    derivatives: image?.derivatives ?? null
  }
}

export function buildWorkspaceAssetOriginalMedia(input: {
  type: 'image' | 'video'
  key: string
  url: string
  mimeType: string
  size: number
  viewPath?: string | null
  publicUrl?: string | null
  width?: number | null
  height?: number | null
}): WorkspaceAssetMediaMetadata {
  return {
    type: input.type,
    original: {
      url: input.url,
      key: input.key,
      mimeType: input.mimeType,
      size: input.size,
      ...(numberValue(input.width) ? { width: numberValue(input.width) } : {}),
      ...(numberValue(input.height)
        ? { height: numberValue(input.height) }
        : {}),
      ...(stringValue(input.viewPath)
        ? { viewPath: stringValue(input.viewPath)! }
        : {}),
      ...(stringValue(input.publicUrl)
        ? { publicUrl: stringValue(input.publicUrl)! }
        : {})
    }
  }
}
