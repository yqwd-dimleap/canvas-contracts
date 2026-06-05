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
  doubaoSeedanceModel,
  klingV21Model,
  runwayGen3Model
} from './registry/others.js'
import { nanoBanana2Model, qwenImageModel } from './registry/qwen.js'
import {
  wan25T2VModel,
  wan26I2VModel,
  wan26R2VModel,
  wan27I2VModel,
  wan27R2VModel,
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
    return this.models.get(modelId)?.metadata
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
    return this.models.has(modelId)
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
    const registration = this.models.get(params.model)
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
    const metadata = this.getMetadata(modelId)
    return metadata?.defaults.duration ?? 5
  }

  /** 检查模型是否需要图片输入 */
  requiresImage(modelId: string): boolean {
    const metadata = this.getMetadata(modelId)
    if (!metadata) return false
    return (
      metadata.capabilities.imageToVideo ||
      metadata.capabilities.multipleImages ||
      metadata.capabilities.videoEdit
    )
  }

  /** 检查模型是否支持多图 */
  supportsMultipleImages(modelId: string): boolean {
    const metadata = this.getMetadata(modelId)
    return metadata?.capabilities.multipleImages ?? false
  }

  /** 根据 ID 获取模型 */
  getModelById(modelId: string): ModelRegistration | undefined {
    return this.models.get(modelId)
  }
}

/** 全局单例 */
export const modelRegistry = new ModelRegistry()

/** 便捷导出 */
export { ModelRegistry }

export const DEFAULT_PROMPT_GENERATION_MODEL = 'gpt-5.4'
export const DEFAULT_IMAGE_GENERATION_MODEL = 'gpt-image-2'
export const DEFAULT_VIDEO_GENERATION_MODEL = 'happyhorse-1.0-t2v'

/** 注册全部静态模型（单例初始化时调用） */
export function registerStaticModels(): void {
  modelRegistry.registerAll([
    qwenImageModel,
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
    wan26I2VModel,
    wan26R2VModel,
    wan27I2VModel,
    wan27R2VModel,
    wan27VideoEditVModel,
    klingV21Model,
    runwayGen3Model,
    doubaoSeedanceModel
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
