import { z } from 'zod'

export const generationPayloadMediaTypeSchema = z.enum(['image', 'video'])

export const generationPayloadControlTypeSchema = z.enum([
  'text',
  'number',
  'boolean',
  'select',
  'size',
  'referenceImages'
])

export const generationPayloadControlSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().optional(),
    type: generationPayloadControlTypeSchema.default('text'),
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

export const generationPayloadRequestSchema = z
  .object({
    body: z.record(z.string(), z.unknown()).default({}),
    omitEmpty: z.boolean().default(true)
  })
  .strict()

export const generationPayloadConfigSchema = z
  .object({
    mediaType: generationPayloadMediaTypeSchema,
    endpoint: z.string().trim().min(1),
    controls: z.array(generationPayloadControlSchema).default([]),
    request: generationPayloadRequestSchema.default({
      body: {},
      omitEmpty: true
    })
  })
  .strict()

export type GenerationPayloadMediaType = z.infer<
  typeof generationPayloadMediaTypeSchema
>
export type GenerationPayloadControlType = z.infer<
  typeof generationPayloadControlTypeSchema
>
export type GenerationPayloadControl = z.infer<
  typeof generationPayloadControlSchema
>
export type GenerationPayloadRequest = z.infer<
  typeof generationPayloadRequestSchema
>
export type GenerationPayloadConfig = z.infer<
  typeof generationPayloadConfigSchema
>

type RuntimeParams = Record<string, unknown> & {
  model: string
  prompt?: string
  input?: Record<string, unknown>
  controls?: Record<string, unknown>
  references?: Record<string, unknown>
  system?: Record<string, unknown>
}

export type ConfiguredGenerationPayload = {
  params: RuntimeParams
  payload: Record<string, unknown>
  config: GenerationPayloadConfig
  templateContext: GenerationTemplateContext
}

export type GenerationTemplateContext = Record<string, unknown> & {
  model: string
  prompt: string
  input: Record<string, unknown>
  controls: Record<string, unknown>
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
const DEFAULT_VIDEO_GENERATION_ENDPOINT = '/v1/videos'
const REMOVED_GENERATION_CONTROL_KEYS = new Set([
  'prompt_extend',
  'promptExtend',
  'watermark'
])
const IMAGE_INPUT_CONTROL_KEY_MAP = new Map([
  ['size', 'size'],
  ['n', 'n'],
  ['quality', 'quality'],
  ['background', 'background'],
  ['output_format', 'outputFormat'],
  ['outputFormat', 'outputFormat'],
  ['output_compression', 'outputCompression'],
  ['outputCompression', 'outputCompression'],
  ['negative_prompt', 'negativePrompt'],
  ['negativePrompt', 'negativePrompt'],
  ['seed', 'seed']
])
const VIDEO_INPUT_CONTROL_KEY_MAP = new Map([
  ['duration', 'duration'],
  ['seconds', 'seconds'],
  ['size', 'resolution'],
  ['resolution', 'resolution'],
  ['mergeVideoAspectRatio', 'aspectRatio'],
  ['aspectRatio', 'aspectRatio'],
  ['ratio', 'aspectRatio'],
  ['quality', 'quality'],
  ['seed', 'seed']
])

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function isRemovedGenerationControlKey(key: string): boolean {
  return REMOVED_GENERATION_CONTROL_KEYS.has(key)
}

export function stripRemovedGenerationControls<
  T extends Record<string, unknown>
>(controls: T): T {
  for (const key of REMOVED_GENERATION_CONTROL_KEYS) {
    delete controls[key]
  }
  return controls
}

function sanitizeGenerationPayloadBodyValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeGenerationPayloadBodyValue(item))
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (isRemovedGenerationControlKey(key)) continue
      next[key] = sanitizeGenerationPayloadBodyValue(item)
    }
    return next
  }
  return value
}

function sanitizeGenerationPayloadBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  return sanitizeGenerationPayloadBodyValue(body) as Record<string, unknown>
}

export function sanitizeGenerationPayloadConfig(
  config: GenerationPayloadConfig
): GenerationPayloadConfig {
  return {
    ...config,
    controls: config.controls.filter(
      (control) => !isRemovedGenerationControlKey(control.key)
    ),
    request: {
      ...config.request,
      body: sanitizeGenerationPayloadBody(config.request.body)
    }
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

function referenceImagesFromParams(params: RuntimeParams): string[] {
  const references = record(params.references)
  return [
    ...stringArray(references.images),
    ...(typeof references.firstImage === 'string'
      ? [references.firstImage]
      : [])
  ].filter((value, index, all) => all.indexOf(value) === index)
}

function qwenInputMessages(params: RuntimeParams): unknown {
  const content: Array<Record<string, string>> = referenceImagesFromParams(
    params
  ).map((image) => ({ image }))
  content.push({ text: String(params.prompt ?? '') })
  return [{ role: 'user', content }]
}

function seedanceContentItemFromMedia(
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

function seedanceContent(params: RuntimeParams): unknown {
  const content: Array<Record<string, unknown>> = []
  const references = record(params.references)
  const media = objectArray(references.media)
    .map(seedanceContentItemFromMedia)
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

function referenceImageMedia(params: RuntimeParams): unknown {
  return referenceImagesFromParams(params).map((url) => ({
    type: 'reference_image',
    url
  }))
}

function firstFrameMedia(params: RuntimeParams): unknown {
  const [url] = referenceImagesFromParams(params)
  return url ? [{ type: 'first_frame', url }] : []
}

function imageMedia(params: RuntimeParams): unknown {
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
    if (isRemovedGenerationControlKey(control.key)) continue
    if (control.type === 'referenceImages') continue
    if ('defaultValue' in control) defaults[control.key] = control.defaultValue
  }
  return defaults
}

function inputControlKey(
  mediaType: GenerationPayloadMediaType,
  key: string
): string | undefined {
  return mediaType === 'image'
    ? IMAGE_INPUT_CONTROL_KEY_MAP.get(key)
    : VIDEO_INPUT_CONTROL_KEY_MAP.get(key)
}

function splitControlDefaults(
  mediaType: GenerationPayloadMediaType,
  controls: GenerationPayloadControl[]
): {
  input: Record<string, unknown>
  controls: Record<string, unknown>
} {
  const input: Record<string, unknown> = {}
  const controlDefaults: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(defaultsFromControls(controls))) {
    const inputKey = inputControlKey(mediaType, key)
    if (inputKey) {
      input[inputKey] = value
    } else {
      controlDefaults[key] = value
    }
  }
  return { input, controls: controlDefaults }
}

function normalizeRuntimeParams(
  config: GenerationPayloadConfig,
  params: RuntimeParams
): RuntimeParams {
  const defaults = splitControlDefaults(config.mediaType, config.controls)
  const input = {
    ...defaults.input,
    ...record(params.input)
  }
  const controls = {
    ...defaults.controls,
    ...stripRemovedGenerationControls(record(params.controls))
  }
  for (const [key, value] of Object.entries({ ...controls })) {
    const inputKey = inputControlKey(config.mediaType, key)
    if (!inputKey) continue
    input[inputKey] = value
    delete controls[key]
  }
  return {
    model: params.model,
    prompt: params.prompt,
    input: compactGenerationRecord(input),
    controls: compactGenerationRecord(controls),
    references: compactGenerationRecord(record(params.references)),
    system: compactGenerationRecord(record(params.system))
  }
}

function assertRequiredControlValues(
  mediaType: GenerationPayloadMediaType,
  controls: GenerationPayloadControl[],
  params: RuntimeParams
): void {
  const runtimeControls = record(params.controls)
  const runtimeInput = record(params.input)
  for (const control of controls) {
    if (!control.enabled || !control.required) continue
    if (isRemovedGenerationControlKey(control.key)) continue
    if (control.type === 'referenceImages') {
      if (referenceImagesFromParams(params).length > 0) continue
      throw new Error(
        `Generation payload control "${control.key}" is required.`
      )
    }
    const inputKey = inputControlKey(mediaType, control.key)
    if (
      inputKey &&
      compactGenerationValue(runtimeInput[inputKey]) !== undefined
    ) {
      continue
    }
    if (compactGenerationValue(runtimeControls[control.key]) !== undefined) {
      continue
    }
    throw new Error(`Generation payload control "${control.key}" is required.`)
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
    sanitizeGenerationPayloadConfig(config).request.body,
    new Set(allowedParamKeys)
  )
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
  params: RuntimeParams
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
  const input = compactGenerationRecord(record(params.input))
  const controls = compactGenerationRecord(
    stripRemovedGenerationControls(record(params.controls))
  )
  const system = compactGenerationRecord(record(params.system))
  return {
    model: params.model,
    prompt: typeof params.prompt === 'string' ? params.prompt : '',
    input,
    controls,
    references,
    system,
    helpers: {
      references: {
        imageMedia: imageMedia({ ...params, references }),
        firstFrameMedia: firstFrameMedia({ ...params, references }),
        referenceImageMedia: referenceImageMedia({ ...params, references })
      },
      qwen: {
        inputMessages: qwenInputMessages({ ...params, references })
      },
      seedance: {
        content: seedanceContent({ ...params, references })
      }
    }
  }
}

const EXACT_TEMPLATE_RE = /^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/
const TEMPLATE_RE = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

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
  params: RuntimeParams
): ConfiguredGenerationPayload {
  const normalizedConfig = sanitizeGenerationPayloadConfig(
    generationPayloadConfigSchema.parse(config)
  )
  const mergedParams = normalizeRuntimeParams(normalizedConfig, params)
  assertRequiredControlValues(
    normalizedConfig.mediaType,
    normalizedConfig.controls,
    mergedParams
  )
  const templateContext = buildGenerationTemplateContext(mergedParams)
  const rendered = renderTemplateValue(
    normalizedConfig.request.body,
    templateContext
  )
  return {
    params: mergedParams,
    payload:
      normalizedConfig.request.omitEmpty === false
        ? record(rendered)
        : compactGenerationRecord(record(rendered)),
    config: normalizedConfig,
    templateContext
  }
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
          endpoint: '/v1/images/generations',
          controls: [
            {
              key: 'size',
              label: 'Size',
              type: 'size',
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
              key: 'output_format',
              label: 'Output format',
              type: 'select',
              defaultValue: 'png',
              options: IMAGE_OUTPUT_FORMAT_OPTIONS
            },
            {
              key: 'output_compression',
              label: 'Output compression',
              type: 'number',
              defaultValue: 90,
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
            body: {
              model: '{{model}}',
              prompt: '{{prompt}}',
              size: '{{input.size}}',
              n: '{{input.n}}',
              image: '{{references.images}}',
              quality: '{{input.quality}}',
              background: '{{input.background}}',
              output_format: '{{input.outputFormat}}',
              output_compression: '{{input.outputCompression}}',
              seed: '{{input.seed}}'
            }
          }
        }
      : {
          mediaType: 'video',
          endpoint: DEFAULT_VIDEO_GENERATION_ENDPOINT,
          controls: [
            {
              key: 'duration',
              label: 'Duration',
              type: 'select',
              defaultValue: 5,
              options: VIDEO_DURATION_OPTIONS
            },
            {
              key: 'size',
              label: 'Resolution',
              type: 'select',
              defaultValue: '720P',
              options: VIDEO_SIZE_OPTIONS
            },
            {
              key: 'mergeVideoAspectRatio',
              label: 'Aspect ratio',
              type: 'select',
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
              key: 'generate_audio',
              label: 'Generate audio',
              type: 'boolean'
            }
          ],
          request: {
            omitEmpty: true,
            body: {
              model: '{{model}}',
              prompt: '{{prompt}}',
              duration: '{{input.duration}}',
              seconds: '{{input.seconds}}',
              size: '{{input.resolution}}',
              imgUrl: '{{references.firstImage}}',
              mergeReferenceImageUrls: '{{references.images}}',
              referenceMedia: '{{references.media}}',
              mergeClipUrls: '{{references.clips}}',
              mergeVideoAspectRatio: '{{input.aspectRatio}}',
              videoEditVideoUrl: '{{references.sourceVideo}}',
              drivingAudioUrl: '{{references.drivingAudio}}',
              frames: '{{controls.frames}}',
              seed: '{{input.seed}}',
              generate_audio: '{{controls.generate_audio}}'
            }
          }
        }
  return generationPayloadConfigSchema.parse(payload)
}
