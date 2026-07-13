import type { VideoGenerationParams, VideoReferenceMedia } from './types.js'

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

function trimmedString(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || undefined
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(value.map((item) => trimmedString(item) ?? '').filter(Boolean))
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
    const url = trimmedString(recordItem.url)
    if (!url) continue
    if (!VIDEO_REFERENCE_MEDIA_TYPES.has(type as VideoReferenceMedia['type'])) {
      continue
    }
    const referenceVoice = trimmedString(recordItem.reference_voice)
    const key = `${type}:${url}:${referenceVoice ?? ''}`
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

export function normalizeVideoReferenceMedia(
  params: Pick<VideoGenerationParams, 'references'>
): VideoReferenceMedia[] {
  const references = record(params.references) ?? {}
  const media = cleanVideoReferenceMedia(references.media)
  const imageUrls = cleanStringArray(references.images)
  const firstImage = trimmedString(references.firstImage)
  for (const url of [firstImage, ...imageUrls]) {
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

  return media
}

export function normalizeVideoGenerationReferenceParams(
  params: VideoGenerationParams
): VideoGenerationParams {
  const references = record(params.references) ?? {}
  const media = normalizeVideoReferenceMedia(params)
  const imageUrls = media
    .filter(
      (item) => item.type === 'reference_image' || item.type === 'first_frame'
    )
    .map((item) => item.url)
  const firstFrame =
    media.find((item) => item.type === 'first_frame')?.url ??
    trimmedString(references.firstImage) ??
    imageUrls[0]

  return {
    ...params,
    references: {
      ...(cleanStringArray(references.clips).length > 0
        ? { clips: cleanStringArray(references.clips) }
        : {}),
      ...(trimmedString(references.sourceVideo)
        ? { sourceVideo: trimmedString(references.sourceVideo) }
        : {}),
      ...(trimmedString(references.drivingAudio)
        ? { drivingAudio: trimmedString(references.drivingAudio) }
        : {}),
      ...(firstFrame ? { firstImage: firstFrame } : {}),
      ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
      ...(media.length > 0 ? { media } : {})
    }
  }
}
