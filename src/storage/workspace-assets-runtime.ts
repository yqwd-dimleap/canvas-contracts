import type {
  CanvasResource,
  CanvasResourceStorage,
  CanvasResourceType
} from '../canvas/resources/types.js'
import { canvasResourceStorageSchema } from '../canvas/resources/types.js'
import type {
  WorkspaceAsset,
  WorkspaceAssetMediaMetadata,
  WorkspaceAssetMediaSources,
  WorkspaceAssetMetadata
} from './workspace-assets.js'
import {
  workspaceAssetMetadataSchema,
  workspaceAssetSchema
} from './workspace-assets.js'

export type WorkspaceAssetMediaContext =
  | 'canvas'
  | 'canvasTexture'
  | 'preview'
  | 'thumbnail'
  | 'download'
  | 'responsive'

export type WorkspaceAssetLike = {
  id?: unknown
  workspaceId?: unknown
  createdByUserId?: unknown
  type?: unknown
  status?: unknown
  name?: unknown
  mimeType?: unknown
  size?: unknown
  url?: unknown
  storage?: unknown
  source?: unknown
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

export type CanvasMediaFromWorkspaceAsset = {
  url: string
  type: 'image' | 'video'
  assetId: string | null
  width: number | null
  height: number | null
  storage?: CanvasResourceStorage
  mediaMetadata?: WorkspaceAssetMediaMetadata | null
}

// ─── Internal helpers ──────────────────────────────────────────────

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

function assetMetadataValue(asset: WorkspaceAssetLike): WorkspaceAssetMetadata {
  return workspaceAssetMetadataSchema.parse(recordValue(asset.metadata) ?? {})
}

function assetSizeValue(asset: WorkspaceAssetLike): number | undefined {
  const n = finiteNumberValue(asset.size)
  return typeof n === 'number' && n >= 0 ? n : undefined
}

function workspaceAssetStorageValue(
  asset: WorkspaceAssetLike
): CanvasResourceStorage | null {
  const parsed = canvasResourceStorageSchema.safeParse(asset.storage)
  return parsed.success ? parsed.data : null
}

function workspaceAssetMediaType(
  asset: WorkspaceAssetLike | null | undefined,
  fallback?: unknown
): 'image' | 'video' | null {
  return mediaAssetTypeValue(asset?.type) ?? mediaAssetTypeValue(fallback)
}

function workspaceAssetCanvasStorage(
  asset: WorkspaceAssetLike
): CanvasResourceStorage | undefined {
  return workspaceAssetStorageValue(asset) ?? undefined
}

function mediaFromMetadataRecord(
  metadata: Record<string, unknown> | null | undefined
): WorkspaceAssetMediaMetadata | null {
  const media = recordValue(metadata?.media)
  return media ? (media as WorkspaceAssetMediaMetadata) : null
}

function canvasMediaResourceMetadata(
  resource: WorkspaceMediaResourceLike | null | undefined
): WorkspaceAssetMediaMetadata | null {
  if (!resource?.metadata) return null
  return mediaFromMetadataRecord(resource.metadata)
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

function compactCanvasResourceAssetReference<T>(resource: T): T {
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

// ─── WorkspaceAssetRuntime ──────────────────────────────────────────
// Parses loose workspace-asset shapes and maps them into canvas-resource
// / media-resource projections. All methods are static — the class is a
// namespace, never instantiated.

export class WorkspaceAssetRuntime {
  /** Strict-parse a raw row into a `WorkspaceAsset`. */
  static fromUnknown(row: unknown): WorkspaceAsset {
    return workspaceAssetSchema.parse(row)
  }

  /** Extract media metadata from an asset metadata bag, if present. */
  static mediaFromMetadata(
    metadata: Record<string, unknown> | null | undefined
  ): WorkspaceAssetMediaMetadata | null {
    return mediaFromMetadataRecord(metadata)
  }

  /** Best-effort `width` / `height` from the asset's media original. */
  static dimension(
    asset: WorkspaceAssetLike,
    key: 'width' | 'height'
  ): number | undefined {
    const media = mediaFromMetadataRecord(assetMetadataValue(asset))
    return numberValue(media?.original?.[key])
  }

  /**
   * Resolve the runtime URL for an asset in a given display context.
   * Falls back to the storage view-path / public URL when media metadata
   * is absent.
   */
  static runtimeUrl(
    asset: WorkspaceAssetLike,
    context: WorkspaceAssetMediaContext = 'canvas',
    containerWidth?: number
  ): string | null {
    const metadata = assetMetadataValue(asset)
    const storage = workspaceAssetStorageValue(asset)
    const storageUrl =
      stringValue(storage?.publicUrl) ?? stringValue(storage?.viewPath)
    const type = workspaceAssetMediaType(asset)
    if (type !== 'image' && type !== 'video') {
      return stringValue(asset.url) ?? storageUrl
    }
    return (
      WorkspaceAssetRuntime.mediaForContext(
        {
          type,
          url: stringValue(asset.url),
          metadata
        },
        context,
        containerWidth
      ) ??
      stringValue(mediaFromMetadataRecord(metadata)?.original.url) ??
      stringValue(asset.url) ??
      storageUrl
    )
  }

  /** Convert a workspace asset into a canvas resource projection. */
  static toCanvasResource(
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
    const url = WorkspaceAssetRuntime.runtimeUrl(
      asset,
      input.context ?? 'canvas'
    )
    if (!url) return null
    const media = mediaFromMetadataRecord(assetMetadataValue(asset))
    const metadata = {
      ...(WorkspaceAssetRuntime.dimension(asset, 'width')
        ? { width: WorkspaceAssetRuntime.dimension(asset, 'width') }
        : {}),
      ...(WorkspaceAssetRuntime.dimension(asset, 'height')
        ? { height: WorkspaceAssetRuntime.dimension(asset, 'height') }
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

  /** Convert a workspace asset into a lightweight media descriptor. */
  static toCanvasMedia(
    asset: WorkspaceAssetLike,
    input?: { context?: WorkspaceAssetMediaContext }
  ): CanvasMediaFromWorkspaceAsset | null {
    const type = workspaceAssetMediaType(asset)
    const assetId = stringValue(asset.id)
    if (!assetId || !type) return null
    const url = WorkspaceAssetRuntime.runtimeUrl(
      asset,
      input?.context ?? 'download'
    )
    if (!url) return null
    const media = mediaFromMetadataRecord(assetMetadataValue(asset))
    return {
      url,
      type,
      assetId,
      width: WorkspaceAssetRuntime.dimension(asset, 'width') ?? null,
      height: WorkspaceAssetRuntime.dimension(asset, 'height') ?? null,
      storage: workspaceAssetCanvasStorage(asset),
      mediaMetadata: media
    }
  }

  /** Derive display / download / poster / motion URLs for an asset. */
  static mediaSources(
    asset: Pick<WorkspaceAsset, 'type' | 'url' | 'metadata'>
  ): WorkspaceAssetMediaSources {
    const media = mediaFromMetadataRecord(asset.metadata)
    const image = media?.image
    const video = media?.video
    const originalUrl =
      stringValue(media?.original?.url) ??
      (asset.type === 'audio' ? stringValue(asset.url) : null)
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

  /**
   * Pick the best URL for a given context (canvas texture, preview,
   * thumbnail, responsive width bucket, …). Returns `null` when the asset
   * has no media metadata at all.
   */
  static mediaForContext(
    asset: Pick<WorkspaceAsset, 'type' | 'url' | 'metadata'>,
    context: WorkspaceAssetMediaContext,
    containerWidth?: number
  ): string | null {
    const media = mediaFromMetadataRecord(asset.metadata)
    if (!media) return asset.type === 'audio' ? stringValue(asset.url) : null

    if (media.type === 'video') {
      if (context === 'thumbnail' || context === 'preview') {
        return stringValue(media.video?.poster?.url)
      }
      return (
        stringValue(media.video?.preview?.url) ??
        stringValue(media.original.url)
      )
    }

    const originalUrl = stringValue(media.original.url)
    const image = media.image
    if (!image) return originalUrl

    if (context === 'download') return originalUrl
    if (context === 'canvas' || context === 'canvasTexture') {
      if (image.isAnimated && context !== 'canvasTexture') return originalUrl
      return (
        stringValue(image.preview?.url) ??
        stringValue(image.derivatives?.preview) ??
        stringValue(image.thumbnail?.url) ??
        stringValue(image.derivatives?.thumb) ??
        originalUrl
      )
    }
    if (image.isAnimated) return originalUrl
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

  /** Build a `WorkspaceAssetMediaMetadata` from upload completion fields. */
  static buildOriginalMedia(input: {
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
        ...(numberValue(input.width)
          ? { width: numberValue(input.width) }
          : {}),
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
}

// ─── CanvasMediaResource ────────────────────────────────────────────
// Read-only accessors over loose canvas media-resource shapes. Delegates
// URL selection to `WorkspaceAssetRuntime.mediaForContext`.

export class CanvasMediaResource {
  /** Resolve the best URL for a media resource in a given context. */
  static url(
    resource: WorkspaceMediaResourceLike | null | undefined,
    context: WorkspaceAssetMediaContext,
    containerWidth?: number
  ): string | null {
    if (!resource) return null
    return WorkspaceAssetRuntime.mediaForContext(
      resource as Parameters<typeof WorkspaceAssetRuntime.mediaForContext>[0],
      context,
      containerWidth
    )
  }

  /** Canvas-context URL — the default for model references. */
  static modelUrl(
    resource: WorkspaceMediaResourceLike | null | undefined
  ): string | null {
    return CanvasMediaResource.url(resource, 'canvas')
  }

  /** Video poster URL, or `null` when the resource is not a video. */
  static videoPosterUrl(
    resource: WorkspaceMediaResourceLike | null | undefined
  ): string | null {
    const media = canvasMediaResourceMetadata(resource)
    return media?.type === 'video' ? (media.video?.poster?.url ?? null) : null
  }

  /** Static image derivatives, or `null` for animated images / videos. */
  static imageDerivatives(
    resource: WorkspaceMediaResourceLike | null | undefined
  ) {
    const media = canvasMediaResourceMetadata(resource)
    if (media?.type !== 'image' || media.image?.isAnimated) return null
    return media.image?.derivatives ?? null
  }

  /** Model-reference URL for image generation, preferring the model crop. */
  static imageModelReferenceUrl(
    resource: WorkspaceMediaResourceLike | null | undefined
  ): string | null {
    const media = canvasMediaResourceMetadata(resource)
    if (media?.type !== 'image') return null
    if (media.image?.isAnimated) return stringValue(media.original.url)
    const url = media.image?.model?.url?.trim()
    return url || null
  }

  /** Thumbnail-context URL. */
  static thumbnailUrl(
    resource: WorkspaceMediaResourceLike | null | undefined
  ): string | null {
    return CanvasMediaResource.url(resource, 'thumbnail')
  }
}

// ─── CanvasAssetReference ───────────────────────────────────────────
// Factory + compactor for canvas asset references embedded in documents.

export class CanvasAssetReference {
  /** Create a compact canvas-resource reference that points at an asset. */
  static create(input: {
    assetId?: string | null
    type: CanvasMediaResourceKind
    createdBy: string
    createdAt?: number
  }): CanvasResource | null {
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

  /**
   * Strip transient media metadata from raster/mask elements and compact
   * asset references so the document is safe to persist.
   */
  static compactDocument<T>(document: T): T {
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
}
