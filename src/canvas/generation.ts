import { z } from 'zod'

export const presetSizeOptionSchema = z.enum([
  'auto',
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '2048x2048',
  '2048x1152',
  '3840x2160',
  '2160x3840'
])

export const sizeInputModeSchema = z.enum(['preset', 'custom'])

export const imageGenerationModelSchema = z.enum([
  'gpt-image-2',
  'gpt-image-2-flatfee',
  'gpt-image-2-vip',
  'qwen-image-2.0',
  'qwen-image-2.0-pro',
  'nano-banana-2',
  'wan2.5-t2v-preview',
  'wan2.6-i2v',
  'wan2.6-r2v',
  'wan2.7-i2v',
  'wan2.7-r2v',
  'happyhorse-1.0-i2v',
  'happyhorse-1.0-r2v',
  'happyhorse-1.0-t2v',
  'kling-v2-1-master',
  'runway-gen3-alpha-turbo'
])

export const imageQualitySchema = z.enum(['auto', 'high', 'medium', 'low'])
export const imageBackgroundSchema = z.enum(['auto', 'opaque', 'transparent'])
export const outputFormatSchema = z.enum([
  'png',
  'jpeg',
  'webp',
  'gif',
  'mp4',
  'webm'
])
export const imageTransportModeSchema = z.enum(['base64', 'url'])

export const base64ImageSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  dataUrl: z.string(),
  size: z.number(),
  assetId: z.string().nullable().optional()
})

export const urlImageSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string()
})

export const completionInputImageSchema = z.object({
  source: imageTransportModeSchema,
  value: z.string()
})

export const canvasNodeGenerationConfigSchema = z.object({
  model: imageGenerationModelSchema,
  quality: imageQualitySchema,
  background: imageBackgroundSchema,
  outputFormat: outputFormatSchema,
  outputCompression: z.number(),
  imageCount: z.number(),
  sizeInputMode: sizeInputModeSchema,
  customSize: z.string(),
  presetSize: presetSizeOptionSchema,
  imageTransportMode: imageTransportModeSchema,
  uploadedImages: z.array(base64ImageSourceSchema),
  urlImages: z.array(urlImageSourceSchema),
  pendingUrl: z.string(),
  videoDurationSeconds: z.number().optional(),
  videoResolution: z.string().optional(),
  videoAspectRatio: z.string().optional(),
  promptExtend: z.boolean().optional(),
  watermark: z.boolean().optional()
})

export const imageGenerationRequestPayloadSchema = z.object({
  model: imageGenerationModelSchema,
  prompt: z.string(),
  size: z.string().optional(),
  n: z.number().optional(),
  image: z.array(z.string()).optional(),
  quality: imageQualitySchema.optional(),
  background: imageBackgroundSchema.optional(),
  output_format: outputFormatSchema.optional(),
  output_compression: z.number().optional()
})

export const videoGenerationRequestPayloadSchema = z
  .object({
    model: z.string(),
    prompt: z.string().optional(),
    duration: z.number().optional(),
    seconds: z.string().optional(),
    size: z.string().optional(),
    image: z.string().optional(),
    images: z.array(z.string()).optional(),
    input: z
      .object({
        prompt: z.string().optional(),
        img_url: z.string().optional(),
        video_urls: z.array(z.string()).optional(),
        media: z
          .array(
            z.object({
              type: z.string().optional(),
              url: z.string().optional(),
              image_url: z
                .union([z.string(), z.object({ url: z.string().optional() })])
                .optional(),
              role: z.string().optional()
            })
          )
          .optional()
      })
      .optional(),
    metadata: z
      .union([z.record(z.string(), z.unknown()), z.string()])
      .optional(),
    parameters: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown())

export type PresetSizeOption = z.infer<typeof presetSizeOptionSchema>
export type SizeInputMode = z.infer<typeof sizeInputModeSchema>
export type ImageGenerationModel = z.infer<typeof imageGenerationModelSchema>
export type ImageQuality = z.infer<typeof imageQualitySchema>
export type ImageBackground = z.infer<typeof imageBackgroundSchema>
export type OutputFormat = z.infer<typeof outputFormatSchema>
export type ImageTransportMode = z.infer<typeof imageTransportModeSchema>
export type Base64ImageSource = z.infer<typeof base64ImageSourceSchema>
export type UrlImageSource = z.infer<typeof urlImageSourceSchema>
export type CompletionInputImage = z.infer<typeof completionInputImageSchema>
export type CanvasNodeGenerationConfig = z.infer<
  typeof canvasNodeGenerationConfigSchema
>
export type ImageGenerationRequestPayload = z.infer<
  typeof imageGenerationRequestPayloadSchema
>
export type VideoGenerationRequestPayload = z.infer<
  typeof videoGenerationRequestPayloadSchema
>
