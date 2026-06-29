import type {
  ModelMetadata,
  VideoGenerationParams,
  VideoReferenceMedia
} from './types.js'

const VIDEO_REFERENCE_MEDIA_TYPES = new Set<VideoReferenceMedia['type']>([
  'reference_image',
  'reference_video',
  'first_frame',
  'last_frame',
  'reference_audio',
  'driving_audio',
  'audio',
  'video'
])

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  )
}

export function cleanVideoReferenceMedia(
  value: unknown
): VideoReferenceMedia[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: VideoReferenceMedia[] = []
  for (const item of value) {
    const recordItem = record(item)
    if (!recordItem) continue
    const type = typeof recordItem.type === 'string' ? recordItem.type : ''
    const url = typeof recordItem.url === 'string' ? recordItem.url.trim() : ''
    if (!url) continue
    if (!VIDEO_REFERENCE_MEDIA_TYPES.has(type as VideoReferenceMedia['type'])) {
      continue
    }
    const referenceVoice =
      typeof recordItem.reference_voice === 'string'
        ? recordItem.reference_voice.trim()
        : ''
    const key = `${type}:${url}:${referenceVoice}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      ...recordItem,
      type: type as VideoReferenceMedia['type'],
      url,
      ...(referenceVoice ? { reference_voice: referenceVoice } : {})
    } as VideoReferenceMedia)
  }
  return out
}

export function modelPrefersFirstFrameReference(
  modelId: string,
  metadata?: Pick<ModelMetadata, 'capabilities'> | null
): boolean {
  const lower = modelId.toLowerCase()
  return Boolean(
    lower.includes('seedance') ||
      lower.includes('seadance') ||
      lower.includes('i2v') ||
      lower.includes('image-to-video') ||
      lower.includes('img2vid') ||
      (metadata?.capabilities.imageToVideo &&
        !metadata.capabilities.multipleImages)
  )
}

export function inferVideoModelCapabilities(
  modelId: string,
  metadata?: Pick<ModelMetadata, 'capabilities'> | null
): ModelMetadata['capabilities'] {
  if (metadata?.capabilities) return metadata.capabilities

  const lower = modelId.toLowerCase()
  const isVideoEdit =
    lower.includes('videoedit') ||
    lower.includes('video-edit') ||
    lower.includes('video_edit')
  const isReference =
    lower.includes('r2v') ||
    lower.includes('reference') ||
    lower.includes('seedance') ||
    lower.includes('seadance')
  const isImageToVideo = modelPrefersFirstFrameReference(modelId) || isReference

  return {
    textToMedia: !isImageToVideo && !isVideoEdit,
    imageToVideo: isImageToVideo,
    multipleImages: isReference,
    videoEdit: isVideoEdit,
    videoMerge: false,
    ...(isReference
      ? { maxReferenceImages: lower.includes('seedance') ? 9 : 3 }
      : {})
  }
}

export function promoteFirstImageReference(
  items: readonly VideoReferenceMedia[],
  preferFirstFrame: boolean
): VideoReferenceMedia[] {
  if (!preferFirstFrame) return [...items]
  if (items.some((item) => item.type === 'first_frame')) return [...items]

  let promoted = false
  return items.map((item) => {
    if (promoted || item.type !== 'reference_image') return { ...item }
    promoted = true
    return { ...item, type: 'first_frame' as const }
  })
}

export function normalizeVideoReferenceMedia(
  params: Pick<
    VideoGenerationParams,
    'model' | 'referenceMedia' | 'mergeReferenceImageUrls' | 'imgUrl'
  >,
  options: {
    metadata?: Pick<ModelMetadata, 'capabilities'> | null
  } = {}
): VideoReferenceMedia[] {
  const media = cleanVideoReferenceMedia(params.referenceMedia)
  const urls = cleanStringArray(params.mergeReferenceImageUrls)
  const imgUrl = typeof params.imgUrl === 'string' ? params.imgUrl.trim() : ''
  for (const url of [imgUrl, ...urls]) {
    if (
      !url ||
      media.some(
        (item) =>
          (item.type === 'reference_image' || item.type === 'first_frame') &&
          item.url === url
      )
    ) {
      continue
    }
    media.push({ type: 'reference_image', url })
  }

  return promoteFirstImageReference(
    media,
    modelPrefersFirstFrameReference(params.model, options.metadata)
  )
}

export function normalizeVideoGenerationReferenceParams(
  params: VideoGenerationParams,
  options: {
    metadata?: Pick<ModelMetadata, 'capabilities'> | null
  } = {}
): VideoGenerationParams {
  const media = normalizeVideoReferenceMedia(params, options)
  const imageUrls = media
    .filter(
      (item) => item.type === 'reference_image' || item.type === 'first_frame'
    )
    .map((item) => item.url)
  const firstFrame =
    media.find((item) => item.type === 'first_frame')?.url ?? imageUrls[0]
  return {
    ...params,
    ...(firstFrame ? { imgUrl: firstFrame } : {}),
    ...(imageUrls.length > 0 ? { mergeReferenceImageUrls: imageUrls } : {}),
    ...(media.length > 0 ? { referenceMedia: media } : {}),
    videoEditImages: undefined
  }
}
