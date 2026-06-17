import type { z } from 'zod'
import type {
  imageGenerationParamsSchema,
  videoGenerationParamsSchema,
  videoReferenceMediaSchema
} from './params.js'

/** 模型类别 */
export type ModelCategory = 'image' | 'video'

/** 模型能力标记 */
export interface ModelCapabilities {
  /** 是否支持文生图/视频 */
  textToMedia: boolean
  /** 是否支持图生图 / 图片编辑 */
  imageEdit?: boolean
  /** 是否支持图生视频（首帧模式） */
  imageToVideo: boolean
  /** 是否支持多图参考（参考图模式） */
  multipleImages: boolean
  /** 是否支持视频编辑 */
  videoEdit: boolean
  /** 是否支持视频合并 */
  videoMerge: boolean
  /** 参考图最大数量限制 */
  maxReferenceImages?: number
}

/** 模型支持的配置参数 */
export interface ModelSupportedParams {
  /** 是否支持尺寸/分辨率配置 */
  size?: boolean
  /** 是否支持质量配置 */
  quality?: boolean
  /** 是否支持背景配置 */
  background?: boolean
  /** 是否支持输出格式 */
  outputFormat?: boolean
  /** 是否支持输出压缩率 */
  outputCompression?: boolean
  /** 是否支持图片数量 */
  imageCount?: boolean
  /** 是否支持视频时长 */
  duration?: boolean
  /** 是否支持宽高比 */
  aspectRatio?: boolean
  /** 是否支持提示词扩展 */
  promptExtend?: boolean
  /** 是否支持水印 */
  watermark?: boolean
  /** 是否支持参考图片 */
  referenceImages?: boolean
  /** 可直接选择的尺寸预设 */
  sizeOptions?: string[]
  /** 自定义尺寸允许的最大宽度 */
  maxWidth?: number
  /** 自定义尺寸允许的最大高度 */
  maxHeight?: number
  /** 是否只支持方形尺寸 */
  squareOnly?: boolean
}

/** 模型元信息 */
export interface ModelMetadata {
  /** 模型唯一标识 */
  id: string
  /** 显示名称 */
  displayName: string
  /** 模型类别 */
  category: ModelCategory
  /** 模型能力 */
  capabilities: ModelCapabilities
  /** 支持的配置参数 */
  supportedParams?: ModelSupportedParams
  /** 默认参数 */
  defaults: {
    /** 默认时长（秒，仅视频模型） */
    duration?: number
    /** 默认尺寸 */
    size?: string
    /** 默认质量 */
    quality?: string
    /** 默认宽高比 */
    aspectRatio?: string
    /** 默认提示词扩展 */
    promptExtend?: boolean
    /** 默认水印 */
    watermark?: boolean
  }
}

/** 视频参考媒体 */
export type VideoReferenceMedia = z.infer<typeof videoReferenceMediaSchema>

/** 图片生成请求参数（原始参数，前端 → agent） */
export type ImageGenerationParams = z.infer<typeof imageGenerationParamsSchema>

/** 视频生成请求参数（原始参数，前端 → agent） */
export type VideoGenerationParams = z.infer<typeof videoGenerationParamsSchema>

/** 网关 Payload（图片）—— builder 输出，对接 AI 网关 */
export interface ImageGatewayPayload {
  model: string
  prompt?: string
  size?: string
  n?: number
  image?: string[]
  quality?: string
  background?: string
  output_format?: string
  output_compression?: number
  /** Qwen 特有参数 */
  negative_prompt?: string
  prompt_extend?: boolean
  watermark?: boolean
  seed?: number
  /** Qwen 嵌套结构 */
  input?: {
    messages: Array<{
      role: string
      content: Array<{
        text?: string
        image?: string
      }>
    }>
  }
  parameters?: {
    size?: string
    n?: number
    negative_prompt?: string
    prompt_extend?: boolean
    watermark?: boolean
    seed?: number
  }
  /** OpenAI DALL-E 3 特有参数 */
  style?: 'vivid' | 'natural'
  response_format?: 'url' | 'b64_json'
  /** 索引签名：允许额外的字符串键 */
  [key: string]: unknown
}

/** 网关 Payload（视频）—— builder 输出，对接 AI 网关 */
export interface VideoGatewayPayload {
  model: string
  content?: Array<Record<string, unknown>>
  prompt?: string
  duration?: number
  seconds?: string
  size?: string
  image?: string
  images?: string[]
  input?: {
    prompt?: string
    img_url?: string
    video_urls?: string[]
    media?: VideoReferenceMedia[]
  }
  metadata?: Record<string, unknown> | string
  parameters?: Record<string, unknown>
  [key: string]: unknown
}

/** Payload 构建器函数 */
export type ImagePayloadBuilder = (
  params: ImageGenerationParams
) => ImageGatewayPayload

export type VideoPayloadBuilder = (
  params: VideoGenerationParams
) => VideoGatewayPayload

/** 模型注册配置 */
export interface ModelRegistration {
  metadata: ModelMetadata
  buildImagePayload?: ImagePayloadBuilder
  buildVideoPayload?: VideoPayloadBuilder
}
