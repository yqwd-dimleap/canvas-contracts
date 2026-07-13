export type GatewayPayloadConfig = {
  parameters: Record<string, unknown>
  omitParameters: string[]
}

export type ChatGatewayConfig = GatewayPayloadConfig

export const CHAT_GATEWAY_RESERVED_PAYLOAD_KEYS = [
  'model',
  'messages',
  'stream',
  'stream_options'
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

const CHAT_GATEWAY_RESERVED_PAYLOAD_KEY_SET = new Set<string>(
  CHAT_GATEWAY_RESERVED_PAYLOAD_KEYS
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
