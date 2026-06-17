import type {
  ModelRegistration,
  VideoGatewayPayload,
  VideoGenerationParams
} from '../types.js'

/** 解析分辨率为 HappyHorse 格式 */
function happyHorseResolution(sizeArg?: string): string {
  const s = (sizeArg ?? '').toLowerCase()
  if (s.includes('1080')) return '1080P'
  if (s.includes('480')) return '480P'
  return '720P'
}

/** HappyHorse 1.0 Text-to-Video */
export const happyHorseT2VModel: ModelRegistration = {
  metadata: {
    id: 'happyhorse-1.0-t2v',
    displayName: 'HappyHorse 1.0 T2V',
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
      promptExtend: false,
      watermark: false,
      referenceImages: false
    },
    defaults: {
      duration: 5,
      size: '720P',
      aspectRatio: '16:9'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const resolution = happyHorseResolution(params.size)
    return {
      model: params.model,
      input: {
        prompt: params.prompt
      },
      parameters: {
        resolution,
        ratio: params.mergeVideoAspectRatio ?? '16:9',
        duration
      }
    }
  }
}

/** HappyHorse 1.0 Image-to-Video */
export const happyHorseI2VModel: ModelRegistration = {
  metadata: {
    id: 'happyhorse-1.0-i2v',
    displayName: 'HappyHorse 1.0 I2V',
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
      aspectRatio: false,
      promptExtend: false,
      watermark: false,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720P'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const resolution = happyHorseResolution(params.size)
    const imageUrl = params.imgUrl

    return {
      model: params.model,
      input: {
        prompt: params.prompt,
        media: imageUrl
          ? [
              {
                type: 'first_frame' as const,
                url: imageUrl
              }
            ]
          : []
      },
      parameters: {
        resolution,
        duration
      }
    }
  }
}

/** HappyHorse 1.0 Reference-to-Video (多图参考) */
export const happyHorseR2VModel: ModelRegistration = {
  metadata: {
    id: 'happyhorse-1.0-r2v',
    displayName: 'HappyHorse 1.0 R2V',
    category: 'video',
    capabilities: {
      textToMedia: false,
      imageToVideo: true,
      multipleImages: true,
      videoEdit: false,
      videoMerge: false,
      maxReferenceImages: 3
    },
    supportedParams: {
      size: true,
      duration: true,
      aspectRatio: true,
      promptExtend: false,
      watermark: false,
      referenceImages: true
    },
    defaults: {
      duration: 5,
      size: '720P',
      aspectRatio: '16:9'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const resolution = happyHorseResolution(params.size)
    const aspect = params.mergeVideoAspectRatio ?? '16:9'
    const refImages = params.mergeReferenceImageUrls ?? []

    const media =
      params.referenceMedia
        ?.filter((item) => item.type === 'reference_image' && item.url)
        .map((item) => ({
          type: 'reference_image' as const,
          url: item.url
        })) ??
      refImages.map((url) => ({
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
        duration
      }
    }
  }
}

export const happyHorseVideoEditVModel: ModelRegistration = {
  metadata: {
    id: 'happyhorse-1.0-video-edit',
    displayName: 'HappyHorse 1.0 Video Edit',
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
      duration: true,
      aspectRatio: false,
      promptExtend: false,
      watermark: false,
      referenceImages: true
    },
    defaults: {
      size: '720P',
      duration: 5
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const resolution = happyHorseResolution(params.size)
    const refImages = params.mergeReferenceImageUrls ?? []
    const refVideo = params.videoEditVideoUrl ?? ''
    const prompt = params.prompt ?? ''
    const duration = params.duration ?? 5

    const media = [
      {
        type: 'video' as const,
        url: refVideo
      },
      ...refImages.map((url) => ({
        type: 'reference_image' as const,
        url
      }))
    ]

    return {
      model: params.model,
      input: {
        prompt,
        media
      },
      parameters: {
        resolution,
        action: 'referenceGenerate',
        duration,
        watermark: false
      }
    }
  }
}
