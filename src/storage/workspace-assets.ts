import { z } from 'zod'
import type { CanvasMediaEntry } from '../canvas/media.js'
import type {
  CanvasResource,
  CanvasResourceStorage,
  CanvasResourceType
} from '../canvas/resources.js'

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
export const WORKSPACE_MODEL_REFERENCE_WIDTH = 768 as const
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
  displayUrl: z.string().nullable(),
  downloadUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  motionUrl: z.string().nullable(),
  isAnimated: z.boolean(),
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

export type WorkspaceAssetMediaContext =
  | 'canvas'
  | 'preview'
  | 'thumbnail'
  | 'download'
  | 'responsive'

export type WorkspaceAssetLike = {
  id?: unknown
  type?: unknown
  name?: unknown
  mimeType?: unknown
  size?: unknown
  url?: unknown
  metadata?: Record<string, unknown> | null
}

export type WorkspaceMediaResourceLike = {
  type?: unknown
  url?: unknown
  metadata?: Record<string, unknown> | null
}

export type CanvasMediaResourceKind = Extract<
  CanvasResource['type'],
  'image' | 'video'
>

export type CreateCanvasAssetResourceReferenceInput = {
  assetId?: string | null
  type: CanvasMediaResourceKind
  createdBy: string
  createdAt?: number
}

export type CanvasMediaOutputResource = {
  resource: CanvasResource
  url: string
  assetId?: string | null
  width?: number | null
  height?: number | null
  mediaMetadata?: WorkspaceAssetMediaMetadata | null
}

export type CanvasImageOutputResource = CanvasMediaOutputResource
export type CanvasVideoOutputResource = CanvasMediaOutputResource
export type ReadCanvasMediaOutputResourceInput = {
  assets?:
    | readonly WorkspaceAssetLike[]
    | ReadonlyMap<string, WorkspaceAssetLike>
  context?: WorkspaceAssetMediaContext
}

export type CanvasMediaFromWorkspaceAsset = Pick<
  CanvasMediaEntry,
  'url' | 'type' | 'assetId' | 'width' | 'height' | 'storage'
> & {
  mediaMetadata?: WorkspaceAssetMediaMetadata | null
}

export const CANVAS_ASSET_RESOURCE_ARRAY_KEYS = [
  'inputResources',
  'outputResources',
  'manualResources',
  'cellResources'
] as const

const CANVAS_RESOURCE_TYPES = ['image', 'video', 'audio', 'text'] as const

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

function finiteNumberValue(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

function canvasResourceTypeValue(value: unknown): CanvasResourceType {
  return CANVAS_RESOURCE_TYPES.includes(value as CanvasResourceType)
    ? (value as CanvasResourceType)
    : 'image'
}

function mediaAssetTypeValue(value: unknown): 'image' | 'video' | null {
  if (value === 'image' || value === 'video') return value
  return null
}

function assetMetadataValue(
  asset: WorkspaceAssetLike
): Record<string, unknown> {
  return recordValue(asset.metadata) ?? {}
}

function assetSizeValue(asset: WorkspaceAssetLike): number | undefined {
  const n = finiteNumberValue(asset.size)
  return typeof n === 'number' && n >= 0 ? n : undefined
}

function positiveNumberValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function canvasResourceMetadataNumber(
  resource: CanvasResource,
  key: 'width' | 'height' | 'duration'
): number | null {
  return positiveNumberValue(recordValue(resource.metadata)?.[key])
}

function mediaResourceType(
  resource: WorkspaceMediaResourceLike | null | undefined
): 'image' | 'video' | null {
  return mediaAssetTypeValue(resource?.type)
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

export function workspaceAssetLookupFromAssets<T extends WorkspaceAssetLike>(
  assets: readonly T[] | null | undefined
): Map<string, T> {
  const lookup = new Map<string, T>()
  for (const asset of assets ?? []) {
    const id = stringValue(asset.id)
    if (id) lookup.set(id, asset)
  }
  return lookup
}

export function workspaceAssetReferenceId(value: unknown): string | null {
  if (typeof value === 'string') return stringValue(value)
  const record = recordValue(value)
  if (!record) return null
  return stringValue(record.assetId) ?? stringValue(record.id)
}

export function workspaceAssetForReference<T extends WorkspaceAssetLike>(
  reference: unknown,
  lookup: ReadonlyMap<string, T>
): T | undefined {
  const id = workspaceAssetReferenceId(reference)
  return id ? lookup.get(id) : undefined
}

export function workspaceAssetMediaType(
  asset: WorkspaceAssetLike | null | undefined,
  fallback?: unknown
): 'image' | 'video' | null {
  return mediaAssetTypeValue(asset?.type) ?? mediaAssetTypeValue(fallback)
}

export function workspaceAssetDimension(
  asset: WorkspaceAssetLike,
  key: 'width' | 'height'
): number | undefined {
  const media = workspaceAssetMediaFromMetadata(assetMetadataValue(asset))
  return (
    numberValue(media?.original?.[key]) ??
    numberValue(assetMetadataValue(asset)[key])
  )
}

export function workspaceAssetRuntimeUrl(
  asset: WorkspaceAssetLike,
  context: WorkspaceAssetMediaContext = 'canvas',
  containerWidth?: number
): string | null {
  const metadata = assetMetadataValue(asset)
  const storage = workspaceAssetStorageFromMetadata(metadata)
  const storageUrl =
    stringValue(storage?.publicUrl) ?? stringValue(storage?.viewPath)
  const type = workspaceAssetMediaType(asset)
  if (type !== 'image' && type !== 'video') {
    return stringValue(asset.url) ?? storageUrl
  }
  return (
    workspaceAssetMediaForContext(
      {
        type,
        url: stringValue(asset.url),
        metadata
      },
      context,
      containerWidth
    ) ??
    stringValue(workspaceAssetMediaFromMetadata(metadata)?.original.url) ??
    stringValue(asset.url) ??
    storageUrl
  )
}

export function workspaceAssetCanvasStorage(
  asset: WorkspaceAssetLike
): CanvasResourceStorage | undefined {
  return (
    workspaceAssetStorageFromMetadata(assetMetadataValue(asset)) ?? undefined
  )
}

export function workspaceAssetToCanvasResource(
  asset: WorkspaceAssetLike,
  input: {
    id?: string | null
    createdBy: string
    createdAt?: number
    context?: WorkspaceAssetMediaContext
  }
): CanvasResource | null {
  const type = workspaceAssetMediaType(asset)
  const assetId = stringValue(asset.id)
  if (!assetId || !type) return null
  const url = workspaceAssetRuntimeUrl(asset, input.context ?? 'canvas')
  if (!url) return null
  const media = workspaceAssetMediaFromMetadata(assetMetadataValue(asset))
  const metadata = {
    ...(workspaceAssetDimension(asset, 'width')
      ? { width: workspaceAssetDimension(asset, 'width') }
      : {}),
    ...(workspaceAssetDimension(asset, 'height')
      ? { height: workspaceAssetDimension(asset, 'height') }
      : {}),
    ...(media ? { media } : {})
  }
  const storage = workspaceAssetCanvasStorage(asset)
  const size = assetSizeValue(asset)
  return {
    id: stringValue(input.id) ?? assetId,
    type,
    url,
    assetId,
    ...(stringValue(asset.name) ? { name: stringValue(asset.name)! } : {}),
    ...(stringValue(asset.mimeType)
      ? { mimeType: stringValue(asset.mimeType)! }
      : {}),
    ...(typeof size === 'number' ? { size } : {}),
    ...(storage ? { storage } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    createdAt: input.createdAt ?? Date.now(),
    createdBy: stringValue(input.createdBy) ?? 'unknown'
  }
}

export function workspaceAssetToCanvasMediaEntry(
  asset: WorkspaceAssetLike,
  input?: {
    id?: string | null
    position?: CanvasMediaEntry['position']
    context?: WorkspaceAssetMediaContext
  }
): CanvasMediaEntry | null {
  const type = workspaceAssetMediaType(asset)
  const assetId = stringValue(asset.id)
  if (!assetId || !type) return null
  const url = workspaceAssetRuntimeUrl(asset, input?.context ?? 'canvas')
  if (!url) return null
  const media = workspaceAssetMediaFromMetadata(assetMetadataValue(asset))
  return {
    id: stringValue(input?.id) ?? assetId,
    type,
    url,
    assetId,
    width: workspaceAssetDimension(asset, 'width') ?? null,
    height: workspaceAssetDimension(asset, 'height') ?? null,
    storage: workspaceAssetCanvasStorage(asset),
    mediaMetadata: media,
    position: input?.position ?? null
  }
}

export function canvasMediaFromWorkspaceAsset(
  asset: WorkspaceAssetLike,
  input?: { context?: WorkspaceAssetMediaContext }
): CanvasMediaFromWorkspaceAsset | null {
  const entry = workspaceAssetToCanvasMediaEntry(asset, {
    context: input?.context ?? 'download'
  })
  if (!entry) return null
  return {
    url: entry.url,
    type: entry.type,
    assetId: entry.assetId ?? null,
    width: entry.width ?? null,
    height: entry.height ?? null,
    storage: entry.storage,
    mediaMetadata: entry.mediaMetadata ?? null
  }
}

export function createCanvasAssetResourceReference(
  input: CreateCanvasAssetResourceReferenceInput
): CanvasResource | null {
  const assetId = stringValue(input.assetId)
  if (!assetId) return null
  return {
    id: assetId,
    type: input.type,
    url: '',
    assetId,
    createdAt: input.createdAt ?? Date.now(),
    createdBy: stringValue(input.createdBy) ?? 'unknown'
  }
}

export function canvasMediaResourceUrl(
  resource: WorkspaceMediaResourceLike | null | undefined,
  context: WorkspaceAssetMediaContext,
  containerWidth?: number
): string | null {
  if (!resource) return null
  return workspaceAssetMediaForContext(
    resource as Parameters<typeof workspaceAssetMediaForContext>[0],
    context,
    containerWidth
  )
}

export function canvasMediaResourceModelUrl(
  resource: WorkspaceMediaResourceLike | null | undefined
): string | null {
  return canvasMediaResourceUrl(resource, 'canvas')
}

export function canvasMediaResourcePlayableUrl(
  resource: WorkspaceMediaResourceLike | null | undefined
): string | null {
  return canvasMediaResourceUrl(resource, 'canvas')
}

export function canvasMediaResourceThumbnailUrl(
  resource: WorkspaceMediaResourceLike | null | undefined
): string | null {
  return canvasMediaResourceUrl(resource, 'thumbnail')
}

export function canvasMediaResourcePreviewUrl(
  resource: WorkspaceMediaResourceLike | null | undefined
): string | null {
  if (!resource) return null
  return mediaResourceType(resource) === 'video'
    ? canvasMediaResourceThumbnailUrl(resource)
    : canvasMediaResourceModelUrl(resource)
}

export const canvasResourceModelUrl = canvasMediaResourceModelUrl
export const canvasResourcePlayableUrl = canvasMediaResourcePlayableUrl
export const canvasResourcePreviewUrl = canvasMediaResourcePreviewUrl
export const canvasResourceThumbnailUrl = canvasMediaResourceThumbnailUrl

function firstCanvasMediaOutputResource(
  resources: CanvasResource[] | undefined,
  type: CanvasMediaResourceKind,
  createdBy?: string
): CanvasResource | null {
  return (
    resources?.find(
      (resource) =>
        resource.type === type &&
        (!createdBy || resource.createdBy === createdBy)
    ) ??
    resources?.find((resource) => resource.type === type) ??
    null
  )
}

function workspaceAssetLookupFromInput(
  input: ReadCanvasMediaOutputResourceInput | undefined
): ReadonlyMap<string, WorkspaceAssetLike> | null {
  const assets = input?.assets
  if (!assets) return null
  if (
    typeof (assets as ReadonlyMap<string, WorkspaceAssetLike>).get ===
    'function'
  ) {
    return assets as ReadonlyMap<string, WorkspaceAssetLike>
  }
  const lookup = workspaceAssetLookupFromAssets(
    assets as readonly WorkspaceAssetLike[]
  )
  return lookup.size > 0 ? lookup : null
}

function resolveCanvasMediaOutputResources(
  resources: CanvasResource[] | undefined,
  input: ReadCanvasMediaOutputResourceInput | undefined
): CanvasResource[] | undefined {
  const lookup = workspaceAssetLookupFromInput(input)
  if (!lookup) return resources
  return resources?.map((resource) =>
    resolveCanvasResourceAssetReference(resource, lookup, {
      context: input?.context ?? 'canvas'
    })
  )
}

function canvasMediaOutputResourceUrl(
  resource: CanvasResource,
  type: CanvasMediaResourceKind,
  input: ReadCanvasMediaOutputResourceInput | undefined
): string | null {
  const lookup = workspaceAssetLookupFromInput(input)
  const asset = lookup ? workspaceAssetForReference(resource, lookup) : null
  if (asset && workspaceAssetMediaType(asset, resource.type) === type) {
    return workspaceAssetRuntimeUrl(asset, input?.context ?? 'canvas')
  }
  return type === 'video'
    ? canvasMediaResourcePlayableUrl(resource)
    : canvasMediaResourceModelUrl(resource)
}

export function canvasMediaResourceMetadata(
  resource: WorkspaceMediaResourceLike | null | undefined
): WorkspaceAssetMediaMetadata | null {
  if (!resource?.metadata) return null
  return workspaceAssetMediaFromMetadata(resource.metadata)
}

export function canvasMediaResourceDimensions(
  resource: WorkspaceMediaResourceLike | null | undefined
): { width: number; height: number } | null {
  const media = canvasMediaResourceMetadata(resource)
  const width =
    media?.type === 'image'
      ? media.original.width
      : media?.type === 'video'
        ? media.original.width
        : undefined
  const height =
    media?.type === 'image'
      ? media.original.height
      : media?.type === 'video'
        ? media.original.height
        : undefined
  return width && height ? { width, height } : null
}

export function canvasMediaResourceVideoPosterUrl(
  resource: WorkspaceMediaResourceLike | null | undefined
): string | null {
  const media = canvasMediaResourceMetadata(resource)
  return media?.type === 'video' ? (media.video?.poster?.url ?? null) : null
}

export function canvasMediaResourceImageDerivatives(
  resource: WorkspaceMediaResourceLike | null | undefined
) {
  const media = canvasMediaResourceMetadata(resource)
  if (media?.type !== 'image' || media.image?.isAnimated) return null
  return media.image?.derivatives ?? null
}

export function canvasMediaResourceModelReferenceUrl(
  resource: WorkspaceMediaResourceLike | null | undefined
): string | null {
  const media = canvasMediaResourceMetadata(resource)
  if (media?.type !== 'image') return null
  const url = media.image?.model?.url?.trim()
  return url || null
}

export function isAnimatedCanvasImageResource(
  resource: WorkspaceMediaResourceLike | null | undefined
): boolean {
  const media = canvasMediaResourceMetadata(resource)
  return Boolean(media?.type === 'image' && media.image?.isAnimated)
}

export const getResourceUrl = canvasMediaResourceUrl
export const getResourceDimensions = canvasMediaResourceDimensions
export const getVideoPosterUrl = canvasMediaResourceVideoPosterUrl
export const getImageDerivatives = canvasMediaResourceImageDerivatives
export const getImageModelReferenceUrl = canvasMediaResourceModelReferenceUrl
export const isAnimatedImageResource = isAnimatedCanvasImageResource

export function readCanvasImageOutputResource(
  resources: CanvasResource[] | undefined,
  nodeId: string,
  input?: ReadCanvasMediaOutputResourceInput
): CanvasImageOutputResource | null {
  const resolvedResources = resolveCanvasMediaOutputResources(resources, input)
  const output = firstCanvasMediaOutputResource(
    resolvedResources,
    'image',
    nodeId
  )
  if (!output) return null

  const url = canvasMediaOutputResourceUrl(output, 'image', input)
  if (!url) return null

  return {
    resource: output,
    url,
    assetId: output.assetId ?? null,
    width: canvasResourceMetadataNumber(output, 'width'),
    height: canvasResourceMetadataNumber(output, 'height'),
    mediaMetadata: canvasMediaResourceMetadata(output)
  }
}

export function readCanvasVideoOutputResource(
  resources: CanvasResource[] | undefined,
  nodeId: string,
  input?: ReadCanvasMediaOutputResourceInput
): CanvasVideoOutputResource | null {
  const resolvedResources = resolveCanvasMediaOutputResources(resources, input)
  const output = firstCanvasMediaOutputResource(
    resolvedResources,
    'video',
    nodeId
  )
  if (!output) return null

  const url = canvasMediaOutputResourceUrl(output, 'video', input)
  if (!url) return null

  return {
    resource: output,
    url,
    assetId: output.assetId ?? null,
    width: canvasResourceMetadataNumber(output, 'width'),
    height: canvasResourceMetadataNumber(output, 'height'),
    mediaMetadata: canvasMediaResourceMetadata(output)
  }
}

export function readCanvasVideoPosterUrl(
  resources: CanvasResource[] | undefined,
  nodeId: string,
  input?: ReadCanvasMediaOutputResourceInput
): string | null {
  const resolvedResources = resolveCanvasMediaOutputResources(resources, input)
  const resource = firstCanvasMediaOutputResource(
    resolvedResources,
    'video',
    nodeId
  )
  return canvasMediaResourceThumbnailUrl(resource)
}

export const readImageOutputResource = readCanvasImageOutputResource
export const readVideoOutputResource = readCanvasVideoOutputResource
export const readVideoPosterUrl = readCanvasVideoPosterUrl

export function resolveCanvasResourceAssetReference<T>(
  resource: T,
  lookup: ReadonlyMap<string, WorkspaceAssetLike>,
  input?: { context?: WorkspaceAssetMediaContext }
): T {
  const record = recordValue(resource)
  if (!record) return resource
  const asset = workspaceAssetForReference(record, lookup)
  const type = workspaceAssetMediaType(asset, record.type)
  if (!asset || !type) return resource
  const url = workspaceAssetRuntimeUrl(asset, input?.context ?? 'canvas')
  if (!url) return resource
  const media = workspaceAssetMediaFromMetadata(assetMetadataValue(asset))
  const metadata = {
    ...(recordValue(record.metadata) ?? {}),
    ...(workspaceAssetDimension(asset, 'width')
      ? { width: workspaceAssetDimension(asset, 'width') }
      : {}),
    ...(workspaceAssetDimension(asset, 'height')
      ? { height: workspaceAssetDimension(asset, 'height') }
      : {}),
    ...(media ? { media } : {})
  }
  const storage = workspaceAssetCanvasStorage(asset)
  const size = assetSizeValue(asset)
  return {
    ...record,
    type,
    url,
    assetId: stringValue(asset.id),
    ...(stringValue(asset.name) ? { name: stringValue(asset.name)! } : {}),
    ...(stringValue(asset.mimeType)
      ? { mimeType: stringValue(asset.mimeType)! }
      : {}),
    ...(typeof size === 'number' ? { size } : {}),
    ...(storage ? { storage } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {})
  } as T
}

export function resolveCanvasMediaEntryAssetReference<T>(
  entry: T,
  lookup: ReadonlyMap<string, WorkspaceAssetLike>,
  input?: { context?: WorkspaceAssetMediaContext }
): T {
  const record = recordValue(entry)
  if (!record) return entry
  const asset = workspaceAssetForReference(record, lookup)
  const mediaEntry = asset
    ? workspaceAssetToCanvasMediaEntry(asset, {
        id: stringValue(record.id),
        position: (record.position ?? null) as CanvasMediaEntry['position'],
        context: input?.context ?? 'canvas'
      })
    : null
  if (!mediaEntry) return entry
  return {
    ...record,
    ...mediaEntry,
    width: numberValue(record.width) ?? mediaEntry.width,
    height: numberValue(record.height) ?? mediaEntry.height
  } as T
}

export function resolveCanvasNodeAssetReferences<T>(
  node: T,
  lookup: ReadonlyMap<string, WorkspaceAssetLike>,
  input?: { context?: WorkspaceAssetMediaContext }
): T {
  const nodeRecord = recordValue(node)
  const data = recordValue(nodeRecord?.data)
  if (!nodeRecord || !data) return node

  let changed = false
  const nextData: Record<string, unknown> = { ...data }
  for (const key of CANVAS_ASSET_RESOURCE_ARRAY_KEYS) {
    if (!Array.isArray(nextData[key])) continue
    nextData[key] = nextData[key].map((resource) =>
      resolveCanvasResourceAssetReference(resource, lookup, input)
    )
    changed = true
  }
  return changed ? ({ ...nodeRecord, data: nextData } as T) : node
}

export function resolveCanvasDocumentAssetReferences<T>(
  document: T,
  lookup: ReadonlyMap<string, WorkspaceAssetLike>,
  input?: { context?: WorkspaceAssetMediaContext }
): T {
  const record = recordValue(document)
  if (!record) return document

  let changed = false
  const nextRecord: Record<string, unknown> = { ...record }

  if (Array.isArray(record.elements)) {
    const elements = record.elements.map((element) => {
      const resolved = resolveCanvasDocumentElementAssetReference(
        element,
        lookup,
        input
      )
      if (resolved !== element) changed = true
      return resolved
    })
    if (changed) nextRecord.elements = elements
  }

  if (record.outputResource) {
    nextRecord.outputResource = resolveCanvasResourceAssetReference(
      record.outputResource,
      lookup,
      input
    )
    changed = true
  }

  return changed ? (nextRecord as T) : document
}

function resolveCanvasDocumentElementAssetReference<T>(
  element: T,
  lookup: ReadonlyMap<string, WorkspaceAssetLike>,
  _input?: { context?: WorkspaceAssetMediaContext }
): T {
  const cleaned = stripCanvasDocumentElementMediaMetadata(element)
  const record = recordValue(cleaned)
  if (!record) return element
  const elementType = record.type
  if (elementType !== 'raster' && elementType !== 'mask') return cleaned

  const asset = workspaceAssetForReference(record, lookup)
  const type = workspaceAssetMediaType(asset, record.type)
  const assetId = stringValue(asset?.id)
  if (!asset || !type || !assetId) return cleaned
  if (
    record.assetId === assetId &&
    (elementType !== 'raster' || record.mediaType === type)
  ) {
    return cleaned
  }

  return {
    ...record,
    assetId,
    ...(elementType === 'raster' ? { mediaType: type } : {})
  } as T
}

function stripCanvasDocumentElementMediaMetadata<T>(element: T): T {
  const record = recordValue(element)
  if (!record) return element
  const elementType = record.type
  if (elementType !== 'raster' && elementType !== 'mask') return element
  const metadata = recordValue(record.metadata)
  if (!metadata || !Object.hasOwn(metadata, 'media')) {
    return element
  }

  const { media: _media, ...restMetadata } = metadata
  const next: Record<string, unknown> = { ...record }
  if (Object.keys(restMetadata).length > 0) {
    next.metadata = restMetadata
  } else {
    delete next.metadata
  }
  return next as T
}

function compactCanvasDocumentElementAssetReference<T>(element: T): T {
  const cleaned = stripCanvasDocumentElementMediaMetadata(element)
  const record = recordValue(cleaned)
  if (!record) return element
  const elementType = record.type
  if (elementType !== 'raster' && elementType !== 'mask') return cleaned
  const assetId = stringValue(record.assetId)
  if (!assetId) return cleaned
  return {
    ...record,
    ...(elementType === 'raster'
      ? { mediaType: mediaAssetTypeValue(record.mediaType) ?? 'image' }
      : {}),
    assetId
  } as T
}

export function compactCanvasResourceAssetReference<T>(resource: T): T {
  const record = recordValue(resource)
  if (!record) return resource
  const assetId = stringValue(record.assetId)
  if (!assetId) return resource
  return {
    id: assetId,
    type: canvasResourceTypeValue(record.type),
    assetId,
    createdAt: finiteNumberValue(record.createdAt) ?? 0,
    createdBy: stringValue(record.createdBy) ?? 'unknown'
  } as T
}

export function compactCanvasNodeAssetReferences<T>(node: T): T {
  const nodeRecord = recordValue(node)
  const data = recordValue(nodeRecord?.data)
  if (!nodeRecord || !data) return node

  let changed = false
  const nextData: Record<string, unknown> = { ...data }
  for (const key of CANVAS_ASSET_RESOURCE_ARRAY_KEYS) {
    if (!Array.isArray(nextData[key])) continue
    nextData[key] = nextData[key].map(compactCanvasResourceAssetReference)
    changed = true
  }
  return changed ? ({ ...nodeRecord, data: nextData } as T) : node
}

export function compactCanvasDocumentAssetReferences<T>(document: T): T {
  const record = recordValue(document)
  if (!record) return document

  let changed = false
  const nextRecord: Record<string, unknown> = { ...record }
  if (Array.isArray(record.elements)) {
    const elements = record.elements.map((element) => {
      const compacted = compactCanvasDocumentElementAssetReference(element)
      if (compacted !== element) changed = true
      return compacted
    })
    if (changed) nextRecord.elements = elements
  }
  if (record.outputResource) {
    nextRecord.outputResource = compactCanvasResourceAssetReference(
      record.outputResource
    )
    changed = true
  }
  return changed ? (nextRecord as T) : document
}

export function workspaceAssetMediaSources(
  asset: Pick<WorkspaceAsset, 'type' | 'url' | 'metadata'>
): WorkspaceAssetMediaSources {
  const media = workspaceAssetMediaFromMetadata(asset.metadata)
  const image = media?.image
  const video = media?.video
  const originalUrl = stringValue(media?.original?.url)
  const isAnimated = Boolean(asset.type === 'image' && image?.isAnimated)
  const imageDisplayUrl = isAnimated
    ? originalUrl
    : (stringValue(image?.thumbnail?.url) ??
      stringValue(image?.preview?.url) ??
      stringValue(image?.derivatives?.thumb) ??
      stringValue(image?.derivatives?.preview))
  const videoPosterUrl = stringValue(video?.poster?.url)
  const displayUrl =
    asset.type === 'image' ? imageDisplayUrl : (videoPosterUrl ?? originalUrl)
  const motionPreviewUrl =
    asset.type === 'video'
      ? (stringValue(video?.preview?.url) ?? originalUrl)
      : null

  return {
    originalUrl,
    displayUrl,
    downloadUrl: originalUrl,
    posterUrl: asset.type === 'video' ? videoPosterUrl : null,
    motionUrl: motionPreviewUrl,
    isAnimated,
    derivatives: isAnimated ? null : (image?.derivatives ?? null)
  }
}

export function workspaceAssetMediaForContext(
  asset: Pick<WorkspaceAsset, 'type' | 'url' | 'metadata'>,
  context: WorkspaceAssetMediaContext,
  containerWidth?: number
): string | null {
  const media = workspaceAssetMediaFromMetadata(asset.metadata)
  if (!media) return null

  if (media.type === 'video') {
    if (context === 'thumbnail' || context === 'preview') {
      return stringValue(media.video?.poster?.url)
    }
    return (
      stringValue(media.video?.preview?.url) ?? stringValue(media.original.url)
    )
  }

  const originalUrl = stringValue(media.original.url)
  const image = media.image
  if (!image || image.isAnimated) return originalUrl

  if (context === 'download') return originalUrl
  if (context === 'canvas') {
    return (
      stringValue(image.preview?.url) ??
      stringValue(image.derivatives?.preview) ??
      stringValue(image.thumbnail?.url) ??
      stringValue(image.derivatives?.thumb) ??
      originalUrl
    )
  }
  if (context === 'preview') {
    return (
      stringValue(image.preview?.url) ??
      stringValue(image.derivatives?.preview) ??
      originalUrl
    )
  }
  if (context === 'thumbnail') {
    return (
      stringValue(image.thumbnail?.url) ??
      stringValue(image.derivatives?.thumb) ??
      originalUrl
    )
  }

  const width = numberValue(containerWidth)
  const thumbnails = image.derivatives?.thumbnails
  if (!width || !thumbnails) {
    return stringValue(image.preview?.url) ?? originalUrl
  }
  if (width <= 128) return thumbnails.w128
  if (width <= 320) return thumbnails.w320
  if (width <= 640) return thumbnails.w640
  if (width <= 1280) return thumbnails.w1280
  return thumbnails.w2048
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
