import {
  buildConfiguredGenerationPayload,
  compactGenerationRecord,
  type GenerationGatewayConfig
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
import { normalizeVideoGenerationReferenceParams } from './video-reference.js'

const COMPRESSIBLE_IMAGE_OUTPUT_FORMATS = new Set(['jpeg', 'webp'])

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

function supportsImageParam(metadata: ModelMetadata | undefined): boolean {
  if (metadata?.category !== 'image') return true
  return Boolean(
    metadata.capabilities.imageEdit ||
      metadata.capabilities.multipleImages ||
      metadata.supportedParams?.referenceImages
  )
}

function supportsParam(
  metadata: ModelMetadata | undefined,
  key: keyof NonNullable<ModelMetadata['supportedParams']>
): boolean {
  if (metadata?.category !== 'image') return true
  return metadata.supportedParams?.[key] === true
}

function defaultString(
  metadata: ModelMetadata | undefined,
  key: 'size' | 'quality' | 'background' | 'outputFormat' | 'aspectRatio'
): string | undefined {
  return trimmedString(metadata?.defaults[key])
}

function defaultBoolean(
  metadata: ModelMetadata | undefined,
  key: 'promptExtend' | 'watermark'
): boolean | undefined {
  return booleanValue(metadata?.defaults[key])
}

function defaultNumber(
  metadata: ModelMetadata | undefined,
  key: 'duration' | 'outputCompression' | 'imageCount'
): number | undefined {
  return finiteNumber(metadata?.defaults[key])
}

/**
 * Normalize the raw frontend -> agent image generation params before any
 * provider-specific payload builder runs.
 *
 * This keeps browser requests canonical and prevents unsupported UI defaults
 * such as quality/background/output_format from leaking into model-specific
 * gateway payloads.
 */
export function normalizeImageGenerationParams(
  params: ImageGenerationParams
): ImageGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Image model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Image prompt is required.')

  const metadata = modelRegistry.getMetadata(model)
  const maxReferenceImages =
    typeof metadata?.capabilities.maxReferenceImages === 'number'
      ? metadata.capabilities.maxReferenceImages
      : undefined
  const image = supportsImageParam(metadata)
    ? normalizeImageUrls(params.image, maxReferenceImages)
    : undefined
  const size = trimmedString(params.size) ?? defaultString(metadata, 'size')
  const imageCount =
    positiveInteger(params.n) ??
    positiveInteger(defaultNumber(metadata, 'imageCount'))
  const quality =
    trimmedString(params.quality) ?? defaultString(metadata, 'quality')
  const background =
    trimmedString(params.background) ?? defaultString(metadata, 'background')
  const outputFormat = (
    trimmedString(params.output_format) ??
    defaultString(metadata, 'outputFormat')
  )?.toLowerCase()
  const outputCompression =
    finiteNumber(params.output_compression) ??
    defaultNumber(metadata, 'outputCompression')
  const promptExtend =
    booleanValue(params.prompt_extend) ??
    defaultBoolean(metadata, 'promptExtend')
  const watermark =
    booleanValue(params.watermark) ?? defaultBoolean(metadata, 'watermark')
  const seed = finiteNumber(params.seed)
  const projectId =
    typeof params.projectId === 'string'
      ? trimmedString(params.projectId)
      : params.projectId === null
        ? null
        : undefined

  return {
    model,
    prompt,
    ...(supportsParam(metadata, 'size') && size ? { size } : {}),
    ...(supportsParam(metadata, 'imageCount') && imageCount
      ? { n: imageCount }
      : {}),
    ...(image ? { image } : {}),
    ...(supportsParam(metadata, 'quality') && quality ? { quality } : {}),
    ...(supportsParam(metadata, 'background') && background
      ? { background }
      : {}),
    ...(supportsParam(metadata, 'outputFormat') && outputFormat
      ? { output_format: outputFormat }
      : {}),
    ...(supportsParam(metadata, 'outputCompression') &&
    outputFormat &&
    COMPRESSIBLE_IMAGE_OUTPUT_FORMATS.has(outputFormat) &&
    outputCompression !== undefined
      ? { output_compression: outputCompression }
      : {}),
    ...(trimmedString(params.negative_prompt)
      ? { negative_prompt: trimmedString(params.negative_prompt)! }
      : {}),
    ...(supportsParam(metadata, 'promptExtend') && promptExtend !== undefined
      ? { prompt_extend: promptExtend }
      : {}),
    ...(supportsParam(metadata, 'watermark') && watermark !== undefined
      ? { watermark }
      : {}),
    ...(seed !== undefined ? { seed } : {}),
    ...(projectId !== undefined ? { projectId } : {})
  }
}

export function normalizeVideoGenerationParams(
  params: VideoGenerationParams
): VideoGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Video model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Video prompt is required.')

  const metadata = modelRegistry.getMetadata(model)
  const normalized = normalizeVideoGenerationReferenceParams(
    {
      ...params,
      model,
      prompt,
      duration:
        finiteNumber(params.duration) ?? defaultNumber(metadata, 'duration'),
      seconds: trimmedString(params.seconds),
      size: trimmedString(params.size) ?? defaultString(metadata, 'size'),
      mergeVideoAspectRatio:
        trimmedString(params.mergeVideoAspectRatio) ??
        trimmedString(params.ratio) ??
        defaultString(metadata, 'aspectRatio'),
      ratio:
        trimmedString(params.ratio) ??
        trimmedString(params.mergeVideoAspectRatio) ??
        defaultString(metadata, 'aspectRatio'),
      promptExtend:
        booleanValue(params.promptExtend) ??
        defaultBoolean(metadata, 'promptExtend'),
      watermark:
        booleanValue(params.watermark) ?? defaultBoolean(metadata, 'watermark'),
      projectId:
        typeof params.projectId === 'string'
          ? trimmedString(params.projectId)
          : params.projectId === null
            ? null
            : undefined
    },
    { metadata }
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

export function buildConfiguredVideoGenerationPayload(
  params: VideoGenerationParams,
  metadata?: Record<string, unknown> | null
): ConfiguredVideoGenerationPayload {
  const normalized = normalizeVideoGenerationParams(params)
  const basePayload = modelRegistry.buildVideoPayload(normalized)
  const configured = buildConfiguredGenerationPayload(basePayload, metadata)

  return {
    params: normalized,
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
  const basePayload = modelRegistry.buildImagePayload(normalized)
  const configured = buildConfiguredGenerationPayload(basePayload, metadata)

  return {
    params: normalized,
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
