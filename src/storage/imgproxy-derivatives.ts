import {
  IMGPROXY_DEFAULT_FORMAT,
  IMGPROXY_THUMBNAIL_WIDTHS,
  type ImgproxySource,
  imgproxyUnsignedPath,
  imgproxyUrlWithSignature
} from './imgproxy.js'
import type { WorkspaceImageDerivatives } from './workspace-assets.js'
import {
  WORKSPACE_MODEL_REFERENCE_FORMAT,
  WORKSPACE_MODEL_REFERENCE_QUALITY,
  WORKSPACE_MODEL_REFERENCE_WIDTH
} from './workspace-assets.js'

/**
 * imgproxy 签名函数类型
 * 由运行时环境提供（需要密钥）
 */
export type ImgproxySignFn = (path: string) => Promise<string> | string

/**
 * 根据原图宽高比计算目标宽度下的高度
 */
export function calculateHeightFromWidth(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): number {
  if (originalWidth <= 0 || originalHeight <= 0) return 0
  const aspectRatio = originalHeight / originalWidth
  return Math.round(targetWidth * aspectRatio)
}

/**
 * 根据原图宽高比计算目标高度下的宽度
 */
export function calculateWidthFromHeight(
  originalWidth: number,
  originalHeight: number,
  targetHeight: number
): number {
  if (originalWidth <= 0 || originalHeight <= 0) return 0
  const aspectRatio = originalWidth / originalHeight
  return Math.round(targetHeight * aspectRatio)
}

/**
 * 计算 fit 模式下的实际尺寸（保持宽高比，不超过最大宽高）
 */
export function calculateFitSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } {
  if (originalWidth <= 0 || originalHeight <= 0) {
    return { width: 0, height: 0 }
  }

  const effectiveMaxHeight = maxHeight ?? maxWidth
  const aspectRatio = originalWidth / originalHeight

  // 如果原图比目标小，不放大
  if (originalWidth <= maxWidth && originalHeight <= effectiveMaxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  // 根据宽高比计算
  if (aspectRatio > maxWidth / effectiveMaxHeight) {
    // 宽图，以宽度为准
    return {
      width: maxWidth,
      height: calculateHeightFromWidth(originalWidth, originalHeight, maxWidth)
    }
  } else {
    // 高图，以高度为准
    return {
      width: calculateWidthFromHeight(
        originalWidth,
        originalHeight,
        effectiveMaxHeight
      ),
      height: effectiveMaxHeight
    }
  }
}

function generateImgproxyDerivativePaths(input: {
  source: ImgproxySource
  originalWidth?: number | null
  originalHeight?: number | null
  previewMaxWidth?: number
  thumbnailMaxWidth?: number
  format?: string
  quality?: number
}): {
  originalPath: string
  previewPath: string
  thumbPath: string
  thumbnailPaths: Record<(typeof IMGPROXY_THUMBNAIL_WIDTHS)[number], string>
  modelReferencePath: string
  previewSize: { width: number; height: number }
  thumbnailSize: { width: number; height: number }
  modelReferenceSize: { width: number; height: number }
} {
  const format = input.format || IMGPROXY_DEFAULT_FORMAT
  const quality = input.quality || 80

  const previewMaxWidth = input.previewMaxWidth || 1200
  const thumbnailMaxWidth = input.thumbnailMaxWidth || 400
  const originalWidth =
    typeof input.originalWidth === 'number' &&
    Number.isFinite(input.originalWidth)
      ? input.originalWidth
      : 0
  const originalHeight =
    typeof input.originalHeight === 'number' &&
    Number.isFinite(input.originalHeight)
      ? input.originalHeight
      : 0

  const previewSize = calculateFitSize(
    originalWidth,
    originalHeight,
    previewMaxWidth
  )
  const thumbnailSize = calculateFitSize(
    originalWidth,
    originalHeight,
    thumbnailMaxWidth
  )
  const modelReferenceSize = calculateFitSize(
    originalWidth,
    originalHeight,
    WORKSPACE_MODEL_REFERENCE_WIDTH
  )

  const originalPath = imgproxyUnsignedPath(input.source, {
    format,
    quality
  })
  const previewPath = imgproxyUnsignedPath(input.source, {
    width: previewSize.width,
    height: previewSize.height,
    format,
    quality
  })
  const thumbPath = imgproxyUnsignedPath(input.source, {
    width: thumbnailSize.width,
    height: thumbnailSize.height,
    format,
    quality
  })
  const modelReferencePath = imgproxyUnsignedPath(input.source, {
    width: modelReferenceSize.width,
    height: modelReferenceSize.height,
    format: WORKSPACE_MODEL_REFERENCE_FORMAT,
    quality: WORKSPACE_MODEL_REFERENCE_QUALITY
  })

  const thumbnailPaths = {} as Record<
    (typeof IMGPROXY_THUMBNAIL_WIDTHS)[number],
    string
  >
  for (const width of IMGPROXY_THUMBNAIL_WIDTHS) {
    const size = calculateFitSize(originalWidth, originalHeight, width)
    thumbnailPaths[width] = imgproxyUnsignedPath(input.source, {
      width: size.width,
      height: size.height,
      format,
      quality
    })
  }

  return {
    originalPath,
    previewPath,
    thumbPath,
    thumbnailPaths,
    modelReferencePath,
    previewSize,
    thumbnailSize,
    modelReferenceSize
  }
}

/**
 * 生成 imgproxy 衍生图 URL（无签名）
 */
export function generateImgproxyDerivativeUrls(input: {
  source: ImgproxySource
  originalWidth?: number | null
  originalHeight?: number | null
  baseUrl: string
  previewMaxWidth?: number
  thumbnailMaxWidth?: number
  format?: string
  quality?: number
}): {
  original: string
  preview: string
  thumb: string
  thumbnails: Record<(typeof IMGPROXY_THUMBNAIL_WIDTHS)[number], string>
  modelReference: string
  previewSize: { width: number; height: number }
  thumbnailSize: { width: number; height: number }
  modelReferenceSize: { width: number; height: number }
} {
  const baseUrl = input.baseUrl.replace(/\/+$/, '')
  const paths = generateImgproxyDerivativePaths(input)

  // 响应式缩略图（不同宽度）
  const thumbnails = {} as Record<
    (typeof IMGPROXY_THUMBNAIL_WIDTHS)[number],
    string
  >
  for (const width of IMGPROXY_THUMBNAIL_WIDTHS) {
    thumbnails[width] = `${baseUrl}${paths.thumbnailPaths[width]}`
  }

  return {
    original: `${baseUrl}${paths.originalPath}`,
    preview: `${baseUrl}${paths.previewPath}`,
    thumb: `${baseUrl}${paths.thumbPath}`,
    thumbnails,
    modelReference: `${baseUrl}${paths.modelReferencePath}`,
    previewSize: paths.previewSize,
    thumbnailSize: paths.thumbnailSize,
    modelReferenceSize: paths.modelReferenceSize
  }
}

/**
 * 生成带签名的 imgproxy 衍生图 URL
 */
export async function generateSignedImgproxyDerivatives(input: {
  source: ImgproxySource
  originalWidth?: number | null
  originalHeight?: number | null
  baseUrl: string
  signFn: ImgproxySignFn
  previewMaxWidth?: number
  thumbnailMaxWidth?: number
  format?: string
  quality?: number
}): Promise<{
  derivatives: WorkspaceImageDerivatives
  modelReference: { url: string; width: number; height: number }
  preview: { width: number; height: number }
  thumbnail: { width: number; height: number }
}> {
  const paths = generateImgproxyDerivativePaths(input)
  const baseUrl = input.baseUrl.replace(/\/+$/, '')

  async function signPath(path: string): Promise<string> {
    const signature = await input.signFn(path)
    return imgproxyUrlWithSignature({
      baseUrl,
      signature,
      path
    })
  }

  const [
    original,
    preview,
    thumb,
    modelReference,
    w128,
    w320,
    w640,
    w1280,
    w2048
  ] = await Promise.all([
    signPath(paths.originalPath),
    signPath(paths.previewPath),
    signPath(paths.thumbPath),
    signPath(paths.modelReferencePath),
    signPath(paths.thumbnailPaths[128]),
    signPath(paths.thumbnailPaths[320]),
    signPath(paths.thumbnailPaths[640]),
    signPath(paths.thumbnailPaths[1280]),
    signPath(paths.thumbnailPaths[2048])
  ])

  return {
    derivatives: {
      original,
      preview,
      thumb,
      thumbnails: { w128, w320, w640, w1280, w2048 }
    },
    modelReference: {
      url: modelReference,
      width: paths.modelReferenceSize.width,
      height: paths.modelReferenceSize.height
    },
    preview: paths.previewSize,
    thumbnail: paths.thumbnailSize
  }
}
