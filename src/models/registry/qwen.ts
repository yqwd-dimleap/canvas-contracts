import type {
  ImageGatewayPayload,
  ImageGenerationParams,
  ModelRegistration
} from '../types.js'

/**
 * Qwen 图片生成模型
 * API 文档: https://help.aliyun.com/zh/model-studio/qwen-image-api
 */
export const qwenImageModel: ModelRegistration = {
  metadata: {
    id: 'qwen-image-2.0',
    displayName: 'Qwen Image 2.0',
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
      quality: false,
      background: false,
      outputFormat: false, // Qwen 不支持指定输出格式
      imageCount: true,
      promptExtend: true,
      watermark: true
    },
    defaults: {
      size: '2048*2048', // Qwen 默认 2048*2048
      quality: 'auto',
      promptExtend: true,
      watermark: false
    }
  },
  buildImagePayload: (params: ImageGenerationParams): ImageGatewayPayload => {
    // Qwen API 规范: 使用嵌套的 input/parameters 结构
    const qwenSize = params.size?.replace(/x/gi, '*')

    // 构建 content 数组 - 每个对象只能有 text 或 image，不能同时存在
    const content: Array<{ text: string } | { image: string }> = []

    // 如果有参考图片（图像编辑模式），先添加图片
    if (params.image && params.image.length > 0) {
      // Qwen 支持 1-3 张图片
      for (const img of params.image.slice(0, 3)) {
        content.push({ image: img })
      }
    }

    // 添加文本提示词 - 只包含 text 字段
    content.push({ text: params.prompt })

    return {
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
        size: qwenSize,
        n: params.n ?? 1,
        negative_prompt: params.negative_prompt,
        prompt_extend: params.prompt_extend ?? true,
        watermark: params.watermark ?? false,
        seed: params.seed
      }
    }
  }
}

/** Nano Banana 2 模型 */
export const nanoBanana2Model: ModelRegistration = {
  metadata: {
    id: 'nano-banana-2',
    displayName: 'Nano Banana 2',
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
      size: '1024x1024',
      quality: 'auto'
    }
  },
  buildImagePayload: (params: ImageGenerationParams): ImageGatewayPayload => {
    // 使用通用的 OpenAI 兼容格式
    return {
      model: params.model,
      prompt: params.prompt,
      size: params.size,
      n: params.n,
      image: params.image,
      quality: params.quality,
      background: params.background,
      output_format: params.output_format,
      output_compression: params.output_compression
    }
  }
}
