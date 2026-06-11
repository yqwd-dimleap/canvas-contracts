import type {
  ImageGatewayPayload,
  ImageGenerationParams,
  ModelRegistration
} from '../types.js'

const COMPRESSIBLE_OUTPUT_FORMATS = new Set(['jpeg', 'webp'])

function outputCompressionFor(
  params: ImageGenerationParams
): number | undefined {
  const outputFormat = (params.output_format ?? 'png').toLowerCase()
  if (!COMPRESSIBLE_OUTPUT_FORMATS.has(outputFormat)) return undefined
  return params.output_compression
}

/**
 * GPT Image 系列模型
 * 官方文档: https://platform.openai.com/docs/api-reference/images/create
 *
 * gpt-image-2 新特性：
 * - 支持任意分辨率 (宽高被16整除，宽高比 1:3 到 3:1，最大 3840x2160)
 * - quality: auto (默认), high, medium, low
 * - background: transparent, opaque, auto (默认)
 * - output_format: png (默认), jpeg, webp
 * - output_compression: 0-100% (webp/jpeg)
 * - n: 1-10 张图片
 */
export const gptImage2Model: ModelRegistration = {
  metadata: {
    id: 'gpt-image-2',
    displayName: 'GPT Image 2',
    category: 'image',
    capabilities: {
      textToMedia: true,
      imageToVideo: false,
      multipleImages: false, // 支持 n=1-10，但不是"多图参考"
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      quality: true,
      background: true,
      outputFormat: true,
      outputCompression: true,
      imageCount: true
    },
    defaults: {
      quality: 'auto',
      size: '1024x1024'
    }
  },
  buildImagePayload: (params: ImageGenerationParams): ImageGatewayPayload => {
    // gpt-image-2 直接使用原始参数，无需映射
    return {
      model: params.model,
      prompt: params.prompt,
      size: params.size, // 支持任意 WIDTHxHEIGHT 格式
      n: params.n, // 1-10
      quality: params.quality, // auto, high, medium, low
      background: params.background, // transparent, opaque, auto
      output_format: params.output_format, // png, jpeg, webp
      output_compression: outputCompressionFor(params), // 0-100, webp/jpeg only
      // 注意: gpt-image-2 不支持 response_format (总是返回 base64)
      // 注意: edits 模式下会使用 image 参数
      image: params.image
    }
  }
}

/**
 * GPT Image 1 模型
 * 早期版本，支持基础参数
 */
export const gptImage1Model: ModelRegistration = {
  metadata: {
    id: 'gpt-image-1',
    displayName: 'GPT Image 1',
    category: 'image',
    capabilities: {
      textToMedia: true,
      imageToVideo: false,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      quality: true,
      background: true,
      outputFormat: true,
      outputCompression: true,
      imageCount: true
    },
    defaults: {
      quality: 'auto',
      size: '1024x1024'
    }
  },
  buildImagePayload: (params: ImageGenerationParams): ImageGatewayPayload => {
    return {
      model: params.model,
      prompt: params.prompt,
      size: params.size,
      n: params.n,
      image: params.image,
      quality: params.quality,
      background: params.background,
      output_format: params.output_format,
      output_compression: outputCompressionFor(params)
    }
  }
}

/**
 * GPT Image 1.5 模型
 * 中期版本，参数规范与 gpt-image-1 一致
 */
export const gptImage1_5Model: ModelRegistration = {
  metadata: {
    id: 'gpt-image-1.5',
    displayName: 'GPT Image 1.5',
    category: 'image',
    capabilities: {
      textToMedia: true,
      imageToVideo: false,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      quality: true,
      background: true,
      outputFormat: true,
      outputCompression: true,
      imageCount: true
    },
    defaults: {
      quality: 'auto',
      size: '1024x1024'
    }
  },
  buildImagePayload: (params: ImageGenerationParams): ImageGatewayPayload => {
    return {
      model: params.model,
      prompt: params.prompt,
      size: params.size,
      n: params.n,
      image: params.image,
      quality: params.quality,
      background: params.background,
      output_format: params.output_format,
      output_compression: outputCompressionFor(params)
    }
  }
}

/**
 * GPT Image 2 Flatfee 模型
 * 固定价格版本，参数规范与 gpt-image-2 一致
 */
export const gptImage2FlatfeeModel: ModelRegistration = {
  metadata: {
    id: 'gpt-image-2-flatfee',
    displayName: 'GPT Image 2 (Flatfee)',
    category: 'image',
    capabilities: gptImage2Model.metadata.capabilities,
    defaults: gptImage2Model.metadata.defaults
  },
  buildImagePayload: gptImage2Model.buildImagePayload
}

/**
 * GPT Image 2 VIP 模型
 * VIP 专属版本，参数规范与 gpt-image-2 一致
 */
export const gptImage2VipModel: ModelRegistration = {
  metadata: {
    id: 'gpt-image-2-vip',
    displayName: 'GPT Image 2 (VIP)',
    category: 'image',
    capabilities: gptImage2Model.metadata.capabilities,
    defaults: gptImage2Model.metadata.defaults
  },
  buildImagePayload: gptImage2Model.buildImagePayload
}
