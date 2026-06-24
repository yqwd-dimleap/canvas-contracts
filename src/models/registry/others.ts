import type {
  ModelRegistration,
  VideoGatewayPayload,
  VideoGenerationParams,
  VideoReferenceMedia
} from '../types.js'

function stringParam(
  params: VideoGenerationParams,
  key: string
): string | undefined {
  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberParam(
  params: VideoGenerationParams,
  key: string
): number | undefined {
  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanParam(
  params: VideoGenerationParams,
  key: string
): boolean | undefined {
  const value = (params as Record<string, unknown>)[key]
  return typeof value === 'boolean' ? value : undefined
}

function seedanceResolution(sizeArg?: string): string {
  const s = (sizeArg ?? '').toLowerCase()
  if (s.includes('1080')) return '1080p'
  if (s.includes('480')) return '480p'
  return '720p'
}

function seedanceRatio(params: VideoGenerationParams): string {
  return (
    stringParam(params, 'ratio') ?? params.mergeVideoAspectRatio ?? 'adaptive'
  )
}

function seedanceContentItemFromMedia(
  item: VideoReferenceMedia
): Record<string, unknown> | null {
  const url = item.url?.trim()
  if (!url) return null

  if (item.type === 'reference_video' || item.type === 'video') {
    return {
      type: 'video_url',
      video_url: { url },
      role: item.role ?? 'reference_video'
    }
  }

  if (
    item.type === 'driving_audio' ||
    item.type === 'reference_audio' ||
    item.type === 'audio'
  ) {
    return {
      type: 'audio_url',
      audio_url: { url },
      role: item.role ?? 'reference_audio'
    }
  }

  return {
    type: 'image_url',
    image_url: { url },
    role: item.role ?? item.type
  }
}

function uniqueSeedanceContent(
  content: Record<string, unknown>[]
): Record<string, unknown>[] {
  const seen = new Set<string>()
  const out: Record<string, unknown>[] = []
  for (const item of content) {
    const key = JSON.stringify(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function seedanceContent(
  params: VideoGenerationParams
): Record<string, unknown>[] {
  const rawContent = (params as { content?: unknown }).content
  if (Array.isArray(rawContent) && rawContent.length > 0) {
    return rawContent.filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object' && !Array.isArray(item))
    )
  }

  const content: Record<string, unknown>[] = []
  const prompt = params.prompt?.trim()
  if (prompt) {
    content.push({
      type: 'text',
      text: prompt
    })
  }

  const explicitMedia =
    params.referenceMedia
      ?.map(seedanceContentItemFromMedia)
      .filter((item): item is Record<string, unknown> => item !== null) ?? []
  content.push(...explicitMedia)

  if (explicitMedia.length === 0) {
    const firstFrameUrl = params.imgUrl ?? params.mergeReferenceImageUrls?.[0]
    if (firstFrameUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: firstFrameUrl },
        role: 'first_frame'
      })
    }

    for (const url of params.mergeReferenceImageUrls?.slice(1) ?? []) {
      content.push({
        type: 'image_url',
        image_url: { url },
        role: 'reference_image'
      })
    }
  }

  if (params.videoEditVideoUrl) {
    content.push({
      type: 'video_url',
      video_url: { url: params.videoEditVideoUrl },
      role: 'reference_video'
    })
  }

  if (params.drivingAudioUrl) {
    content.push({
      type: 'audio_url',
      audio_url: { url: params.drivingAudioUrl },
      role: 'reference_audio'
    })
  }

  return uniqueSeedanceContent(content)
}

/** Kling V2.1 Master */
export const klingV21Model: ModelRegistration = {
  metadata: {
    id: 'kling-v2-1-master',
    displayName: 'Kling V2.1 Master',
    category: 'video',
    capabilities: {
      textToMedia: true,
      imageToVideo: true,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: false,
      promptExtend: false,
      watermark: false,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720p'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const payload: VideoGatewayPayload = {
      model: params.model,
      prompt: params.prompt
    }

    if (duration) payload.duration = duration
    if (params.size) payload.size = params.size

    if (params.imgUrl) {
      payload.input = { img_url: params.imgUrl }
      payload.image = params.imgUrl
    }

    return payload
  }
}

/** Runway Gen3 Alpha Turbo */
export const runwayGen3Model: ModelRegistration = {
  metadata: {
    id: 'runway-gen3-alpha-turbo',
    displayName: 'Runway Gen3 Alpha Turbo',
    category: 'video',
    capabilities: {
      textToMedia: true,
      imageToVideo: true,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: false,
      promptExtend: false,
      watermark: false,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720p'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const payload: VideoGatewayPayload = {
      model: params.model,
      prompt: params.prompt
    }

    if (duration) payload.duration = duration
    if (params.size) payload.size = params.size

    if (params.imgUrl) {
      payload.input = { img_url: params.imgUrl }
      payload.image = params.imgUrl
    }

    return payload
  }
}

/** Doubao Seedance 2.0 */
export function buildSeedanceVideoPayload(
  params: VideoGenerationParams
): VideoGatewayPayload {
  const seconds =
    typeof params.seconds === 'string' ? Number(params.seconds.trim()) : NaN
  const duration =
    typeof params.duration === 'number' && Number.isFinite(params.duration)
      ? Math.floor(params.duration)
      : Number.isFinite(seconds)
        ? Math.floor(seconds)
        : 5
  const payload: VideoGatewayPayload = {
    model: params.model,
    content: seedanceContent(params),
    resolution: seedanceResolution(params.size),
    ratio: seedanceRatio(params),
    duration,
    watermark: params.watermark ?? false
  }

  const frames = numberParam(params, 'frames')
  if (frames !== undefined) payload.frames = Math.floor(frames)

  const seed = numberParam(params, 'seed')
  if (seed !== undefined) payload.seed = Math.floor(seed)

  const cameraFixed =
    booleanParam(params, 'camera_fixed') ?? booleanParam(params, 'cameraFixed')
  if (cameraFixed !== undefined) payload.camera_fixed = cameraFixed

  const generateAudio =
    booleanParam(params, 'generate_audio') ??
    booleanParam(params, 'generateAudio')
  if (generateAudio !== undefined) payload.generate_audio = generateAudio

  const returnLastFrame =
    booleanParam(params, 'return_last_frame') ??
    booleanParam(params, 'returnLastFrame')
  if (returnLastFrame !== undefined) {
    payload.return_last_frame = returnLastFrame
  }

  const callbackUrl =
    stringParam(params, 'callback_url') ?? stringParam(params, 'callbackUrl')
  if (callbackUrl) payload.callback_url = callbackUrl

  const executionExpiresAfter =
    numberParam(params, 'execution_expires_after') ??
    numberParam(params, 'executionExpiresAfter')
  if (executionExpiresAfter !== undefined) {
    payload.execution_expires_after = Math.floor(executionExpiresAfter)
  }

  const priority = numberParam(params, 'priority')
  if (priority !== undefined) payload.priority = Math.floor(priority)

  const serviceTier =
    stringParam(params, 'service_tier') ?? stringParam(params, 'serviceTier')
  if (serviceTier) payload.service_tier = serviceTier

  const draft = booleanParam(params, 'draft')
  if (draft !== undefined) payload.draft = draft

  const safetyIdentifier =
    stringParam(params, 'safety_identifier') ??
    stringParam(params, 'safetyIdentifier')
  if (safetyIdentifier) payload.safety_identifier = safetyIdentifier

  const tools = (params as { tools?: unknown }).tools
  if (Array.isArray(tools) && tools.length > 0) payload.tools = tools

  return payload
}

export const doubaoSeedanceModel: ModelRegistration = {
  metadata: {
    id: 'doubao-seedance-2-0-260128',
    displayName: 'Doubao Seedance 2.0',
    category: 'video',
    capabilities: {
      textToMedia: true,
      imageToVideo: true,
      multipleImages: true,
      videoEdit: true,
      videoMerge: false,
      maxReferenceImages: 9
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: false,
      watermark: true,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720p',
      aspectRatio: 'adaptive',
      watermark: false
    }
  },
  buildVideoPayload: buildSeedanceVideoPayload
}
