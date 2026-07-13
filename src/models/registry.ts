import {
  applyGenerationGatewayConfig,
  type ConfiguredGenerationPayload,
  compactGenerationRecord,
  type GenerationGatewayConfig,
  hasGenerationGatewayPayloadParameters,
  readGenerationGatewayConfig
} from '../generation/gateway-config.js'
import {
  gptImage1_5Model,
  gptImage1Model,
  gptImage2FlatfeeModel,
  gptImage2Model,
  gptImage2VipModel
} from './registry/gpt.js'
import {
  happyHorseI2VModel,
  happyHorseR2VModel,
  happyHorseT2VModel,
  happyHorseVideoEditVModel
} from './registry/happyhorse.js'
import {
  buildSeedanceVideoPayload,
  doubaoSeedanceModel,
  klingV21Model,
  runwayGen3Model
} from './registry/others.js'
import {
  nanoBanana2Model,
  qwenImage2ProModel,
  qwenImageModel
} from './registry/qwen.js'
import {
  wan25T2VModel,
  wan26I2VModel,
  wan26R2VModel,
  wan26T2VModel,
  wan27I2VModel,
  wan27R2VModel,
  wan27T2VModel,
  wan27VideoEditVModel
} from './registry/wan.js'
import type {
  ImageGatewayPayload,
  ImageGenerationParams,
  ModelCapabilities,
  ModelMetadata,
  ModelRegistration,
  VideoGatewayPayload,
  VideoGenerationParams
} from './types.js'
import type { VideoModelPayloadType } from './video-endpoint.js'
import { normalizeVideoGenerationReferenceParams } from './video-reference.js'

class ModelRegistry {
  private models = new Map<string, ModelRegistration>()

  /** 注册模型 */
  register(registration: ModelRegistration): void {
    this.models.set(registration.metadata.id, registration)
  }

  /** 批量注册 */
  registerAll(registrations: ModelRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg)
    }
  }

  /** 获取模型元信息 */
  getMetadata(modelId: string): ModelMetadata | undefined {
    return (
      this.models.get(modelId)?.metadata ??
      dynamicVideoRegistration(modelId)?.metadata
    )
  }

  /** 获取所有模型 ID */
  getAllModelIds(): string[] {
    return Array.from(this.models.keys())
  }

  /** 获取指定类别的模型 ID */
  getModelIdsByCategory(category: 'image' | 'video'): string[] {
    return Array.from(this.models.values())
      .filter((reg) => reg.metadata.category === category)
      .map((reg) => reg.metadata.id)
  }

  /** 获取指定类别和能力的模型 ID */
  getModelIdsByCategoryAndCapability(
    category: 'image' | 'video',
    capability?: keyof ModelCapabilities
  ): string[] {
    return Array.from(this.models.values())
      .filter((reg) => {
        if (reg.metadata.category !== category) return false
        if (!capability) return true
        return reg.metadata.capabilities[capability]
      })
      .map((reg) => reg.metadata.id)
  }

  /** 按能力分组获取视频模型 */
  getVideoModelsByCapability(): {
    textToVideo: string[]
    imageToVideoFirstFrame: string[]
    imageToVideoReference: string[]
    videoEdit: string[]
  } {
    const videoModels = Array.from(this.models.values()).filter(
      (reg) => reg.metadata.category === 'video'
    )

    return {
      // 文生视频 (T2V)
      textToVideo: videoModels
        .filter((reg) => reg.metadata.capabilities.textToMedia)
        .map((reg) => reg.metadata.id),
      // 图生视频 - 首帧模式 (I2V)
      imageToVideoFirstFrame: videoModels
        .filter(
          (reg) =>
            reg.metadata.capabilities.imageToVideo &&
            !reg.metadata.capabilities.multipleImages
        )
        .map((reg) => reg.metadata.id),
      // 图生视频 - 参考图模式 (R2V)
      imageToVideoReference: videoModels
        .filter((reg) => reg.metadata.capabilities.multipleImages)
        .map((reg) => reg.metadata.id),
      // 视频编辑
      videoEdit: videoModels
        .filter((reg) => reg.metadata.capabilities.videoEdit)
        .map((reg) => reg.metadata.id)
    }
  }

  /** 检查模型是否存在 */
  hasModel(modelId: string): boolean {
    return (
      this.models.has(modelId) || Boolean(dynamicVideoRegistration(modelId))
    )
  }

  /** 构建图片生成 Payload */
  buildImagePayload(params: ImageGenerationParams): ImageGatewayPayload {
    const registration = this.models.get(params.model)
    if (!registration) {
      throw new Error(`Unknown model: ${params.model}`)
    }

    if (!registration.buildImagePayload) {
      throw new Error(`Model ${params.model} does not support image generation`)
    }

    return registration.buildImagePayload(params)
  }

  /** 构建视频生成 Payload */
  buildVideoPayload(params: VideoGenerationParams): VideoGatewayPayload {
    const registration =
      this.models.get(params.model) ?? dynamicVideoRegistration(params.model)
    if (!registration) {
      throw new Error(`Unknown model: ${params.model}`)
    }

    if (!registration.buildVideoPayload) {
      throw new Error(`Model ${params.model} does not support video generation`)
    }

    return registration.buildVideoPayload(params)
  }

  /** 获取模型默认时长（视频模型） */
  getDefaultDuration(modelId: string): number {
    const metadata =
      this.getMetadata(modelId) ?? dynamicVideoRegistration(modelId)?.metadata
    return metadata?.defaults.duration ?? 5
  }

  /** 检查模型是否需要图片输入 */
  requiresImage(modelId: string): boolean {
    const metadata =
      this.getMetadata(modelId) ?? dynamicVideoRegistration(modelId)?.metadata
    if (!metadata) return false
    return (
      metadata.capabilities.imageToVideo ||
      metadata.capabilities.multipleImages ||
      metadata.capabilities.videoEdit
    )
  }

  /** 检查模型是否支持多图 */
  supportsMultipleImages(modelId: string): boolean {
    const metadata =
      this.getMetadata(modelId) ?? dynamicVideoRegistration(modelId)?.metadata
    return metadata?.capabilities.multipleImages ?? false
  }

  /** 根据 ID 获取模型 */
  getModelById(modelId: string): ModelRegistration | undefined {
    return this.models.get(modelId) ?? dynamicVideoRegistration(modelId)
  }
}

function seedanceMetadata(modelId: string): ModelMetadata {
  return {
    id: modelId,
    displayName: modelId,
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
  }
}

function dynamicVideoRegistration(
  modelId: string
): ModelRegistration | undefined {
  const id = modelId.trim()
  if (!id) return undefined
  const lower = id.toLowerCase()
  if (lower.includes('seedance')) {
    return {
      metadata: seedanceMetadata(id),
      buildVideoPayload: buildSeedanceVideoPayload
    }
  }
  return undefined
}

/** 全局单例 */
export const modelRegistry = new ModelRegistry()

/** 便捷导出 */
export { ModelRegistry }

export const DEFAULT_PROMPT_GENERATION_MODEL = 'deepseek-v4-pro'
export const DEFAULT_IMAGE_GENERATION_MODEL = 'gpt-image-2'
export const DEFAULT_VIDEO_GENERATION_MODEL = 'wan2.7-i2v'

function trimmedString(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || undefined
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

function positiveInteger(value: unknown): number | undefined {
  const number = finiteNumber(value)
  if (number === undefined) return undefined
  const integer = Math.floor(number)
  return integer > 0 ? integer : undefined
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function normalizeImageUrls(
  values: unknown,
  limit: number | undefined
): string[] | undefined {
  if (!Array.isArray(values)) return undefined
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const url = trimmedString(value)
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
    if (typeof limit === 'number' && out.length >= limit) break
  }
  return out.length > 0 ? out : undefined
}

/**
 * Normalize the raw frontend -> agent image generation params before any
 * payload-profile builder runs.
 *
 * Keep this model-agnostic: backend admin config / payload profile decides the
 * final provider payload. Do not read modelRegistry metadata here.
 */
export function normalizeImageGenerationParams(
  params: ImageGenerationParams
): ImageGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Image model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Image prompt is required.')

  const fallbackProfile = fallbackImagePayloadProfile(model)
  const image = normalizeImageUrls(
    params.image,
    fallbackProfile === 'qwen-image' ? 3 : undefined
  )
  const size = trimmedString(params.size)
  const imageCount = positiveInteger(params.n)
  const quality = trimmedString(params.quality)
  const background = trimmedString(params.background)
  const outputFormat = trimmedString(params.output_format)?.toLowerCase()
  const outputCompression = finiteNumber(params.output_compression)
  const promptExtend = booleanValue(params.prompt_extend)
  const watermark = booleanValue(params.watermark)
  const seed = finiteNumber(params.seed)
  const projectId =
    typeof params.projectId === 'string'
      ? trimmedString(params.projectId)
      : params.projectId === null
        ? null
        : undefined

  const normalized = {
    model,
    prompt,
    ...(size ? { size } : {}),
    ...(imageCount ? { n: imageCount } : {}),
    ...(image ? { image } : {}),
    ...(quality ? { quality } : {}),
    ...(background ? { background } : {}),
    ...(outputFormat ? { output_format: outputFormat } : {}),
    ...(outputCompression !== undefined
      ? { output_compression: outputCompression }
      : {}),
    ...(trimmedString(params.negative_prompt)
      ? { negative_prompt: trimmedString(params.negative_prompt)! }
      : {}),
    ...(promptExtend !== undefined ? { prompt_extend: promptExtend } : {}),
    ...(watermark !== undefined ? { watermark } : {}),
    ...(seed !== undefined ? { seed } : {}),
    ...(projectId !== undefined ? { projectId } : {})
  }

  return withImageProfileDefaults(normalized, fallbackProfile)
}

export function normalizeVideoGenerationParams(
  params: VideoGenerationParams
): VideoGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Video model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Video prompt is required.')

  const normalized = normalizeVideoGenerationReferenceParams(
    {
      ...params,
      model,
      prompt,
      duration: finiteNumber(params.duration),
      seconds: trimmedString(params.seconds),
      size: trimmedString(params.size),
      mergeVideoAspectRatio:
        trimmedString(params.mergeVideoAspectRatio) ??
        trimmedString(params.ratio),
      ratio:
        trimmedString(params.ratio) ??
        trimmedString(params.mergeVideoAspectRatio),
      promptExtend: booleanValue(params.promptExtend),
      watermark: booleanValue(params.watermark),
      projectId:
        typeof params.projectId === 'string'
          ? trimmedString(params.projectId)
          : params.projectId === null
            ? null
            : undefined
    },
    {}
  )

  return compactGenerationRecord(
    normalized as unknown as Record<string, unknown>
  ) as VideoGenerationParams
}

export type ConfiguredVideoGenerationPayload = {
  params: VideoGenerationParams
  basePayload: VideoGatewayPayload
  payload: Record<string, unknown>
  config: GenerationGatewayConfig
}

type GenerationMediaType = 'image' | 'video'
type ImagePayloadProfile = 'openai-image' | 'qwen-image' | 'generic-image'
type VideoPayloadProfile = VideoModelPayloadType | 'generic-video'

function configuredGenerationPayloadFromBase(
  basePayload: Record<string, unknown>,
  config: GenerationGatewayConfig
): ConfiguredGenerationPayload {
  return {
    payload: compactGenerationRecord(
      applyGenerationGatewayConfig(basePayload, config)
    ),
    config
  }
}

function explicitPayloadProfile(
  metadata: Record<string, unknown> | null | undefined
): string | undefined {
  return readGenerationGatewayConfig(metadata).payloadProfile
}

function hasExplicitPayloadParameters(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return hasGenerationGatewayPayloadParameters(metadata)
}

function isImagePayloadProfile(
  value: string | undefined
): value is ImagePayloadProfile {
  return (
    value === 'openai-image' ||
    value === 'qwen-image' ||
    value === 'generic-image'
  )
}

function isVideoPayloadProfile(
  value: string | undefined
): value is VideoPayloadProfile {
  return (
    value === 'standard' ||
    value === 'wan-t2v' ||
    value === 'wan-i2v' ||
    value === 'happyhorse-i2v' ||
    value === 'happyhorse-r2v' ||
    value === 'wan-r2v' ||
    value === 'wan27-i2v' ||
    value === 'wan27-r2v' ||
    value === 'seedance-content-task' ||
    value === 'video-edit' ||
    value === 'generic-video'
  )
}

function fallbackImagePayloadProfile(
  modelId: string
): ImagePayloadProfile | null {
  const lower = modelId.toLowerCase()
  if (lower.includes('qwen-image')) return 'qwen-image'
  if (
    lower.includes('gpt-image') ||
    lower.includes('dall-e') ||
    lower.includes('dalle') ||
    lower.includes('nano-banana') ||
    lower.includes('imagen')
  ) {
    return 'openai-image'
  }
  return null
}

function fallbackVideoPayloadProfile(
  modelId: string
): VideoPayloadProfile | null {
  const lower = modelId.toLowerCase()
  if (lower.includes('seedance') || lower.includes('seadance')) {
    return 'seedance-content-task'
  }
  if (lower.includes('happyhorse') && lower.includes('r2v')) {
    return 'happyhorse-r2v'
  }
  if (lower.includes('happyhorse') && lower.includes('i2v')) {
    return 'happyhorse-i2v'
  }
  if (
    lower.includes('videoedit') ||
    lower.includes('video-edit') ||
    lower.includes('video_edit')
  ) {
    return 'video-edit'
  }
  if (/wan2\.7.*r2v/i.test(modelId)) return 'wan27-r2v'
  if (/wan2\.7.*i2v/i.test(modelId)) return 'wan27-i2v'
  if (/wan2\.[67].*t2v/i.test(modelId)) return 'wan-t2v'
  if (/wan.*r2v/i.test(modelId)) return 'wan-r2v'
  if (/wan.*i2v/i.test(modelId)) return 'wan-i2v'
  return null
}

function withImageProfileDefaults(
  params: ImageGenerationParams,
  profile: ImagePayloadProfile | null
): ImageGenerationParams {
  if (profile === 'qwen-image') {
    const image = normalizeImageUrls(params.image, 3)
    return {
      model: params.model,
      prompt: params.prompt,
      ...(params.size ? { size: params.size } : {}),
      ...(params.n ? { n: params.n } : {}),
      ...(image ? { image } : {}),
      ...(params.negative_prompt
        ? { negative_prompt: params.negative_prompt }
        : {}),
      ...(params.prompt_extend !== undefined
        ? { prompt_extend: params.prompt_extend }
        : {}),
      ...(params.watermark !== undefined
        ? { watermark: params.watermark }
        : {}),
      ...(params.seed !== undefined ? { seed: params.seed } : {}),
      ...(params.projectId !== undefined ? { projectId: params.projectId } : {})
    }
  }
  if (profile !== 'openai-image') return params
  return {
    ...params,
    size: params.size ?? '1024x1024',
    n: params.n ?? 1,
    quality: params.quality ?? 'auto',
    background: params.background ?? 'auto',
    output_format: params.output_format ?? 'png'
  }
}

function withVideoProfileDefaults(
  params: VideoGenerationParams,
  profile: VideoPayloadProfile
): VideoGenerationParams {
  if (profile === 'generic-video') return params

  if (profile === 'seedance-content-task') {
    return {
      ...params,
      duration: params.duration ?? videoDuration(params, 5),
      size: params.size ?? '720p',
      ratio: params.ratio ?? params.mergeVideoAspectRatio ?? 'adaptive',
      watermark: params.watermark ?? false
    }
  }

  const fallbackDuration = wanFallbackDuration(profile, params.model)
  const ratio = params.mergeVideoAspectRatio ?? params.ratio ?? '16:9'
  return {
    ...params,
    duration: params.duration ?? videoDuration(params, fallbackDuration),
    size: params.size ?? '720P',
    mergeVideoAspectRatio: ratio,
    ratio,
    promptExtend: params.promptExtend ?? true,
    watermark: params.watermark ?? true
  }
}

function resolveImagePayloadProfile(
  modelId: string,
  metadata: Record<string, unknown> | null | undefined
): ImagePayloadProfile | null {
  const explicit = explicitPayloadProfile(metadata)
  if (isImagePayloadProfile(explicit)) return explicit
  return (
    fallbackImagePayloadProfile(modelId) ??
    (hasExplicitPayloadParameters(metadata) ? 'generic-image' : null)
  )
}

function resolveVideoPayloadProfile(
  modelId: string,
  metadata: Record<string, unknown> | null | undefined
): VideoPayloadProfile | null {
  const explicit = explicitPayloadProfile(metadata)
  if (isVideoPayloadProfile(explicit)) return explicit
  return (
    fallbackVideoPayloadProfile(modelId) ??
    (hasExplicitPayloadParameters(metadata) ? 'generic-video' : null)
  )
}

export function hasGenerationPayloadConfiguration(input: {
  modelId: string
  mediaType: GenerationMediaType
  metadata?: Record<string, unknown> | null
}): boolean {
  return input.mediaType === 'image'
    ? resolveImagePayloadProfile(input.modelId, input.metadata) !== null
    : resolveVideoPayloadProfile(input.modelId, input.metadata) !== null
}

function qwenImageSize(value: string | undefined): string {
  const match = value?.trim().match(/^(\d+)\s*[xX*]\s*(\d+)$/)
  if (!match) return '2048*2048'
  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height)) return '2048*2048'
  if (width !== height) return '2048*2048'
  const edge = Math.max(1, Math.min(2048, width))
  return `${edge}*${edge}`
}

function openaiImagePayload(
  params: ImageGenerationParams
): ImageGatewayPayload {
  return compactGenerationRecord({
    model: params.model,
    prompt: params.prompt,
    size: params.size,
    n: params.n,
    image: params.image,
    quality: params.quality,
    background: params.background,
    output_format: params.output_format,
    output_compression: params.output_compression
  }) as ImageGatewayPayload
}

function qwenImagePayload(params: ImageGenerationParams): ImageGatewayPayload {
  const content: Array<{ text: string } | { image: string }> = []
  for (const image of params.image?.slice(0, 3) ?? []) {
    content.push({ image })
  }
  content.push({ text: params.prompt })

  return compactGenerationRecord({
    model: params.model,
    input: {
      messages: [
        {
          role: 'user',
          content
        }
      ]
    },
    parameters: {
      size: qwenImageSize(params.size),
      n: params.n ?? 1,
      negative_prompt: params.negative_prompt,
      prompt_extend: params.prompt_extend ?? true,
      watermark: params.watermark ?? false,
      seed: params.seed
    }
  }) as ImageGatewayPayload
}

function imagePayloadForProfile(
  profile: ImagePayloadProfile,
  params: ImageGenerationParams
): ImageGatewayPayload {
  if (profile === 'qwen-image') return qwenImagePayload(params)
  return openaiImagePayload(params)
}

function videoResolution(sizeArg?: string): string {
  const s = (sizeArg ?? '').toLowerCase()
  if (s.includes('1080')) return '1080P'
  if (s.includes('480')) return '480P'
  return '720P'
}

function videoResolutionLower(sizeArg?: string): string {
  return videoResolution(sizeArg).toLowerCase()
}

function videoDuration(params: VideoGenerationParams, fallback = 5): number {
  if (typeof params.duration === 'number' && Number.isFinite(params.duration)) {
    return Math.floor(params.duration)
  }
  const seconds = Number(params.seconds)
  return Number.isFinite(seconds) ? Math.floor(seconds) : fallback
}

function firstFrameUrl(params: VideoGenerationParams): string | undefined {
  return (
    params.referenceMedia
      ?.find((item) => item.type === 'first_frame' && item.url.trim())
      ?.url.trim() ??
    params.imgUrl?.trim() ??
    params.referenceMedia
      ?.find((item) => item.type === 'reference_image' && item.url.trim())
      ?.url.trim() ??
    params.mergeReferenceImageUrls?.find((url) => url.trim())?.trim()
  )
}

function requireFirstFrameUrl(params: VideoGenerationParams): string {
  const url = firstFrameUrl(params)
  if (!url) {
    throw new Error(
      `${params.model} requires an image reference for this payload profile.`
    )
  }
  return url
}

function uniqueReferenceImages(params: VideoGenerationParams): string[] {
  const urls = [
    ...(params.mergeReferenceImageUrls ?? []),
    ...(params.imgUrl ? [params.imgUrl] : [])
  ]
  return Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean)))
}

function referenceMedia(params: VideoGenerationParams) {
  if (params.referenceMedia && params.referenceMedia.length > 0) {
    return params.referenceMedia
  }
  return uniqueReferenceImages(params).map((url) => ({
    type: 'reference_image' as const,
    url
  }))
}

function wanPayload(
  profile: VideoPayloadProfile,
  params: VideoGenerationParams
): VideoGatewayPayload {
  const fallbackDuration = wanFallbackDuration(profile, params.model)
  const duration = videoDuration(params, fallbackDuration)
  const resolution = videoResolution(params.size)
  const ratio = params.mergeVideoAspectRatio ?? params.ratio ?? '16:9'
  if (profile === 'wan-t2v') {
    return {
      model: params.model,
      input: { prompt: params.prompt },
      parameters: {
        resolution,
        ratio,
        duration,
        prompt_extend: params.promptExtend ?? true,
        watermark: params.watermark ?? true
      }
    }
  }
  if (profile === 'wan-i2v' || profile === 'wan27-i2v') {
    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        img_url: requireFirstFrameUrl(params)
      },
      parameters: {
        resolution,
        ratio,
        duration,
        prompt_extend: params.promptExtend ?? true,
        watermark: params.watermark ?? true
      }
    }
  }
  return {
    model: params.model,
    input: {
      prompt: params.prompt,
      media: referenceMedia(params)
    },
    parameters: {
      resolution,
      ratio,
      duration,
      prompt_extend: params.promptExtend ?? true,
      watermark: params.watermark ?? true
    }
  }
}

function wanFallbackDuration(
  profile: VideoPayloadProfile,
  modelId: string
): number {
  return profile.startsWith('wan27') || /wan2\.7/i.test(modelId) ? 10 : 5
}

function happyHorsePayload(
  profile: VideoPayloadProfile,
  params: VideoGenerationParams
): VideoGatewayPayload {
  const duration = videoDuration(params, 5)
  const resolution = videoResolution(params.size)
  const ratio = params.mergeVideoAspectRatio ?? params.ratio ?? '16:9'
  if (profile === 'happyhorse-i2v') {
    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media: [
          {
            type: 'first_frame' as const,
            url: requireFirstFrameUrl(params)
          }
        ]
      },
      parameters: { resolution, duration }
    }
  }
  if (profile === 'video-edit') {
    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media: [
          ...(params.videoEditVideoUrl
            ? [{ type: 'video' as const, url: params.videoEditVideoUrl }]
            : []),
          ...uniqueReferenceImages(params).map((url) => ({
            type: 'reference_image' as const,
            url
          }))
        ]
      },
      parameters: {
        resolution,
        action: 'referenceGenerate',
        duration,
        watermark: false
      }
    }
  }
  return {
    model: params.model,
    input: {
      prompt: params.prompt,
      media: referenceMedia(params)
    },
    parameters: { resolution, ratio, duration }
  }
}

function seedanceContent(params: VideoGenerationParams) {
  const content: Record<string, unknown>[] = []
  if (params.prompt) content.push({ type: 'text', text: params.prompt })
  for (const item of params.referenceMedia ?? []) {
    if (item.type === 'reference_video' || item.type === 'video') {
      content.push({ type: 'video_url', video_url: { url: item.url } })
    } else if (
      item.type === 'driving_audio' ||
      item.type === 'reference_audio' ||
      item.type === 'audio'
    ) {
      content.push({ type: 'audio_url', audio_url: { url: item.url } })
    } else {
      content.push({ type: 'image_url', image_url: { url: item.url } })
    }
  }
  return content
}

function seedancePayload(params: VideoGenerationParams): VideoGatewayPayload {
  return compactGenerationRecord({
    model: params.model,
    prompt: params.prompt,
    content: params.content?.length ? params.content : seedanceContent(params),
    resolution: videoResolutionLower(params.size),
    ratio: params.ratio ?? params.mergeVideoAspectRatio ?? 'adaptive',
    duration: videoDuration(params, 5),
    watermark: params.watermark ?? false,
    frames: params.frames,
    seed: params.seed,
    camera_fixed: params.camera_fixed ?? params.cameraFixed,
    generate_audio: params.generate_audio ?? params.generateAudio,
    return_last_frame: params.return_last_frame ?? params.returnLastFrame,
    callback_url: params.callback_url ?? params.callbackUrl,
    execution_expires_after:
      params.execution_expires_after ?? params.executionExpiresAfter,
    priority: params.priority,
    service_tier: params.service_tier ?? params.serviceTier,
    draft: params.draft,
    safety_identifier: params.safety_identifier ?? params.safetyIdentifier,
    tools: params.tools
  }) as VideoGatewayPayload
}

function genericVideoPayload(
  params: VideoGenerationParams
): VideoGatewayPayload {
  return compactGenerationRecord({
    model: params.model,
    prompt: params.prompt,
    duration: params.duration,
    seconds: params.seconds,
    size: params.size,
    image: params.imgUrl,
    images: params.mergeReferenceImageUrls,
    content: params.content,
    referenceMedia: params.referenceMedia,
    ratio: params.ratio ?? params.mergeVideoAspectRatio,
    watermark: params.watermark
  }) as VideoGatewayPayload
}

function videoPayloadForProfile(
  profile: VideoPayloadProfile,
  params: VideoGenerationParams
): VideoGatewayPayload {
  if (
    profile === 'wan-t2v' ||
    profile === 'wan-i2v' ||
    profile === 'wan-r2v' ||
    profile === 'wan27-i2v' ||
    profile === 'wan27-r2v'
  ) {
    return wanPayload(profile, params)
  }
  if (
    profile === 'happyhorse-i2v' ||
    profile === 'happyhorse-r2v' ||
    profile === 'video-edit'
  ) {
    return happyHorsePayload(profile, params)
  }
  if (profile === 'seedance-content-task') return seedancePayload(params)
  return genericVideoPayload(params)
}

export function buildConfiguredVideoGenerationPayload(
  params: VideoGenerationParams,
  metadata?: Record<string, unknown> | null
): ConfiguredVideoGenerationPayload {
  const normalized = normalizeVideoGenerationParams(params)
  const profile = resolveVideoPayloadProfile(normalized.model, metadata)
  if (!profile) {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const paramsWithDefaults = withVideoProfileDefaults(normalized, profile)
  const basePayload = videoPayloadForProfile(profile, paramsWithDefaults)
  const configured = configuredGenerationPayloadFromBase(
    basePayload,
    readGenerationGatewayConfig(metadata)
  )

  return {
    params: paramsWithDefaults,
    basePayload,
    payload: configured.payload,
    config: configured.config
  }
}

export type ConfiguredImageGenerationPayload = {
  params: ImageGenerationParams
  basePayload: ImageGatewayPayload
  payload: Record<string, unknown>
  config: GenerationGatewayConfig
}

/**
 * Build the final image gateway payload from raw frontend params.
 *
 * Order is intentionally fixed:
 * raw frontend params -> normalized model params -> contract model defaults /
 * provider payload builder -> admin metadata.gateway.generation overrides.
 */
export function buildConfiguredImageGenerationPayload(
  params: ImageGenerationParams,
  metadata?: Record<string, unknown> | null
): ConfiguredImageGenerationPayload {
  const normalized = normalizeImageGenerationParams(params)
  const profile = resolveImagePayloadProfile(normalized.model, metadata)
  if (!profile) {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const paramsWithDefaults = withImageProfileDefaults(normalized, profile)
  const basePayload = imagePayloadForProfile(profile, paramsWithDefaults)
  const configured = configuredGenerationPayloadFromBase(
    basePayload,
    readGenerationGatewayConfig(metadata)
  )

  return {
    params: paramsWithDefaults,
    basePayload,
    payload: configured.payload,
    config: configured.config
  }
}

export const CANVAS_VIDEO_GENERATION_MODEL_IDS = [
  'wan2.6-i2v',
  'wan2.6-r2v',
  'wan2.6-t2v',
  'wan2.7-r2v',
  'wan2.7-i2v',
  'wan2.7-t2v',
  'doubao-seedance-2-0-260128',
  'happyhorse-1.0-i2v',
  'happyhorse-1.0-video-edit'
] as const

export type CanvasVideoGenerationModelId =
  (typeof CANVAS_VIDEO_GENERATION_MODEL_IDS)[number]

const CANVAS_VIDEO_GENERATION_MODEL_ID_SET = new Set<string>(
  CANVAS_VIDEO_GENERATION_MODEL_IDS
)

export function isCanvasVideoGenerationModel(modelId: string): boolean {
  const id = modelId.trim()
  if (CANVAS_VIDEO_GENERATION_MODEL_ID_SET.has(id)) return true
  if (isVideoGenerationModel(id)) return true

  const lower = id.toLowerCase()
  return (
    lower.includes('i2v') ||
    lower.includes('r2v') ||
    lower.includes('t2v') ||
    lower.includes('text-to-video') ||
    lower.includes('image-to-video') ||
    lower.includes('img2vid') ||
    lower.includes('videoedit') ||
    lower.includes('video-edit') ||
    lower.includes('video_edit') ||
    lower.includes('seedance') ||
    lower.includes('kling') ||
    lower.includes('runway') ||
    lower.includes('wan2.') ||
    lower.includes('happyhorse') ||
    /\bvideo\b/.test(lower)
  )
}

/** 注册全部静态模型（单例初始化时调用） */
export function registerStaticModels(): void {
  modelRegistry.registerAll([
    qwenImageModel,
    qwenImage2ProModel,
    gptImage1Model,
    gptImage1_5Model,
    gptImage2Model,
    gptImage2FlatfeeModel,
    gptImage2VipModel,
    nanoBanana2Model,
    happyHorseT2VModel,
    happyHorseI2VModel,
    happyHorseR2VModel,
    happyHorseVideoEditVModel,
    wan25T2VModel,
    wan26T2VModel,
    wan26I2VModel,
    wan26R2VModel,
    wan27T2VModel,
    wan27I2VModel,
    wan27R2VModel,
    wan27VideoEditVModel,
    doubaoSeedanceModel,
    klingV21Model,
    runwayGen3Model
  ])
}

registerStaticModels()

export function getModel(modelId: string): ModelRegistration | undefined {
  return modelRegistry.getModelById(modelId)
}

export function isImageGenerationModel(modelId: string): boolean {
  const model = getModel(modelId)
  return model?.metadata?.category === 'image'
}

export function isVideoGenerationModel(modelId: string): boolean {
  const model = getModel(modelId)
  return model?.metadata?.category === 'video'
}
