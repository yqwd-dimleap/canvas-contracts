import { z } from 'zod'
import { apiSuccessResponseSchema } from '../../api/response.js'
import { canvasAgentBaseRequestSchema } from './actions.js'

/**
 * Text processing operation.
 *
 * `auto` lets the server infer the safest action from contentKind/context.
 * Other values are explicit user/UI intents for lightweight text work.
 */
export const promptTextOperationSchema = z.enum([
  'auto',
  'improve',
  'expand',
  'refine',
  'shorten',
  'summarize',
  'rewrite',
  'translate',
  'extract_prompt',
  'image_prompt',
  'video_prompt'
])

export const promptTextContentKindSchema = z.enum([
  'plain_text',
  'canvas_text',
  'texture_text',
  'image_prompt',
  'video_prompt',
  'script',
  'storyboard',
  'ui_copy'
])

export const promptTextFieldContextSchema = z.object({
  field: z
    .enum([
      'prompt',
      'text',
      'title',
      'description',
      'caption',
      'label',
      'script',
      'other'
    ])
    .optional(),
  target: z.enum(['text', 'image', 'video', 'canvas', 'ui']).optional(),
  canvasElementId: z.string().min(1).optional(),
  canvasElementType: z.string().min(1).optional(),
  sourceName: z.string().min(1).optional(),
  selectedText: z.string().min(1).optional(),
  surroundingText: z.string().min(1).optional(),
  tone: z.string().min(1).max(120).optional(),
  audience: z.string().min(1).max(160).optional(),
  outputLanguage: z.string().min(1).max(80).optional(),
  maxCharacters: z.number().int().positive().max(20000).optional()
})

/**
 * Process Prompt Text Request
 * 通用文本处理请求：用于提示词、画布文字、texture 文本、脚本和 UI 文案。
 */
export const processPromptTextRequestSchema =
  canvasAgentBaseRequestSchema.extend({
    canvas: canvasAgentBaseRequestSchema.shape.canvas.optional(),
    selection: canvasAgentBaseRequestSchema.shape.selection.optional(),
    input: z.string().trim().min(1).max(24000),
    operation: promptTextOperationSchema.default('auto'),
    contentKind: promptTextContentKindSchema.default('plain_text'),
    intent: z.string().trim().min(1).max(2000).optional(),
    fieldContext: promptTextFieldContextSchema.optional(),
    referenceImages: z.array(z.string().min(1)).max(8).optional(),
    styleGuide: z.string().trim().min(1).max(6000).optional()
  })

/**
 * Process Prompt Text Response
 * 通用文本处理结果。
 */
export const processPromptTextResponseSchema = apiSuccessResponseSchema(
  z.object({
    agentModel: z.string().min(1),
    operation: promptTextOperationSchema,
    contentKind: promptTextContentKindSchema,
    originalText: z.string(),
    text: z.string(),
    notes: z.array(z.string()).default([])
  })
)

export type PromptTextOperation = z.infer<typeof promptTextOperationSchema>
export type PromptTextContentKind = z.infer<typeof promptTextContentKindSchema>
export type PromptTextFieldContext = z.infer<
  typeof promptTextFieldContextSchema
>
export type ProcessPromptTextRequest = z.infer<
  typeof processPromptTextRequestSchema
>
export type ProcessPromptTextResponse = z.infer<
  typeof processPromptTextResponseSchema
>
