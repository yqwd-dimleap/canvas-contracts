export type ImgproxyResizeFit = 'fit' | 'fill' | 'fill-down' | 'force' | 'auto'

export type ImgproxySource =
  | {
      kind: 's3'
      bucket: string
      key: string
      url: string
    }
  | {
      kind: 'http'
      url: string
    }

export type ImgproxyImageOptions = {
  width?: number | null
  height?: number | null
  fit?: ImgproxyResizeFit
  format?: string | null
  quality?: number | null
  enlarge?: boolean | null
}

export type ImgproxyFitDimensions = {
  width: number
  height: number
}

/**
 * Common imgproxy derivative sizes for responsive images.
 */
export const IMGPROXY_THUMBNAIL_WIDTHS = [128, 320, 640, 1280, 2048] as const

export const IMGPROXY_DEFAULT_FORMAT = 'avif' as const
export const IMGPROXY_FALLBACK_FORMAT = 'webp' as const

export type ImgproxyParsedUrl = {
  signature: string
  path: string
  options: string[]
  encodedSource: string
  source: string | null
  format: string | null
}

function cleanString(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanPositiveInteger(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.trunc(value))
}

function cleanQuality(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(100, Math.max(1, Math.trunc(value)))
}

export function imgproxyFitDimensions(input: {
  width?: number | null
  height?: number | null
  maxEdge: number
}): ImgproxyFitDimensions {
  const maxEdge = cleanPositiveInteger(input.maxEdge)
  if (!maxEdge) return { width: 0, height: 0 }

  const sourceWidth = cleanPositiveInteger(input.width)
  const sourceHeight = cleanPositiveInteger(input.height)
  if (!sourceWidth || !sourceHeight) return { width: maxEdge, height: 0 }

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale))
  }
}

function cleanFormat(value: string | null | undefined): string {
  const format = cleanString(value).toLowerCase()
  return /^[a-z0-9]+$/.test(format) ? format : ''
}

function assertCleanStorageSegment(value: string, label: string): string {
  const cleaned = cleanString(value).replace(/^\/+|\/+$/g, '')
  if (!cleaned) throw new Error(`${label} is required`)
  if (
    cleaned.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`${label} contains an invalid path segment`)
  }
  return cleaned
}

export function imgproxyS3Source(input: {
  bucket: string
  key: string
}): ImgproxySource {
  const bucket = assertCleanStorageSegment(input.bucket, 'bucket')
  const key = assertCleanStorageSegment(input.key, 'key')
  return {
    kind: 's3',
    bucket,
    key,
    url: `s3://${bucket}/${key}`
  }
}

export function imgproxyHttpSource(url: string): ImgproxySource {
  const cleaned = cleanString(url)
  if (!cleaned) throw new Error('url is required')
  const parsed = new URL(cleaned)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('imgproxy HTTP source must use http or https')
  }
  return {
    kind: 'http',
    url: parsed.toString()
  }
}

export function imgproxyBase64Url(value: string): string {
  const source = cleanString(value)
  if (!source) throw new Error('imgproxy source is required')
  const bytes = new TextEncoder().encode(source)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function imgproxyDecodeBase64Url(value: string): string | null {
  const cleaned = cleanString(value)
  if (!cleaned) return null
  try {
    const padded = cleaned
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(cleaned.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

export function imgproxyProcessingOptions(
  options: ImgproxyImageOptions = {}
): string[] {
  const width = cleanPositiveInteger(options.width)
  const height = cleanPositiveInteger(options.height)
  const fit = options.fit ?? 'fit'
  const enlarge = options.enlarge ?? false
  const out: string[] = []

  if (width || height) {
    out.push(`rs:${fit}:${width}:${height}:${enlarge ? '1' : '0'}`)
  }

  const quality = cleanQuality(options.quality)
  if (quality) out.push(`q:${quality}`)

  return out
}

export function imgproxyUnsignedPath(
  source: ImgproxySource | string,
  options: ImgproxyImageOptions = {}
): string {
  const sourceUrl = typeof source === 'string' ? source : source.url
  const encodedSource = imgproxyBase64Url(sourceUrl)
  const format = cleanFormat(options.format)
  const processing = imgproxyProcessingOptions(options)
  const suffix = format ? `.${format}` : ''
  return `/${[...processing, `${encodedSource}${suffix}`].join('/')}`
}

export function imgproxyUrlWithSignature(input: {
  baseUrl: string
  signature: string
  path: string
}): string {
  const baseUrl = cleanString(input.baseUrl).replace(/\/+$/g, '')
  if (!baseUrl) throw new Error('imgproxy baseUrl is required')
  const signature = cleanString(input.signature)
  if (!signature) throw new Error('imgproxy signature is required')
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`
  return `${baseUrl}/${signature}${path}`
}

export function parseImgproxyUrl(raw: string): ImgproxyParsedUrl | null {
  const cleaned = cleanString(raw)
  if (!cleaned) return null

  let pathname: string
  try {
    pathname = new URL(cleaned).pathname
  } catch {
    pathname = cleaned
  }

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return null

  const [signature, ...pathSegments] = segments
  if (!signature) return null

  const sourceSegment = pathSegments[pathSegments.length - 1]
  if (!sourceSegment) return null

  const match = /^(?<encoded>[^.]+?)(?:\.(?<format>[a-z0-9]+))?$/i.exec(
    sourceSegment
  )
  if (!match?.groups?.encoded) return null

  const path = `/${pathSegments.join('/')}`
  const encodedSource = match.groups.encoded
  return {
    signature,
    path,
    options: pathSegments.slice(0, -1),
    encodedSource,
    source: imgproxyDecodeBase64Url(encodedSource),
    format: match.groups.format?.toLowerCase() ?? null
  }
}
