import {
  generationReferencesSchema,
  mergeGenerationReferences
} from './params.js'
import {
  buildGenerationPayloadFromConfig,
  compactGenerationRecord,
  type GenerationPayloadConfig,
  type GenerationPayloadMediaType,
  type GenerationPayloadServerContext,
  hasGenerationPayloadConfig,
  readGenerationPayloadConfig
} from './payload.js'
import type {
  ChatGenerationParams,
  ImageGenerationParams,
  VideoGenerationParams
} from './types.js'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function trimmedString(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || undefined
}

function normalizeReferences(value: unknown) {
  const parsed = generationReferencesSchema.parse(value ?? { items: [] })
  return mergeGenerationReferences(parsed.items)
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
 * configured metadata.payload template. Params keys are preserved verbatim;
 * key mapping is the body template's responsibility.
 */
export function normalizeImageGenerationParams(
  params: ImageGenerationParams
): ImageGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Image model is required.')

  const prompt = trimmedString(params.prompt)
  if (!prompt) throw new Error('Image prompt is required.')

  return {
    model,
    prompt,
    params: compactGenerationRecord(record(params.params)),
    references: normalizeReferences(params.references),
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

  return {
    model,
    prompt,
    params: compactGenerationRecord(record(params.params)),
    references: normalizeReferences(params.references),
    system: normalizeSystem(params.system)
  }
}

export function normalizeChatGenerationParams(
  params: ChatGenerationParams
): ChatGenerationParams {
  const model = trimmedString(params.model)
  if (!model) throw new Error('Chat model is required.')

  const messages = Array.isArray(params.messages) ? params.messages : []

  return {
    model,
    prompt: trimmedString(params.prompt) ?? '',
    messages,
    params: compactGenerationRecord(record(params.params)),
    references: normalizeReferences(params.references),
    system: normalizeSystem(params.system)
  }
}

export type ConfiguredVideoGenerationPayload = {
  runtime: VideoGenerationParams
  payload: Record<string, unknown>
  config: GenerationPayloadConfig
}

export type GenerationPayloadBuildOptions = {
  server?: GenerationPayloadServerContext
}

export function hasGenerationPayloadConfiguration(input: {
  mediaType: GenerationPayloadMediaType
  metadata?: Record<string, unknown> | null
}): boolean {
  return hasGenerationPayloadConfig(input)
}

export function buildConfiguredVideoGenerationPayload(
  params: VideoGenerationParams,
  metadata?: Record<string, unknown> | null,
  options?: GenerationPayloadBuildOptions
): ConfiguredVideoGenerationPayload {
  const normalized = normalizeVideoGenerationParams(params)
  const payloadConfig = readGenerationPayloadConfig(metadata)
  if (payloadConfig?.mediaType !== 'video') {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const configured = buildGenerationPayloadFromConfig(
    payloadConfig,
    normalized,
    options
  )

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
  metadata?: Record<string, unknown> | null,
  options?: GenerationPayloadBuildOptions
): ConfiguredImageGenerationPayload {
  const normalized = normalizeImageGenerationParams(params)
  const payloadConfig = readGenerationPayloadConfig(metadata)
  if (payloadConfig?.mediaType !== 'image') {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const configured = buildGenerationPayloadFromConfig(
    payloadConfig,
    normalized,
    options
  )

  return {
    runtime: configured.runtime as ImageGenerationParams,
    payload: configured.payload,
    config: configured.config
  }
}

export type ConfiguredChatGenerationPayload = {
  runtime: ChatGenerationParams
  payload: Record<string, unknown>
  config: GenerationPayloadConfig
  endpoint: string
}

export function buildConfiguredChatGenerationPayload(
  params: ChatGenerationParams,
  metadata?: Record<string, unknown> | null,
  options?: GenerationPayloadBuildOptions
): ConfiguredChatGenerationPayload {
  const normalized = normalizeChatGenerationParams(params)
  const payloadConfig = readGenerationPayloadConfig(metadata)
  if (
    payloadConfig?.mediaType !== 'chat' &&
    payloadConfig?.mediaType !== 'lyrics'
  ) {
    throw new Error(
      `Generation payload is not configured for model ${normalized.model}.`
    )
  }
  const configured = buildGenerationPayloadFromConfig(
    payloadConfig,
    normalized,
    options
  )

  return {
    runtime: configured.runtime as ChatGenerationParams,
    payload: configured.payload,
    config: configured.config,
    endpoint: configured.config.endpoint
  }
}
