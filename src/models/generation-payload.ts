import {
  buildGenerationPayloadFromConfig,
  compactGenerationRecord,
  type GenerationPayloadConfig,
  type GenerationPayloadMediaType,
  hasGenerationPayloadConfig,
  readGenerationPayloadConfig
} from './payload.js'
import type { ImageGenerationParams, VideoGenerationParams } from './types.js'
import { normalizeVideoGenerationReferenceParams } from './video-reference.js'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function trimmedString(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || undefined
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return value
}

function positiveInteger(value: unknown): number | undefined {
  const number = finiteNumber(value)
  if (number === undefined) return undefined
  const integer = Math.floor(number)
  return integer > 0 ? integer : undefined
}

function integer(value: unknown): number | undefined {
  const number = finiteNumber(value)
  return number === undefined ? undefined : Math.floor(number)
}

function normalizeStringArray(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) return undefined
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const url = trimmedString(value)
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out.length > 0 ? out : undefined
}

function normalizeSystem(value: unknown) {
  const raw = record(value)
  const projectId =
    typeof raw.projectId === 'string'
      ? trimmedString(raw.projectId)
      : raw.projectId === null
        ? null
        : undefined
  return compactGenerationRecord({
    ...(projectId !== undefined ? { projectId } : {}),
    canvasTarget: raw.canvasTarget
  })
}

/**
 * Normalize frontend -> agent image generation params before rendering the
 * configured metadata.payload template. The output is intentionally grouped:
 * provider-specific fields live under controls, not top-level runtime keys.
 */
export function normalizeImageGenerationParams(
  params: ImageGenerationParams
): ImageGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Image model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Image prompt is required.')

  const input = record(params.input)
  const references = record(params.references)
  const controls = compactGenerationRecord(record(params.controls))

  return {
    model,
    prompt,
    input: compactGenerationRecord({
      ...(trimmedString(input.size) ? { size: trimmedString(input.size) } : {}),
      ...(positiveInteger(input.n) ? { n: positiveInteger(input.n) } : {}),
      ...(trimmedString(input.quality)
        ? { quality: trimmedString(input.quality) }
        : {}),
      ...(trimmedString(input.background)
        ? { background: trimmedString(input.background) }
        : {}),
      ...(trimmedString(input.outputFormat)
        ? { outputFormat: trimmedString(input.outputFormat)?.toLowerCase() }
        : {}),
      ...(finiteNumber(input.outputCompression) !== undefined
        ? { outputCompression: finiteNumber(input.outputCompression) }
        : {}),
      ...(trimmedString(input.negativePrompt)
        ? { negativePrompt: trimmedString(input.negativePrompt) }
        : {}),
      ...(finiteNumber(input.seed) !== undefined
        ? { seed: finiteNumber(input.seed) }
        : {})
    }),
    controls,
    references: compactGenerationRecord({
      ...(normalizeStringArray(references.images)
        ? { images: normalizeStringArray(references.images) }
        : {}),
      ...(trimmedString(references.firstImage)
        ? { firstImage: trimmedString(references.firstImage) }
        : {})
    }),
    system: normalizeSystem(params.system)
  }
}

export function normalizeVideoGenerationParams(
  params: VideoGenerationParams
): VideoGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Video model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Video prompt is required.')

  const input = record(params.input)
  const controls = compactGenerationRecord(record(params.controls))
  const normalized = normalizeVideoGenerationReferenceParams({
    model,
    prompt,
    input: compactGenerationRecord({
      ...(finiteNumber(input.duration) !== undefined
        ? { duration: finiteNumber(input.duration) }
        : {}),
      ...(trimmedString(input.seconds)
        ? { seconds: trimmedString(input.seconds) }
        : {}),
      ...(trimmedString(input.resolution)
        ? { resolution: trimmedString(input.resolution) }
        : {}),
      ...(trimmedString(input.aspectRatio)
        ? { aspectRatio: trimmedString(input.aspectRatio) }
        : {}),
      ...(trimmedString(input.quality)
        ? { quality: trimmedString(input.quality) }
        : {}),
      ...(integer(input.seed) !== undefined
        ? { seed: integer(input.seed) }
        : {})
    }),
    controls,
    references: record(params.references),
    system: normalizeSystem(params.system)
  })

  return normalized
}

export type ConfiguredVideoGenerationPayload = {
  params: VideoGenerationParams
  payload: Record<string, unknown>
  config: GenerationPayloadConfig
}

export function hasGenerationPayloadConfiguration(input: {
  mediaType: GenerationPayloadMediaType
  metadata?: Record<string, unknown> | null
}): boolean {
  return hasGenerationPayloadConfig(input)
}

export function buildConfiguredVideoGenerationPayload(
  params: VideoGenerationParams,
  metadata?: Record<string, unknown> | null
): ConfiguredVideoGenerationPayload {
  const normalized = normalizeVideoGenerationParams(params)
  const payloadConfig = readGenerationPayloadConfig(metadata)
  if (payloadConfig?.mediaType !== 'video') {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const configured = buildGenerationPayloadFromConfig(payloadConfig, normalized)

  return {
    params: configured.params as VideoGenerationParams,
    payload: configured.payload,
    config: configured.config
  }
}

export type ConfiguredImageGenerationPayload = {
  params: ImageGenerationParams
  payload: Record<string, unknown>
  config: GenerationPayloadConfig
}

export function buildConfiguredImageGenerationPayload(
  params: ImageGenerationParams,
  metadata?: Record<string, unknown> | null
): ConfiguredImageGenerationPayload {
  const normalized = normalizeImageGenerationParams(params)
  const payloadConfig = readGenerationPayloadConfig(metadata)
  if (payloadConfig?.mediaType !== 'image') {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const configured = buildGenerationPayloadFromConfig(payloadConfig, normalized)

  return {
    params: configured.params as ImageGenerationParams,
    payload: configured.payload,
    config: configured.config
  }
}
