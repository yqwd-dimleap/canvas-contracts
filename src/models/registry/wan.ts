import type {
  ModelRegistration,
  VideoGatewayPayload,
  VideoGenerationParams
} from '../types.js'

/** 解析分辨率为 Wan 格式 */
function wanResolution(sizeArg?: string): string {
  const s = (sizeArg ?? '').toLowerCase()
  if (s.includes('1080')) return '1080P'
  if (s.includes('480')) return '480P'
  return '720P'
}

function wanReferenceImages(params: VideoGenerationParams): string[] {
  const urls = [
    ...(params.mergeReferenceImageUrls ?? []),
    ...(params.imgUrl ? [params.imgUrl] : [])
  ]
  return urls
    .map((url) => url.trim())
    .filter((url, index, all) => url && all.indexOf(url) === index)
}

function wanFirstFrameUrl(params: VideoGenerationParams): string | undefined {
  return (
    params.referenceMedia?.find(
      (item) => item.type === 'first_frame' || item.type === 'reference_image'
    )?.url ?? wanReferenceImages(params)[0]
  )
}

function wanPromptExtend(params: VideoGenerationParams): boolean {
  return params.promptExtend ?? true
}

function wanWatermark(params: VideoGenerationParams): boolean {
  return params.watermark ?? true
}

/** Wan 2.5 Text-to-Video Preview
 * 官方文档：https://help.aliyun.com/zh/model-studio/wan-image-generation-and-editing-api-reference
 */
export const wan25T2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.5-t2v-preview',
    displayName: 'Wan 2.5 T2V Preview',
    category: 'video',
    capabilities: {
      textToMedia: true,
      imageToVideo: false,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: false,
      promptExtend: false,
      watermark: false,
      referenceImages: false
    },
    defaults: {
      duration: 5,
      size: '720P'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    return {
      model: params.model,
      prompt: params.prompt,
      duration,
      size: params.size ?? '720P'
    }
  }
}

/** Wan 2.6 Text-to-Video */
export const wan26T2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.6-t2v',
    displayName: 'Wan 2.6 T2V',
    category: 'video',
    capabilities: {
      textToMedia: true,
      imageToVideo: false,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: true,
      watermark: true,
      referenceImages: false
    },
    defaults: {
      duration: 5,
      size: '720P',
      aspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const resolution = wanResolution(params.size)
    const aspect = params.mergeVideoAspectRatio ?? '16:9'

    return {
      model: params.model,
      input: {
        prompt: params.prompt
      },
      parameters: {
        resolution,
        ratio: aspect,
        duration,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}

/** Wan 2.6 Image-to-Video */
export const wan26I2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.6-i2v',
    displayName: 'Wan 2.6 I2V',
    category: 'video',
    capabilities: {
      textToMedia: false,
      imageToVideo: true,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: true,
      watermark: true,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720P',
      aspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const resolution = wanResolution(params.size)
    const firstFrameUrl = wanFirstFrameUrl(params)
    const media = [
      ...(firstFrameUrl
        ? [
            {
              type: 'first_frame' as const,
              url: firstFrameUrl
            }
          ]
        : []),
      ...(params.drivingAudioUrl
        ? [
            {
              type: 'driving_audio' as const,
              url: params.drivingAudioUrl
            }
          ]
        : [])
    ]

    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media
      },
      parameters: {
        resolution,
        ...(params.mergeVideoAspectRatio
          ? { ratio: params.mergeVideoAspectRatio }
          : {}),
        duration,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}

/** Wan 2.6 Reference-to-Video */
export const wan26R2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.6-r2v',
    displayName: 'Wan 2.6 R2V',
    category: 'video',
    capabilities: {
      textToMedia: false,
      imageToVideo: true,
      multipleImages: true,
      videoEdit: false,
      videoMerge: true,
      maxReferenceImages: 5
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: true,
      watermark: true,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720P',
      aspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const resolution = wanResolution(params.size)
    const aspect = params.mergeVideoAspectRatio ?? '16:9'
    const refImages = wanReferenceImages(params)
    const media =
      params.referenceMedia && params.referenceMedia.length > 0
        ? params.referenceMedia
        : refImages.map((url) => ({
            type: 'reference_image' as const,
            url
          }))

    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media
      },
      parameters: {
        resolution,
        ratio: aspect,
        duration,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}

/** Wan 2.7 Text-to-Video */
export const wan27T2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.7-t2v',
    displayName: 'Wan 2.7 T2V',
    category: 'video',
    capabilities: {
      textToMedia: true,
      imageToVideo: false,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: true,
      watermark: true,
      referenceImages: false
    },
    defaults: {
      duration: 10,
      size: '720P',
      aspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 10
    const resolution = wanResolution(params.size)
    const aspect = params.mergeVideoAspectRatio ?? '16:9'

    return {
      model: params.model,
      input: {
        prompt: params.prompt
      },
      parameters: {
        resolution,
        ratio: aspect,
        duration,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}

/** Wan 2.7 Image-to-Video */
export const wan27I2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.7-i2v',
    displayName: 'Wan 2.7 I2V',
    category: 'video',
    capabilities: {
      textToMedia: false,
      imageToVideo: true,
      multipleImages: false,
      videoEdit: false,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: true,
      watermark: true,
      referenceImages: true
    },
    defaults: {
      duration: 10,
      size: '720P',
      aspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 10
    const resolution = wanResolution(params.size)
    const firstFrameUrl = wanFirstFrameUrl(params)
    const media = [
      ...(firstFrameUrl
        ? [
            {
              type: 'first_frame' as const,
              url: firstFrameUrl
            }
          ]
        : []),
      ...(params.drivingAudioUrl
        ? [
            {
              type: 'driving_audio' as const,
              url: params.drivingAudioUrl
            }
          ]
        : [])
    ]

    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media
      },
      parameters: {
        resolution,
        ...(params.mergeVideoAspectRatio
          ? { ratio: params.mergeVideoAspectRatio }
          : {}),
        duration,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}

/** Wan 2.7 Reference-to-Video */
export const wan27R2VModel: ModelRegistration = {
  metadata: {
    id: 'wan2.7-r2v',
    displayName: 'Wan 2.7 R2V',
    category: 'video',
    capabilities: {
      textToMedia: false,
      imageToVideo: true,
      multipleImages: true,
      videoEdit: false,
      videoMerge: true,
      maxReferenceImages: 5
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: true,
      watermark: true,
      referenceImages: true
    },
    defaults: {
      duration: 10,
      size: '720P',
      aspectRatio: '16:9',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 10
    const resolution = wanResolution(params.size)
    const aspect = params.mergeVideoAspectRatio ?? '16:9'
    const refImages = wanReferenceImages(params)

    const media =
      params.referenceMedia && params.referenceMedia.length > 0
        ? params.referenceMedia
        : refImages.map((url) => ({
            type: 'reference_image' as const,
            url
          }))

    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media
      },
      parameters: {
        resolution,
        ratio: aspect,
        duration,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}

/** wan2.7-videoedit*/
export const wan27VideoEditVModel: ModelRegistration = {
  metadata: {
    id: 'wan2.7-videoedit',
    displayName: 'Wan 2.7 Video Edit',
    category: 'video',
    capabilities: {
      textToMedia: false,
      imageToVideo: false,
      multipleImages: false,
      videoEdit: true,
      videoMerge: false
    },
    supportedParams: {
      size: true,
      duration: false,
      aspectRatio: false,
      promptExtend: true,
      watermark: true,
      referenceImages: false
    },
    defaults: {
      size: '720P',
      promptExtend: true,
      watermark: true
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const resolution = wanResolution(params.size)
    const refVideo = params.videoEditVideoUrl ?? ''

    const media = {
      type: 'video' as const,
      url: refVideo
    }

    return {
      model: params.model,
      input: {
        media: [media],
        prompt: params.prompt
      },
      parameters: {
        resolution,
        prompt_extend: wanPromptExtend(params),
        watermark: wanWatermark(params)
      }
    }
  }
}
