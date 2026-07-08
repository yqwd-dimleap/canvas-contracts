export type GatewayPayloadConfig = {
  parameters: Record<string, unknown>
  omitParameters: string[]
}

export type ChatGatewayConfig = GatewayPayloadConfig

export type GenerationGatewayConfig = GatewayPayloadConfig & {
  endpoint?: string
  payloadProfile?: string
}

export const CHAT_GATEWAY_RESERVED_PAYLOAD_KEYS = [
  'model',
  'messages',
  'stream',
  'stream_options'
] as const

export const GENERATION_GATEWAY_RESERVED_PAYLOAD_KEYS = [
  'model',
  'prompt',
  'messages',
  'content',
  'input',
  'image',
  'images',
  'imgUrl',
  'mergeReferenceImageUrls',
  'referenceMedia',
  'videoEditVideoUrl',
  'drivingAudioUrl',
  'mergeClipUrls',
  'projectId'
] as const

export const CHAT_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW = {
  model: '<agent runtime model>',
  messages: '<system/user/assistant messages>',
  temperature: '<agent runtime temperature>',
  max_tokens: '<agent runtime maxTokens, when configured>',
  reasoning_effort: '<thinking mode, when enabled>',
  stream: '<true for streaming requests>',
  stream_options: {
    include_usage: true
  }
}

export const CHAT_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW_JSON = JSON.stringify(
  CHAT_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW,
  null,
  2
)

export const GENERATION_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW = {
  model: '<selected generation model>',
  prompt: '<node prompt>',
  duration: '<node duration, when configured>',
  size: '<node resolution, when configured>',
  imgUrl: '<first/reference image URL, when configured>',
  mergeReferenceImageUrls: '<reference image URLs, when configured>',
  referenceMedia: '<typed reference media, when configured>',
  mergeVideoAspectRatio: '<node aspect ratio, when configured>',
  watermark: '<node watermark setting, when configured>',
  projectId: '<workspace project id, when available>'
}

export const GENERATION_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW_JSON =
  JSON.stringify(GENERATION_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW, null, 2)

const CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET = new Set<string>(
  CHAT_GATEWAY_RESERVED_PAYLOAD_KEYS
)

const GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET = new Set<string>(
  GENERATION_GATEWAY_RESERVED_PAYLOAD_KEYS
)

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function cleanKeyList(
  values: string[],
  reservedKeys: ReadonlySet<string>
): string[] {
  const out: string[] = []
  for (const value of values) {
    const key = value.trim()
    if (!key || reservedKeys.has(key) || out.includes(key)) continue
    out.push(key)
  }
  return out
}

function cleanParameters(
  parameters: Record<string, unknown>,
  reservedKeys: ReadonlySet<string>
): {
  parameters: Record<string, unknown>
  ignoredParameterKeys: string[]
} {
  const clean: Record<string, unknown> = {}
  const ignoredParameterKeys: string[] = []
  for (const [key, value] of Object.entries(parameters)) {
    const normalizedKey = key.trim()
    if (!normalizedKey) continue
    if (reservedKeys.has(normalizedKey)) {
      ignoredParameterKeys.push(normalizedKey)
      continue
    }
    clean[normalizedKey] = value
  }
  return {
    parameters: clean,
    ignoredParameterKeys: Array.from(new Set(ignoredParameterKeys))
  }
}

export function mergePlainRecords(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    const baseValue = optionalRecord(next[key])
    const patchValue = optionalRecord(value)
    next[key] =
      baseValue && patchValue ? mergePlainRecords(baseValue, patchValue) : value
  }
  return next
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

export function readGatewayChatConfig(
  metadata: Record<string, unknown> | null | undefined
): ChatGatewayConfig {
  const gateway = record(metadata?.gateway)
  const chat = record(gateway.chat)
  const legacyParameters = cleanParameters(
    record(metadata?.chatParameters),
    CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET
  ).parameters
  const parameters = cleanParameters(
    {
      ...legacyParameters,
      ...record(chat.parameters)
    },
    CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET
  ).parameters
  return {
    parameters,
    omitParameters: cleanKeyList(
      [
        ...stringArray(chat.omitParameters),
        ...stringArray(metadata?.chatOmitParameters)
      ],
      CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    )
  }
}

export function readGenerationGatewayConfig(
  metadata: Record<string, unknown> | null | undefined
): GenerationGatewayConfig {
  const gateway = record(metadata?.gateway)
  const generation = record(gateway.generation)
  const endpoint =
    typeof generation.endpoint === 'string' && generation.endpoint.trim()
      ? generation.endpoint.trim()
      : undefined
  const legacyPayloadType =
    typeof generation.payloadType === 'string' ? generation.payloadType : ''
  const payloadProfileSource =
    typeof generation.payloadProfile === 'string'
      ? generation.payloadProfile
      : legacyPayloadType
  const payloadProfile = payloadProfileSource.trim()
    ? payloadProfileSource.trim()
    : undefined
  return {
    ...(endpoint ? { endpoint } : {}),
    ...(payloadProfile ? { payloadProfile } : {}),
    parameters: cleanParameters(
      record(generation.parameters),
      GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    ).parameters,
    omitParameters: cleanKeyList(
      stringArray(generation.omitParameters),
      GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    )
  }
}

export function applyGatewayPayloadConfig(
  payload: Record<string, unknown>,
  config: GatewayPayloadConfig,
  options: {
    reservedKeys?: readonly string[]
  } = {}
): Record<string, unknown> {
  const reservedKeys = new Set(options.reservedKeys ?? [])
  const parameters = cleanParameters(config.parameters, reservedKeys).parameters
  const next = mergePlainRecords(payload, parameters)
  for (const key of config.omitParameters) {
    const normalizedKey = key.trim()
    if (!normalizedKey || reservedKeys.has(normalizedKey)) continue
    delete next[normalizedKey]
  }
  return next
}

export function applyChatGatewayConfig(
  payload: Record<string, unknown>,
  config: ChatGatewayConfig
): Record<string, unknown> {
  return applyGatewayPayloadConfig(payload, config, {
    reservedKeys: CHAT_GATEWAY_RESERVED_PAYLOAD_KEYS
  })
}

export function applyGenerationGatewayConfig(
  payload: Record<string, unknown>,
  config: GenerationGatewayConfig
): Record<string, unknown> {
  return applyGatewayPayloadConfig(payload, config, {
    reservedKeys: GENERATION_GATEWAY_RESERVED_PAYLOAD_KEYS
  })
}

export function compactGenerationRecord(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    const compacted = compactValue(value)
    if (compacted !== undefined) next[key] = compacted
  }
  return next
}

function compactValue(value: unknown): unknown {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }
  if (Array.isArray(value)) {
    const compacted = value
      .map((item) => compactValue(item))
      .filter((item) => item !== undefined)
    return compacted.length > 0 ? compacted : undefined
  }
  const valueRecord = optionalRecord(value)
  if (valueRecord) {
    const compacted = compactGenerationRecord(valueRecord)
    return Object.keys(compacted).length > 0 ? compacted : undefined
  }
  return value
}

export type ConfiguredGenerationPayload = {
  payload: Record<string, unknown>
  config: GenerationGatewayConfig
}

export function buildConfiguredGenerationPayload(
  basePayload: Record<string, unknown>,
  metadata?: Record<string, unknown> | null
): ConfiguredGenerationPayload {
  const config = readGenerationGatewayConfig(metadata)
  return {
    payload: compactGenerationRecord(
      applyGenerationGatewayConfig(basePayload, config)
    ),
    config
  }
}

export function buildGatewayChatPayloadPreview(config: {
  parameters: Record<string, unknown>
  omitParameters: string[]
}): {
  payload: Record<string, unknown>
  ignoredParameterKeys: string[]
  ignoredOmitKeys: string[]
} {
  const cleaned = cleanParameters(
    config.parameters,
    CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET
  )
  const ignoredOmitKeys = stringArray(config.omitParameters).filter((key) =>
    CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET.has(key.trim())
  )
  const payload = applyChatGatewayConfig(
    cloneRecord(CHAT_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW),
    {
      parameters: cleaned.parameters,
      omitParameters: config.omitParameters
    }
  )
  return {
    payload,
    ignoredParameterKeys: cleaned.ignoredParameterKeys,
    ignoredOmitKeys: Array.from(new Set(ignoredOmitKeys))
  }
}

export function buildGenerationGatewayPayloadPreview(config: {
  basePayload?: Record<string, unknown>
  parameters: Record<string, unknown>
  omitParameters: string[]
}): {
  payload: Record<string, unknown>
  ignoredParameterKeys: string[]
  ignoredOmitKeys: string[]
} {
  const cleaned = cleanParameters(
    config.parameters,
    GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET
  )
  const ignoredOmitKeys = stringArray(config.omitParameters).filter((key) =>
    GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET.has(key.trim())
  )
  const payload = applyGenerationGatewayConfig(
    config.basePayload ??
      cloneRecord(GENERATION_GATEWAY_RUNTIME_BASE_PAYLOAD_PREVIEW),
    {
      parameters: cleaned.parameters,
      omitParameters: config.omitParameters
    }
  )
  return {
    payload,
    ignoredParameterKeys: cleaned.ignoredParameterKeys,
    ignoredOmitKeys: Array.from(new Set(ignoredOmitKeys))
  }
}

export function mergeGatewayChatConfig(
  metadata: Record<string, unknown> | null | undefined,
  config: {
    parameters?: Record<string, unknown>
    omitParameters?: string[]
  }
): Record<string, unknown> {
  const nextMetadata = { ...record(metadata) }
  const gateway = { ...record(nextMetadata.gateway) }
  const chat = { ...record(gateway.chat) }
  if (config.parameters) {
    chat.parameters = cleanParameters(
      config.parameters,
      CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    ).parameters
  }
  if (config.omitParameters) {
    chat.omitParameters = cleanKeyList(
      config.omitParameters,
      CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    )
  }
  gateway.chat = chat
  nextMetadata.gateway = gateway
  return nextMetadata
}

export function mergeGenerationGatewayConfig(
  metadata: Record<string, unknown> | null | undefined,
  config: {
    endpoint?: string
    payloadProfile?: string
    parameters?: Record<string, unknown>
    omitParameters?: string[]
  }
): Record<string, unknown> {
  const nextMetadata = { ...record(metadata) }
  const gateway = { ...record(nextMetadata.gateway) }
  const generation = { ...record(gateway.generation) }
  if (config.endpoint !== undefined) {
    const endpoint = config.endpoint.trim()
    if (endpoint) generation.endpoint = endpoint
    else delete generation.endpoint
  }
  if (config.payloadProfile !== undefined) {
    const payloadProfile = config.payloadProfile.trim()
    if (payloadProfile) generation.payloadProfile = payloadProfile
    else delete generation.payloadProfile
    delete generation.payloadType
  }
  if (config.parameters) {
    generation.parameters = cleanParameters(
      config.parameters,
      GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    ).parameters
  }
  if (config.omitParameters) {
    generation.omitParameters = cleanKeyList(
      config.omitParameters,
      GENERATION_GATEWAY_RESERVED_PAYLOAD_KEY_SET
    )
  }
  gateway.generation = generation
  nextMetadata.gateway = gateway
  return nextMetadata
}
