import type {
  ModelRegistration,
  VideoGatewayPayload,
  VideoGenerationParams
} from '../types.js'

/** Kling V2.1 Master */
export const klingV21Model: ModelRegistration = {
  metadata: {
    id: 'kling-v2-1-master',
    displayName: 'Kling V2.1 Master',
    category: 'video',
    capabilities: {
      textToMedia: true,
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
      size: '720p'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const payload: VideoGatewayPayload = {
      model: params.model,
      prompt: params.prompt
    }

    if (duration) payload.duration = duration
    if (params.size) payload.size = params.size

    if (params.imgUrl) {
      payload.input = { img_url: params.imgUrl }
      payload.image = params.imgUrl
    }

    return payload
  }
}

/** Runway Gen3 Alpha Turbo */
export const runwayGen3Model: ModelRegistration = {
  metadata: {
    id: 'runway-gen3-alpha-turbo',
    displayName: 'Runway Gen3 Alpha Turbo',
    category: 'video',
    capabilities: {
      textToMedia: true,
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
      size: '720p'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const payload: VideoGatewayPayload = {
      model: params.model,
      prompt: params.prompt
    }

    if (duration) payload.duration = duration
    if (params.size) payload.size = params.size

    if (params.imgUrl) {
      payload.input = { img_url: params.imgUrl }
      payload.image = params.imgUrl
    }

    return payload
  }
}

/** Doubao Seedance 2.0 */
export const doubaoSeedanceModel: ModelRegistration = {
  metadata: {
    id: 'doubao-seedance-2-0-260128',
    displayName: 'Doubao Seedance 2.0',
    category: 'video',
    capabilities: {
      textToMedia: true,
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
      size: '720p'
    }
  },
  buildVideoPayload: (params: VideoGenerationParams): VideoGatewayPayload => {
    const duration = params.duration ?? 5
    const payload: VideoGatewayPayload = {
      model: params.model,
      prompt: params.prompt
    }

    if (duration) payload.duration = duration
    if (params.size) payload.size = params.size

    if (params.imgUrl) {
      payload.input = { img_url: params.imgUrl }
      payload.image = params.imgUrl
    }

    return payload
  }
}
