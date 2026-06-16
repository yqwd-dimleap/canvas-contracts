/**
 * Video Model Endpoint Configuration
 *
 * 按 model 决定 AI 网关的视频合成路径。前端构建 endpoint 与 agent 转发共用。
 */

export const VIDEO_SYNTHESIS_ENDPOINT =
  '/api/v1/services/aigc/video-generation/video-synthesis'

export type VideoModelPayloadType =
  | 'standard'
  | 'wan-t2v'
  | 'wan-i2v'
  | 'happyhorse-i2v'
  | 'happyhorse-r2v'
  | 'wan-r2v'
  | 'wan27-i2v'
  | 'wan27-r2v'
  | 'seedance-content-task'
  | 'video-edit'

export interface VideoModelConfig {
  id?: string
  name?: string
  provider?: string
  pattern?: string | RegExp
  payloadType?: VideoModelPayloadType
  requiresImage?: boolean
  defaultDuration?: number
  maxDuration?: number
  supportedResolutions?: string[]
  isAsync?: boolean
  supportsMultipleImages?: boolean
  apiEndpoint?: string
}

const VIDEO_MODEL_CONFIGS: Record<string, VideoModelConfig> = {
  'kling-video': {
    id: 'kling-video',
    name: 'Kling Video',
    provider: 'kling',
    maxDuration: 10,
    supportedResolutions: ['720P', '1080P'],
    isAsync: true
  },
  'runway-gen2': {
    id: 'runway-gen2',
    name: 'Runway Gen-2',
    provider: 'runway',
    maxDuration: 4,
    supportedResolutions: ['720P'],
    isAsync: true
  }
}

const VIDEO_MODEL_PATTERN_CONFIGS: VideoModelConfig[] = [
  {
    pattern: /wan2\.[67].*t2v/i,
    payloadType: 'wan-t2v',
    requiresImage: false,
    defaultDuration: 10,
    supportsMultipleImages: false,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /wan2\.6.*r2v/i,
    payloadType: 'wan-r2v',
    requiresImage: true,
    defaultDuration: 5,
    supportsMultipleImages: true,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /wan2\.6.*i2v/i,
    payloadType: 'wan-i2v',
    requiresImage: true,
    defaultDuration: 5,
    supportsMultipleImages: false,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /seedance/i,
    payloadType: 'seedance-content-task',
    requiresImage: false,
    defaultDuration: 5,
    supportsMultipleImages: true,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /video-edit|video_edit|videoedit/i,
    payloadType: 'video-edit',
    requiresImage: false,
    defaultDuration: 5,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /happyhorse.*r2v/i,
    payloadType: 'happyhorse-r2v',
    requiresImage: true,
    defaultDuration: 5,
    supportsMultipleImages: true
  },
  {
    pattern: /happyhorse.*i2v/i,
    payloadType: 'happyhorse-i2v',
    requiresImage: true,
    defaultDuration: 5
  },
  {
    pattern: /wan2\.7.*r2v/i,
    payloadType: 'wan27-r2v',
    requiresImage: true,
    defaultDuration: 10,
    supportsMultipleImages: true,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /wan2\.7.*i2v/i,
    payloadType: 'wan27-i2v',
    requiresImage: true,
    defaultDuration: 10,
    supportsMultipleImages: false,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /wan.*r2v/i,
    payloadType: 'wan-r2v',
    requiresImage: true,
    defaultDuration: 5,
    apiEndpoint: VIDEO_SYNTHESIS_ENDPOINT
  },
  {
    pattern: /i2v|image-to-video|img2vid/i,
    payloadType: 'standard',
    requiresImage: true,
    defaultDuration: 5
  },
  {
    pattern: /.*/,
    payloadType: 'standard',
    requiresImage: false,
    defaultDuration: 5
  }
]

export function getVideoModelConfig(
  modelId: string
): VideoModelConfig | undefined {
  const exact = VIDEO_MODEL_CONFIGS[modelId]
  if (exact) return exact

  const normalized = modelId.toLowerCase().trim()
  for (const config of VIDEO_MODEL_PATTERN_CONFIGS) {
    const pattern = config.pattern
    if (typeof pattern === 'string') {
      if (normalized === pattern.toLowerCase()) return config
    } else if (pattern?.test(normalized)) {
      return config
    }
  }

  return VIDEO_MODEL_PATTERN_CONFIGS[VIDEO_MODEL_PATTERN_CONFIGS.length - 1]
}

export function getVideoModelApiEndpoint(modelId: string): string {
  return getVideoModelConfig(modelId)?.apiEndpoint ?? VIDEO_SYNTHESIS_ENDPOINT
}
