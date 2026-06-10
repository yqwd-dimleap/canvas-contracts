import { z } from 'zod'

/**
 * 生成请求的「原始参数」schema —— 前端 → agent 的请求体。
 * 用 `.loose()` 容错：provider 特有字段由各自 builder 内部消化，
 * 不在请求 schema 强约束（不同模型提供商接口差异大）。
 */

/** 图片生成请求参数（原始参数） */
export const imageGenerationParamsSchema = z
  .object({
    prompt: z.string(),
    model: z.string().min(1),
    size: z.string().optional(),
    n: z.number().optional(),
    image: z.array(z.string()).optional(),
    quality: z.string().optional(),
    background: z.string().optional(),
    output_format: z.string().optional(),
    output_compression: z.number().optional(),
    /** Qwen: 反向提示词，描述不希望出现的内容 */
    negative_prompt: z.string().optional(),
    /** Qwen: 是否开启 Prompt 智能改写，默认 true */
    prompt_extend: z.boolean().optional(),
    /** Qwen: 是否添加水印，默认 false */
    watermark: z.boolean().optional(),
    /** Qwen: 随机数种子 [0, 2147483647] */
    seed: z.number().optional()
  })
  .loose()

/** 视频参考媒体 */
export const videoReferenceMediaSchema = z
  .object({
    type: z.enum([
      'reference_image',
      'reference_video',
      'first_frame',
      'last_frame',
      'reference_audio',
      'driving_audio',
      'audio',
      'video'
    ]),
    url: z.string(),
    reference_voice: z.string().optional(),
    image_url: z
      .union([z.string(), z.object({ url: z.string().optional() })])
      .optional(),
    role: z.string().optional()
  })
  .loose()

/** 视频生成请求参数（原始参数） */
export const videoGenerationParamsSchema = z
  .object({
    prompt: z.string(),
    model: z.string().min(1),
    duration: z.number().optional(),
    seconds: z.string().optional(),
    size: z.string().optional(),
    /** 单张图片 URL（i2v） */
    imgUrl: z.string().optional(),
    /** 多张参考图 URL（r2v） */
    mergeReferenceImageUrls: z.array(z.string()).optional(),
    /** 图片 / 视频等参考媒体（r2v） */
    referenceMedia: z.array(videoReferenceMediaSchema).optional(),
    /** 视频片段 URL（合并） */
    mergeClipUrls: z.array(z.string()).optional(),
    /** 视频宽高比 */
    mergeVideoAspectRatio: z.string().optional(),
    /** 视频编辑：源视频 URL */
    videoEditVideoUrl: z.string().optional(),
    /** 视频编辑：参考图片 */
    videoEditImages: z.array(z.string()).optional(),
    /** 图生视频：驱动音频 URL */
    drivingAudioUrl: z.string().optional(),
    /** 是否开启提示词扩展 */
    promptExtend: z.boolean().optional(),
    /** 是否添加水印 */
    watermark: z.boolean().optional(),
    /** 火山 Seedance: 官方 content[] 原始结构 */
    content: z.array(z.record(z.string(), z.unknown())).optional(),
    /** 火山 Seedance: 视频宽高比 */
    ratio: z.string().optional(),
    /** 火山 Seedance: 随机数种子 */
    seed: z.number().int().optional(),
    /** 火山 Seedance: 是否固定摄像头 */
    cameraFixed: z.boolean().optional(),
    camera_fixed: z.boolean().optional(),
    /** 火山 Seedance: 是否生成同步音频 */
    generateAudio: z.boolean().optional(),
    generate_audio: z.boolean().optional(),
    /** 火山 Seedance: 是否返回尾帧 */
    returnLastFrame: z.boolean().optional(),
    return_last_frame: z.boolean().optional(),
    /** 火山 Seedance: 回调地址 */
    callbackUrl: z.string().optional(),
    callback_url: z.string().optional(),
    /** 火山 Seedance: 任务超时阈值（秒） */
    executionExpiresAfter: z.number().int().optional(),
    execution_expires_after: z.number().int().optional(),
    /** 火山 Seedance: 执行优先级 */
    priority: z.number().int().optional(),
    /** 火山 Seedance: 终端用户唯一标识 */
    safetyIdentifier: z.string().optional(),
    safety_identifier: z.string().optional(),
    /** 火山 Seedance: 工具配置 */
    tools: z.array(z.record(z.string(), z.unknown())).optional()
  })
  .loose()
