import { z } from 'zod'

export const generationPayloadMediaTypeSchema = z.enum([
  'image',
  'video',
  'chat'
])

/**
 * Control 类型。参数键名映射完全交给 request.body 模板，这里只描述控件的
 * 值类型与校验，不再隐式规范化键名。
 * - text/number/boolean/select：标量。
 * - stringList：字符串数组（如参考图 URL 列表、clips）。
 * - json：任意 JSON 值（承载 messages[]、content[] 等结构化数组）。
 * - referenceImages：运行时参考图上传开关（值来自 references，不进 params）。
 */
export const generationPayloadControlTypeSchema = z.enum([
  'text',
  'number',
  'boolean',
  'select',
  'stringList',
  'json',
  'referenceImages'
])

/**
 * 呈现提示：仅影响运行时控件的 UI 形态，不改变值语义。
 * 例如 select + ui:'size' 渲染为尺寸网格，select + ui:'segment' 渲染为分段选择。
 */
export const generationPayloadControlUiSchema = z.enum([
  'default',
  'size',
  'segment',
  'grid'
])

export const generationPayloadControlSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().optional(),
    type: generationPayloadControlTypeSchema.default('text'),
    ui: generationPayloadControlUiSchema.optional(),
    enabled: z.boolean().default(true),
    required: z.boolean().default(false),
    defaultValue: z.unknown().optional(),
    options: z
      .array(z.union([z.string(), z.number(), z.boolean()]))
      .default([]),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional()
  })
  .strict()

export const generationPayloadRequestEncodingSchema = z.enum([
  'json',
  'multipart'
])

export const generationPayloadRequestSchema = z
  .object({
    body: z.record(z.string(), z.unknown()).default({}),
    omitEmpty: z.boolean().default(true),
    /**
     * 带参考图（图生图/编辑）请求的上游传输编码：multipart 走 form-data 并把
     * 参考图作为文件字节上传（OpenAI /images/edits 风格）；json 则参考图 URL 已
     * 由 body 模板承载。纯文生图/文生视频始终走 JSON，不受此项影响。
     */
    encoding: generationPayloadRequestEncodingSchema.default('json'),
    /** 附加请求头（如异步网关的 X-DashScope-Async）。全部为字符串。 */
    headers: z.record(z.string(), z.string()).default({}),
    /**
     * 存在参考图时使用的端点覆盖（图生图）。为空则始终用顶层 endpoint。
     * 替代此前硬编码的 /v1/images/edits。
     */
    referenceEndpoint: z.string().trim().min(1).optional(),
    /** multipart 编码时承载参考图文件的字段名，默认 image。 */
    multipartImageField: z.string().trim().min(1).default('image')
  })
  .strict()

/**
 * 定价维度到 control 键的绑定。解开定价与已删除的 canonical KEY_MAP 的耦合：
 * 计费从 params 里按这里声明的键取值，而非写死 size/quality/duration 等。
 * 未声明的维度回退到与维度同名的键，保持默认模板的直觉行为。
 */
export const generationPayloadPricingBindingsSchema = z
  .object({
    count: z.string().min(1).optional(),
    size: z.string().min(1).optional(),
    quality: z.string().min(1).optional(),
    duration: z.string().min(1).optional(),
    resolution: z.string().min(1).optional(),
    aspectRatio: z.string().min(1).optional()
  })
  .strict()
  .default({})

export const generationPayloadConfigSchema = z
  .object({
    mediaType: generationPayloadMediaTypeSchema,
    endpoint: z.string().trim().min(1),
    controls: z.array(generationPayloadControlSchema).default([]),
    request: generationPayloadRequestSchema.default({
      body: {},
      omitEmpty: true,
      encoding: 'json',
      headers: {},
      multipartImageField: 'image'
    }),
    pricingBindings: generationPayloadPricingBindingsSchema
  })
  .strict()
  .superRefine((config, context) => {
    if (config.mediaType !== 'image' && config.mediaType !== 'video') return
    for (const field of ['model', 'prompt'] as const) {
      if (typeof config.request.body[field] === 'string') continue
      context.addIssue({
        code: 'custom',
        path: ['request', 'body', field],
        message: `OpenAI-compatible ${config.mediaType} payload requires top-level ${field}.`
      })
    }
  })

export const generationPayloadConfigJsonSchema = z.toJSONSchema(
  generationPayloadConfigSchema
)

export type GenerationPayloadMediaType = z.infer<
  typeof generationPayloadMediaTypeSchema
>
export type GenerationPayloadControlType = z.infer<
  typeof generationPayloadControlTypeSchema
>
export type GenerationPayloadControlUi = z.infer<
  typeof generationPayloadControlUiSchema
>
export type GenerationPayloadControl = z.infer<
  typeof generationPayloadControlSchema
>
export type GenerationPayloadRequestEncoding = z.infer<
  typeof generationPayloadRequestEncodingSchema
>
export type GenerationPayloadPricingBindings = z.infer<
  typeof generationPayloadPricingBindingsSchema
>
export type GenerationPayloadConfig = z.infer<
  typeof generationPayloadConfigSchema
>

/** 定价维度键；billed-generation 依此从 params 取计费维度值。 */
export type GenerationPricingDimension = keyof GenerationPayloadPricingBindings

export type GenerationRuntimeParams = Record<string, unknown> & {
  model: string
  prompt?: string
  messages?: unknown
  params?: Record<string, unknown>
  references?: Record<string, unknown>
  system?: Record<string, unknown>
}

export type ConfiguredGenerationPayload = {
  runtime: GenerationRuntimeParams
  payload: Record<string, unknown>
  config: GenerationPayloadConfig
  templateContext: GenerationTemplateContext
}

export type GenerationTemplateContext = Record<string, unknown> & {
  model: string
  prompt: string
  messages: unknown[]
  params: Record<string, unknown>
  references: Record<string, unknown>
  system: Record<string, unknown>
  helpers: Record<string, unknown>
}

const IMAGE_SIZE_OPTIONS = [
  'auto',
  '1024x1024',
  '2048x2048',
  '1536x1024',
  '1024x1536',
  '2048x1152',
  '3840x2160',
  '2160x3840'
]

const IMAGE_QUALITY_OPTIONS = ['auto', 'high', 'medium', 'low']
const IMAGE_BACKGROUND_OPTIONS = ['auto', 'opaque', 'transparent']
const IMAGE_OUTPUT_FORMAT_OPTIONS = ['png', 'jpeg', 'webp']
const VIDEO_DURATION_OPTIONS = [5, 8, 10]
const VIDEO_SIZE_OPTIONS = ['480P', '720P', '1080P']
const VIDEO_ASPECT_OPTIONS = ['16:9', '9:16', '1:1']
const DEFAULT_IMAGE_GENERATION_ENDPOINT = '/v1/images/generations'
const DEFAULT_IMAGE_REFERENCE_ENDPOINT = '/v1/images/edits'
const DEFAULT_VIDEO_GENERATION_ENDPOINT = '/v1/videos'
const DEFAULT_CHAT_GENERATION_ENDPOINT = '/chat/completions'

const TEMPLATE_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g
const EXACT_TEMPLATE_RE = /^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * De-duplicate control keys, keeping the last definition's overrides.
 * Keys are used verbatim — no canonical rewriting.
 */
function dedupeControls(
  controls: GenerationPayloadControl[]
): GenerationPayloadControl[] {
  const result: GenerationPayloadControl[] = []
  const indexByKey = new Map<string, number>()
  for (const control of controls) {
    const key = control.key.trim()
    const next = { ...control, key }
    const existingIndex = indexByKey.get(key)
    if (existingIndex === undefined) {
      indexByKey.set(key, result.length)
      result.push(next)
    } else {
      result[existingIndex] = { ...result[existingIndex], ...next }
    }
  }
  return result
}

export function sanitizeGenerationPayloadConfig(
  config: GenerationPayloadConfig
): GenerationPayloadConfig {
  return {
    ...config,
    controls: dedupeControls(config.controls)
  }
}

export function compactGenerationValue(value: unknown): unknown {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }
  if (Array.isArray(value)) {
    const compacted = value
      .map((item) => compactGenerationValue(item))
      .filter((item) => item !== undefined)
    return compacted.length > 0 ? compacted : undefined
  }
  if (value && typeof value === 'object') {
    const compacted = compactGenerationRecord(value as Record<string, unknown>)
    return Object.keys(compacted).length > 0 ? compacted : undefined
  }
  return value
}

export function compactGenerationRecord(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    const compacted = compactGenerationValue(value)
    if (compacted !== undefined) next[key] = compacted
  }
  return next
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function objectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === 'object' && !Array.isArray(item))
  )
}

function referenceImagesFromParams(params: GenerationRuntimeParams): string[] {
  const references = record(params.references)
  const mediaUrls = objectArray(references.media)
    .filter((item) => {
      const type = typeof item.type === 'string' ? item.type.trim() : ''
      return (
        type === 'reference_image' ||
        type === 'first_frame' ||
        type === 'last_frame' ||
        type === 'image'
      )
    })
    .map((item) => (typeof item.url === 'string' ? item.url.trim() : ''))
    .filter(Boolean)
  return [
    ...stringArray(references.images),
    ...mediaUrls,
    ...(typeof references.firstImage === 'string'
      ? [references.firstImage]
      : [])
  ].filter((value, index, all) => all.indexOf(value) === index)
}

/**
 * 生成 OpenAI 风格的多模态消息（图片在前、文本在后）。
 * 通用命名（不绑定具体厂商），用于 {{helpers.messages.userMultimodal}}。
 */
function userMultimodalMessages(params: GenerationRuntimeParams): unknown {
  const content: Array<Record<string, string>> = referenceImagesFromParams(
    params
  ).map((image) => ({ image }))
  content.push({ text: String(params.prompt ?? '') })
  return [{ role: 'user', content }]
}

function openaiPartFromMedia(
  item: Record<string, unknown>
): Record<string, unknown> | null {
  const type = typeof item.type === 'string' ? item.type : ''
  const url = typeof item.url === 'string' ? item.url.trim() : ''
  if (!url) return null
  if (type === 'reference_video' || type === 'video') {
    return { type: 'video_url', video_url: { url } }
  }
  if (
    type === 'driving_audio' ||
    type === 'reference_audio' ||
    type === 'audio'
  ) {
    return { type: 'audio_url', audio_url: { url } }
  }
  return { type: 'image_url', image_url: { url } }
}

/**
 * 生成 OpenAI 风格的 content[]（image_url/video_url/audio_url + text）。
 * 通用命名，用于 {{helpers.content.openaiParts}}。
 */
function openaiContentParts(params: GenerationRuntimeParams): unknown {
  const content: Array<Record<string, unknown>> = []
  const references = record(params.references)
  const media = objectArray(references.media)
    .map(openaiPartFromMedia)
    .filter((item): item is Record<string, unknown> => item !== null)
  if (media.length > 0) {
    content.push(...media)
  } else {
    for (const image of referenceImagesFromParams(params)) {
      content.push({
        type: 'image_url',
        image_url: { url: image }
      })
    }
  }
  content.push({ type: 'text', text: String(params.prompt ?? '') })
  const seen = new Set<string>()
  return content.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function referenceImageMedia(params: GenerationRuntimeParams): unknown {
  return referenceImagesFromParams(params).map((url) => ({
    type: 'reference_image',
    url
  }))
}

function firstFrameMedia(params: GenerationRuntimeParams): unknown {
  const [url] = referenceImagesFromParams(params)
  return url ? [{ type: 'first_frame', url }] : []
}

function imageMedia(params: GenerationRuntimeParams): unknown {
  return referenceImagesFromParams(params).map((url, index) => ({
    type: index === 0 ? 'first_frame' : 'reference_image',
    url
  }))
}

function defaultsFromControls(
  controls: GenerationPayloadControl[]
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const control of controls) {
    if (!control.enabled) continue
    if (control.type === 'referenceImages') continue
    if ('defaultValue' in control) defaults[control.key] = control.defaultValue
  }
  return defaults
}

function normalizeRuntimeParams(
  config: GenerationPayloadConfig,
  params: GenerationRuntimeParams
): GenerationRuntimeParams {
  const messages = compactGenerationValue(params.messages)
  return {
    model: params.model,
    prompt: params.prompt,
    messages: Array.isArray(messages) ? messages : [],
    params: compactGenerationRecord({
      ...defaultsFromControls(config.controls),
      ...record(params.params)
    }),
    references: compactGenerationRecord(record(params.references)),
    system: compactGenerationRecord(record(params.system))
  }
}

function assertControlValues(
  controls: GenerationPayloadControl[],
  params: GenerationRuntimeParams
): void {
  const runtimeParams = record(params.params)
  for (const control of controls) {
    if (!control.enabled) continue
    if (control.type === 'referenceImages') {
      if (control.required && referenceImagesFromParams(params).length === 0) {
        throw new Error(
          `Generation payload control "${control.key}" is required.`
        )
      }
      continue
    }
    const value = compactGenerationValue(runtimeParams[control.key])
    if (value === undefined) {
      if (!control.required) continue
      throw new Error(
        `Generation payload control "${control.key}" is required.`
      )
    }
    if (control.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(
          `Generation payload control "${control.key}" must be a number.`
        )
      }
      if (control.min !== undefined && value < control.min) {
        throw new Error(
          `Generation payload control "${control.key}" must be at least ${control.min}.`
        )
      }
      if (control.max !== undefined && value > control.max) {
        throw new Error(
          `Generation payload control "${control.key}" must be at most ${control.max}.`
        )
      }
      continue
    }
    if (control.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error(
        `Generation payload control "${control.key}" must be a boolean.`
      )
    }
    if (control.type === 'text' && typeof value !== 'string') {
      throw new Error(
        `Generation payload control "${control.key}" must be text.`
      )
    }
    if (control.type === 'stringList') {
      const list = Array.isArray(value) ? value : null
      if (!list || list.some((item) => typeof item !== 'string')) {
        throw new Error(
          `Generation payload control "${control.key}" must be a list of strings.`
        )
      }
      continue
    }
    if (
      control.type === 'select' &&
      control.options.length > 0 &&
      !control.options.some((option) => Object.is(option, value))
    ) {
      throw new Error(
        `Generation payload control "${control.key}" has an unsupported value.`
      )
    }
  }
}

export function generationPayloadSupportsReferenceImages(
  config: GenerationPayloadConfig | null | undefined
): boolean {
  return Boolean(
    config?.controls.some(
      (control) => control.enabled && control.type === 'referenceImages'
    )
  )
}

export function generationPayloadRequiresReferenceImages(
  config: GenerationPayloadConfig | null | undefined
): boolean {
  return Boolean(
    config?.controls.some(
      (control) =>
        control.enabled &&
        control.required === true &&
        control.type === 'referenceImages'
    )
  )
}

function templateValueUsesParam(
  value: unknown,
  paramKeys: Set<string>
): boolean {
  if (typeof value === 'string') {
    return [...value.matchAll(TEMPLATE_RE)].some((match) => {
      const path = match[1] ?? ''
      return paramKeys.has(path)
    })
  }
  if (Array.isArray(value)) {
    return value.some((item) => templateValueUsesParam(item, paramKeys))
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) =>
      templateValueUsesParam(item, paramKeys)
    )
  }
  return false
}

export function generationPayloadTemplateUsesParams(
  config: GenerationPayloadConfig | null | undefined,
  paramKeys: string[]
): boolean {
  if (!config || paramKeys.length === 0) return false
  const allowedParamKeys = paramKeys.map((key) => key.trim()).filter(Boolean)
  if (allowedParamKeys.length === 0) return false
  return templateValueUsesParam(
    config.request.body,
    new Set(allowedParamKeys.map((key) => `params.${key}`))
  )
}

export type GenerationTemplateVariable = {
  path: string
  group: 'direct' | 'params' | 'references' | 'system' | 'helpers'
  description: string
}

const REFERENCE_TEMPLATE_VARIABLES: GenerationTemplateVariable[] = [
  {
    path: 'references.images',
    group: 'references',
    description: 'reference image URLs'
  },
  {
    path: 'references.firstImage',
    group: 'references',
    description: 'first reference image URL'
  },
  {
    path: 'references.media',
    group: 'references',
    description: 'typed reference media'
  },
  {
    path: 'references.clips',
    group: 'references',
    description: 'source clip URLs'
  },
  {
    path: 'references.sourceVideo',
    group: 'references',
    description: 'source video URL'
  },
  {
    path: 'references.drivingAudio',
    group: 'references',
    description: 'driving audio URL'
  }
]

const SYSTEM_TEMPLATE_VARIABLES: GenerationTemplateVariable[] = [
  {
    path: 'system.projectId',
    group: 'system',
    description: 'workspace project id'
  },
  {
    path: 'system.canvasTarget.source',
    group: 'system',
    description: 'generation source'
  },
  {
    path: 'system.canvasTarget.documentId',
    group: 'system',
    description: 'canvas document id'
  },
  {
    path: 'system.canvasTarget.elementId',
    group: 'system',
    description: 'canvas element id'
  },
  {
    path: 'system.canvasTarget.resourceId',
    group: 'system',
    description: 'canvas resource id'
  },
  {
    path: 'system.canvasTarget.actionId',
    group: 'system',
    description: 'agent action id'
  }
]

const HELPER_TEMPLATE_VARIABLES: GenerationTemplateVariable[] = [
  {
    path: 'helpers.references.imageMedia',
    group: 'helpers',
    description: 'first frame + reference image media[]'
  },
  {
    path: 'helpers.references.firstFrameMedia',
    group: 'helpers',
    description: 'first frame media[]'
  },
  {
    path: 'helpers.references.referenceImageMedia',
    group: 'helpers',
    description: 'reference image media[]'
  },
  {
    path: 'helpers.messages.userMultimodal',
    group: 'helpers',
    description: 'user message with image + text parts'
  },
  {
    path: 'helpers.content.openaiParts',
    group: 'helpers',
    description: 'OpenAI-style multimodal content[]'
  }
]

export function generationPayloadTemplateVariables(
  config: GenerationPayloadConfig
): GenerationTemplateVariable[] {
  const direct: GenerationTemplateVariable[] = [
    { path: 'model', group: 'direct', description: 'model id' },
    { path: 'prompt', group: 'direct', description: 'prompt text' },
    ...(config.mediaType === 'chat'
      ? [
          {
            path: 'messages',
            group: 'direct' as const,
            description: 'chat messages[]'
          }
        ]
      : [])
  ]
  const params = config.controls
    .filter((control) => control.enabled && control.type !== 'referenceImages')
    .map((control) => ({
      path: `params.${control.key}`,
      group: 'params' as const,
      description: control.label?.trim() || control.type
    }))
  return [
    ...direct,
    ...params,
    ...REFERENCE_TEMPLATE_VARIABLES,
    ...SYSTEM_TEMPLATE_VARIABLES,
    ...HELPER_TEMPLATE_VARIABLES
  ]
}

function valueAtPath(value: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let current = value
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

export function buildGenerationTemplateContext(
  params: GenerationRuntimeParams
): GenerationTemplateContext {
  const images = referenceImagesFromParams(params)
  const rawReferences = record(params.references)
  const references = compactGenerationRecord({
    ...rawReferences,
    images,
    firstImage:
      typeof rawReferences.firstImage === 'string' &&
      rawReferences.firstImage.trim()
        ? rawReferences.firstImage.trim()
        : images[0]
  })
  const runtimeParams = compactGenerationRecord(record(params.params))
  const messages = compactGenerationValue(params.messages)
  const system = compactGenerationRecord(record(params.system))
  return {
    model: params.model,
    prompt: typeof params.prompt === 'string' ? params.prompt : '',
    messages: Array.isArray(messages) ? messages : [],
    params: runtimeParams,
    references,
    system,
    helpers: {
      references: {
        imageMedia: imageMedia({ ...params, references }),
        firstFrameMedia: firstFrameMedia({ ...params, references }),
        referenceImageMedia: referenceImageMedia({ ...params, references })
      },
      messages: {
        userMultimodal: userMultimodalMessages({ ...params, references })
      },
      content: {
        openaiParts: openaiContentParts({ ...params, references })
      }
    }
  }
}

function renderTemplateValue(
  value: unknown,
  context: Record<string, unknown>
): unknown {
  if (typeof value === 'string') {
    const exact = value.match(EXACT_TEMPLATE_RE)
    if (exact?.[1]) {
      return valueAtPath(context, exact[1])
    }
    return value.replace(TEMPLATE_RE, (_match, path: string) => {
      const next = valueAtPath(context, path)
      return next === undefined || next === null ? '' : String(next)
    })
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderTemplateValue(item, context))
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      next[key] = renderTemplateValue(item, context)
    }
    return next
  }
  return value
}

export function buildGenerationPayloadFromConfig(
  config: GenerationPayloadConfig,
  params: GenerationRuntimeParams
): ConfiguredGenerationPayload {
  const normalizedConfig = sanitizeGenerationPayloadConfig(
    generationPayloadConfigSchema.parse(config)
  )
  const mergedParams = normalizeRuntimeParams(normalizedConfig, params)
  assertControlValues(normalizedConfig.controls, mergedParams)
  const templateContext = buildGenerationTemplateContext(mergedParams)
  const rendered = renderTemplateValue(
    normalizedConfig.request.body,
    templateContext
  )
  return {
    runtime: mergedParams,
    payload:
      normalizedConfig.request.omitEmpty === false
        ? record(rendered)
        : compactGenerationRecord(record(rendered)),
    config: normalizedConfig,
    templateContext
  }
}

/**
 * 从 params 里按定价绑定取某个计费维度的值。未绑定时回退到同名键。
 * 计费不再依赖已删除的 canonical KEY_MAP。
 */
export function readPricingDimension(
  config: GenerationPayloadConfig,
  params: Record<string, unknown>,
  dimension: GenerationPricingDimension
): unknown {
  const boundKey = config.pricingBindings[dimension]
  const key = boundKey ?? dimension
  return params[key]
}

export function readGenerationPayloadConfig(
  metadata: Record<string, unknown> | null | undefined
): GenerationPayloadConfig | null {
  const parsed = generationPayloadConfigSchema.safeParse(metadata?.payload)
  return parsed.success ? sanitizeGenerationPayloadConfig(parsed.data) : null
}

export function mergeGenerationPayloadConfig(
  metadata: Record<string, unknown> | null | undefined,
  payload: GenerationPayloadConfig
): Record<string, unknown> {
  return {
    ...record(metadata),
    payload: sanitizeGenerationPayloadConfig(
      generationPayloadConfigSchema.parse(payload)
    )
  }
}

export function hasGenerationPayloadConfig(input: {
  mediaType: GenerationPayloadMediaType
  metadata?: Record<string, unknown> | null
}): boolean {
  return (
    readGenerationPayloadConfig(input.metadata)?.mediaType === input.mediaType
  )
}

export function createDefaultGenerationPayloadConfig(
  mediaType: GenerationPayloadMediaType
): GenerationPayloadConfig {
  const payload =
    mediaType === 'image'
      ? {
          mediaType: 'image',
          endpoint: DEFAULT_IMAGE_GENERATION_ENDPOINT,
          pricingBindings: {
            count: 'n',
            size: 'size',
            quality: 'quality'
          },
          controls: [
            {
              key: 'size',
              label: 'Size',
              type: 'select',
              ui: 'size',
              defaultValue: '1024x1024',
              options: IMAGE_SIZE_OPTIONS
            },
            {
              key: 'n',
              label: 'Count',
              type: 'number',
              defaultValue: 1,
              min: 1,
              max: 10
            },
            {
              key: 'quality',
              label: 'Quality',
              type: 'select',
              defaultValue: 'auto',
              options: IMAGE_QUALITY_OPTIONS
            },
            {
              key: 'background',
              label: 'Background',
              type: 'select',
              defaultValue: 'auto',
              options: IMAGE_BACKGROUND_OPTIONS
            },
            {
              key: 'outputFormat',
              label: 'Output format',
              type: 'select',
              defaultValue: 'png',
              options: IMAGE_OUTPUT_FORMAT_OPTIONS
            },
            {
              key: 'outputCompression',
              label: 'Output compression',
              type: 'number',
              defaultValue: 100,
              min: 1,
              max: 100
            },
            {
              key: 'referenceImages',
              label: 'Reference images',
              type: 'referenceImages'
            },
            {
              key: 'seed',
              label: 'Seed',
              type: 'number',
              min: 0
            }
          ],
          request: {
            omitEmpty: true,
            encoding: 'multipart',
            headers: {},
            referenceEndpoint: DEFAULT_IMAGE_REFERENCE_ENDPOINT,
            multipartImageField: 'image',
            body: {
              model: '{{model}}',
              prompt: '{{prompt}}',
              size: '{{params.size}}',
              n: '{{params.n}}',
              image: '{{references.images}}',
              quality: '{{params.quality}}',
              background: '{{params.background}}',
              output_format: '{{params.outputFormat}}',
              output_compression: '{{params.outputCompression}}',
              seed: '{{params.seed}}'
            }
          }
        }
      : mediaType === 'video'
        ? {
            mediaType: 'video',
            endpoint: DEFAULT_VIDEO_GENERATION_ENDPOINT,
            pricingBindings: {
              duration: 'duration',
              resolution: 'resolution',
              aspectRatio: 'aspectRatio'
            },
            controls: [
              {
                key: 'duration',
                label: 'Duration',
                type: 'select',
                ui: 'segment',
                defaultValue: 5,
                options: VIDEO_DURATION_OPTIONS
              },
              {
                key: 'resolution',
                label: 'Resolution',
                type: 'select',
                ui: 'segment',
                defaultValue: '720P',
                options: VIDEO_SIZE_OPTIONS
              },
              {
                key: 'aspectRatio',
                label: 'Aspect ratio',
                type: 'select',
                ui: 'segment',
                defaultValue: '16:9',
                options: VIDEO_ASPECT_OPTIONS
              },
              {
                key: 'referenceImages',
                label: 'Reference images',
                type: 'referenceImages'
              },
              {
                key: 'frames',
                label: 'Frames',
                type: 'number',
                min: 1
              },
              {
                key: 'seed',
                label: 'Seed',
                type: 'number',
                min: 0
              },
              {
                key: 'generateAudio',
                label: 'Generate audio',
                type: 'boolean'
              }
            ],
            request: {
              omitEmpty: true,
              encoding: 'json',
              headers: {},
              multipartImageField: 'image',
              body: {
                model: '{{model}}',
                prompt: '{{prompt}}',
                duration: '{{params.duration}}',
                size: '{{params.resolution}}',
                imgUrl: '{{references.firstImage}}',
                mergeReferenceImageUrls: '{{references.images}}',
                referenceMedia: '{{references.media}}',
                mergeClipUrls: '{{references.clips}}',
                mergeVideoAspectRatio: '{{params.aspectRatio}}',
                videoEditVideoUrl: '{{references.sourceVideo}}',
                drivingAudioUrl: '{{references.drivingAudio}}',
                frames: '{{params.frames}}',
                seed: '{{params.seed}}',
                generate_audio: '{{params.generateAudio}}'
              }
            }
          }
        : {
            mediaType: 'chat',
            endpoint: DEFAULT_CHAT_GENERATION_ENDPOINT,
            pricingBindings: {},
            controls: [
              {
                key: 'temperature',
                label: 'Temperature',
                type: 'number',
                min: 0,
                max: 2,
                step: 0.1
              },
              {
                key: 'maxTokens',
                label: 'Max tokens',
                type: 'number',
                min: 1
              },
              {
                key: 'reasoningEffort',
                label: 'Reasoning effort',
                type: 'select',
                options: ['low', 'medium', 'high']
              },
              {
                key: 'stream',
                label: 'Stream',
                type: 'boolean'
              }
            ],
            request: {
              omitEmpty: true,
              encoding: 'json',
              headers: {},
              multipartImageField: 'image',
              body: {
                model: '{{model}}',
                messages: '{{messages}}',
                temperature: '{{params.temperature}}',
                max_tokens: '{{params.maxTokens}}',
                reasoning_effort: '{{params.reasoningEffort}}',
                stream: '{{params.stream}}',
                stream_options: '{{params.streamOptions}}'
              }
            }
          }
  return generationPayloadConfigSchema.parse(payload)
}
