import {
  buildGenerationPayloadFromConfig,
  canonicalizeGenerationParams,
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
 * configured metadata.payload template. Model parameters have one canonical
 * home under params; references and system metadata remain separate.
 */
export function normalizeImageGenerationParams(
  params: ImageGenerationParams
): ImageGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Image model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Image prompt is required.')

  const references = record(params.references)
  const runtimeParams = canonicalizeGenerationParams(
    'image',
    record(params.params)
  )

  return {
    model,
    prompt,
    params: compactGenerationRecord(runtimeParams),
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

  const runtimeParams = canonicalizeGenerationParams(
    'video',
    record(params.params)
  )
  const normalized = normalizeVideoGenerationReferenceParams({
    model,
    prompt,
    params: compactGenerationRecord(runtimeParams),
    references: record(params.references),
    system: normalizeSystem(params.system)
  })

  return normalized
}

export type ConfiguredVideoGenerationPayload = {
  runtime: VideoGenerationParams
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
    runtime: configured.runtime as VideoGenerationParams,
    payload: configured.payload,
    config: configured.config
  }
}

export type ConfiguredImageGenerationPayload = {
  runtime: ImageGenerationParams
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
    runtime: configured.runtime as ImageGenerationParams,
    payload: configured.payload,
    config: configured.config
  }
}
