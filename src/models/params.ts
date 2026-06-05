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
      'driving_audio',
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
    watermark: z.boolean().optional()
  })
  .loose()
