/**
 * 模型分类（modelCategory）归一化 —— 单一真相源。
 *
 * 把网关模型 id + `/api/pricing` 元数据归类到 modelCategory
 * （image / video / chat / embedding / audio / other）。
 * 前后端共用本模块，避免各自维护启发式造成漂移。
 *
 * 依赖方向：agent 域 → models 域，仅复用 generation payload 配置判断。
 */

import { hasGenerationPayloadConfiguration } from '../models/generation-payload.js'
import { readGenerationPayloadConfig } from '../models/payload.js'
import {
  MODEL_CATEGORIES,
  type ModelCategory,
  type ModelReasoningEffort,
  modelReasoningEffortSchema
} from './model-provider.js'

/** 网关模型列表的归类桶。收敛到 {@link ModelCategory}（单一真相源）。 */
export type ModelCategoryId = ModelCategory

/** 分组展示时的稳定顺序（即枚举声明顺序）。 */
export const MODEL_CATEGORY_ORDER: ModelCategoryId[] = [...MODEL_CATEGORIES]

export type GatewayModelKindHints = {
  object?: string
  ownedBy?: string
  supportedEndpointTypes?: string[]
}

/** 管理员覆盖启发式分类时，写入 `AiModelRow.metadata` 的键。 */
export const AI_MODEL_KIND_METADATA_KEY = 'modelKind'

/** 网关导入时的上游快照（便于后台复核），存于 metadata 的键。 */
export const AI_MODEL_GATEWAY_HINTS_METADATA_KEY = 'gatewayHints'

/** 管理员声明该模型可安全接收哪些 reasoning_effort 档位。 */
export const AI_MODEL_REASONING_EFFORTS_METADATA_KEY = 'reasoningEfforts'

const VALID_CATEGORIES = new Set<string>(MODEL_CATEGORY_ORDER)
const VALID_REASONING_EFFORTS = new Set<string>(
  modelReasoningEffortSchema.options
)

/**
 * 按 id 与可选 hints 推断模型类别。
 */
export function categorizeGatewayModel(
  modelId: string,
  hints?: GatewayModelKindHints
): ModelCategoryId {
  const lower = modelId.toLowerCase()

  // hints 优先
  const endpointCategory = categoryFromSupportedEndpointTypes(
    hints?.supportedEndpointTypes
  )
  if (endpointCategory) return endpointCategory
  if (hintSuggestsVideo(hints)) return 'video'

  if (isVideoModelId(lower)) return 'video'
  if (isImageModelId(lower)) return 'image'
  if (isEmbeddingModelId(lower)) return 'embedding'
  if (isAudioModelId(lower)) return 'audio'
  if (isChatLikeModelId(lower)) return 'chat'

  return 'other'
}

function normalizeEndpointType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/\s]+/g, '-')
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  )
}

function endpointIncludes(endpoint: string, token: string): boolean {
  return endpoint === token || endpoint.includes(token)
}

export function categoryFromSupportedEndpointTypes(
  supportedEndpointTypes: readonly string[] | null | undefined
): ModelCategoryId | null {
  const endpoints = supportedEndpointTypes
    ?.map((item) => normalizeEndpointType(item))
    .filter(Boolean)
  if (!endpoints || endpoints.length === 0) return null

  if (
    endpoints.some(
      (endpoint) =>
        endpointIncludes(endpoint, 'video') ||
        endpointIncludes(endpoint, 'contents-generations')
    )
  ) {
    return 'video'
  }
  if (endpoints.some((endpoint) => endpointIncludes(endpoint, 'image'))) {
    return 'image'
  }
  if (
    endpoints.some(
      (endpoint) =>
        endpointIncludes(endpoint, 'audio') ||
        endpointIncludes(endpoint, 'music')
    )
  ) {
    return 'audio'
  }
  if (endpoints.some((endpoint) => endpointIncludes(endpoint, 'embedding'))) {
    return 'embedding'
  }
  if (
    endpoints.some((endpoint) =>
      ['chat', 'openai', 'anthropic', 'gemini'].includes(endpoint)
    )
  ) {
    return 'chat'
  }

  return null
}

function hintSuggestsVideo(hints: GatewayModelKindHints | undefined): boolean {
  if (!hints) return false
  const ob = (hints.object ?? '').toLowerCase()
  const own = (hints.ownedBy ?? '').toLowerCase()
  const hay = `${ob} ${own}`
  if (/\bvideo\b/.test(hay)) return true
  if (hay.includes('text-to-video') || hay.includes('image-to-video')) {
    return true
  }
  return false
}

function isImageModelId(lower: string): boolean {
  if (isVideoModelId(lower)) return false
  if (
    lower.includes('text-to-image') ||
    lower.includes('image-generation') ||
    lower.includes('image_generation') ||
    lower.includes('image-generator')
  ) {
    return true
  }
  if (lower.includes('image') && !lower.includes('text-embedding')) return true
  return false
}

function isVideoModelId(lower: string): boolean {
  return (
    lower.includes('i2v') ||
    lower.includes('r2v') ||
    lower.includes('t2v') ||
    lower.includes('text-to-video') ||
    lower.includes('image-to-video') ||
    lower.includes('img2vid') ||
    lower.includes('videoedit') ||
    lower.includes('video-edit') ||
    lower.includes('video_edit') ||
    /\bvideo\b/.test(lower)
  )
}

function isEmbeddingModelId(lower: string): boolean {
  return (
    lower.includes('embed') ||
    lower.includes('bge-') ||
    lower.startsWith('text-embedding') ||
    lower.includes('e5-') ||
    lower.includes('sentence-transformers')
  )
}

function isAudioModelId(lower: string): boolean {
  return (
    lower.includes('whisper') ||
    lower.includes('tts') ||
    lower.includes('speech') ||
    lower.includes('-audio') ||
    lower.endsWith('-audio') ||
    (lower.includes('voice') && !lower.includes('invoice'))
  )
}

function isChatLikeModelId(lower: string): boolean {
  return (
    lower.startsWith('gpt-') ||
    lower.startsWith('o1') ||
    lower.startsWith('o3') ||
    lower.startsWith('o4') ||
    lower.startsWith('claude') ||
    lower.includes('gemini') ||
    lower.includes('grok') ||
    lower.startsWith('qwen') ||
    lower.includes('llama') ||
    lower.includes('mistral') ||
    lower.includes('mixtral') ||
    lower.includes('deepseek') ||
    lower.includes('moonshot') ||
    lower.includes('chatglm') ||
    lower.includes('glm-') ||
    lower.includes('baichuan') ||
    lower.includes('yi-')
  )
}

/** 是否图片生成模型（按网关分类规则判断，不读取静态 registry）。 */
export function isImageGenerationModelId(modelId: string): boolean {
  return categorizeGatewayModel(modelId) === 'image'
}

/** 是否视频生成模型（按网关分类规则判断，不读取静态 registry）。 */
export function isVideoGenerationModelId(modelId: string): boolean {
  return categorizeGatewayModel(modelId) === 'video'
}

/** 是否图生视频（image-to-video）模型。 */
export function isImageToVideoModelId(modelId: string): boolean {
  const lower = modelId.toLowerCase()
  return (
    lower.includes('i2v') ||
    lower.includes('r2v') ||
    lower.includes('image-to-video') ||
    lower.includes('img2vid')
  )
}

/** 是否视频编辑模型。 */
export function isVideoEditModelId(modelId: string): boolean {
  const lower = modelId.toLowerCase()
  return (
    lower.includes('videoedit') ||
    lower.includes('video-edit') ||
    lower.includes('video_edit')
  )
}

/** 公开包装：无 hints 的纯 id 分类。 */
export function categorizeModelId(modelId: string): ModelCategoryId {
  return categorizeGatewayModel(modelId)
}

/** metadata 中存的覆盖值是否合法 modelCategory。 */
export function isStoredModelKind(value: unknown): value is ModelCategoryId {
  return typeof value === 'string' && VALID_CATEGORIES.has(value)
}

/** 从 metadata 读出网关 hints（object / ownedBy）。 */
export function readGatewayHintsFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): GatewayModelKindHints | undefined {
  const raw = metadata?.[AI_MODEL_GATEWAY_HINTS_METADATA_KEY]
  const supportedEndpointTypes =
    readSupportedEndpointTypesFromMetadata(metadata)
  if (!raw || typeof raw !== 'object') {
    return supportedEndpointTypes.length > 0
      ? { supportedEndpointTypes }
      : undefined
  }
  const o = raw as Record<string, unknown>
  return {
    object: typeof o.object === 'string' ? o.object : undefined,
    ownedBy: typeof o.ownedBy === 'string' ? o.ownedBy : undefined,
    supportedEndpointTypes
  }
}

export function readSupportedEndpointTypesFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  const gatewayHints = metadata?.[AI_MODEL_GATEWAY_HINTS_METADATA_KEY]
  const gatewayHintsRecord =
    gatewayHints &&
    typeof gatewayHints === 'object' &&
    !Array.isArray(gatewayHints)
      ? (gatewayHints as Record<string, unknown>)
      : undefined
  return Array.from(
    new Set(
      [
        ...readStringArray(metadata?.supportedEndpointTypes),
        ...readStringArray(gatewayHintsRecord?.supportedEndpointTypes)
      ]
        .map(normalizeEndpointType)
        .filter(Boolean)
    )
  )
}

export function modelSupportsEndpointType(
  metadata: Record<string, unknown> | null | undefined,
  endpointType: string
): boolean {
  const normalized = normalizeEndpointType(endpointType)
  if (!normalized) return false
  return readSupportedEndpointTypesFromMetadata(metadata).includes(normalized)
}

export function getConfiguredModelCategory(
  modelId: string,
  metadata: Record<string, unknown> | null | undefined,
  extraHints?: GatewayModelKindHints
): ModelCategoryId {
  return getEffectiveModelCategory(modelId, metadata, extraHints)
}

export function isConfiguredVideoGenerationModel(
  modelId: string,
  metadata?: Record<string, unknown> | null
): boolean {
  if (
    !hasGenerationPayloadConfiguration({
      mediaType: 'video',
      metadata
    })
  ) {
    return false
  }
  if (!hasExplicitModelCategoryMetadata(metadata)) return true
  return getConfiguredModelCategory(modelId, metadata) === 'video'
}

function hasExplicitModelCategoryMetadata(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return Boolean(
    metadata &&
      (isStoredModelKind(metadata[AI_MODEL_KIND_METADATA_KEY]) ||
        readSupportedEndpointTypesFromMetadata(metadata).length > 0)
  )
}

/** metadata.reasoningEfforts 中声明的可用 reasoning 档位。 */
export function readReasoningEffortsFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): ModelReasoningEffort[] {
  const raw = metadata?.[AI_MODEL_REASONING_EFFORTS_METADATA_KEY]
  if (!Array.isArray(raw)) return []
  return Array.from(
    new Set(
      raw.filter(
        (item): item is ModelReasoningEffort =>
          typeof item === 'string' && VALID_REASONING_EFFORTS.has(item)
      )
    )
  )
}

export function modelSupportsReasoningEffort(
  metadata: Record<string, unknown> | null | undefined,
  effort: ModelReasoningEffort
): boolean {
  return readReasoningEffortsFromMetadata(metadata).includes(effort)
}

/**
 * 生效的模型类别：管理员在 metadata.modelKind 的显式覆盖优先，
 * 否则用 metadata 里的网关 hints + id 启发式推断。
 */
export function getEffectiveModelCategory(
  modelId: string,
  metadata: Record<string, unknown> | null | undefined,
  extraHints?: GatewayModelKindHints
): ModelCategoryId {
  const payload = readGenerationPayloadConfig(metadata)
  if (
    payload?.mediaType === 'image' ||
    payload?.mediaType === 'video' ||
    payload?.mediaType === 'chat'
  ) {
    return payload.mediaType
  }
  const raw = metadata?.[AI_MODEL_KIND_METADATA_KEY]
  if (isStoredModelKind(raw)) return raw
  const fromMeta = readGatewayHintsFromMetadata(metadata)
  return categorizeGatewayModel(modelId, { ...fromMeta, ...extraHints })
}
