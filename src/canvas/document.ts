import { z } from 'zod'
import { canvasMediaKindSchema } from './media.js'
import { canvasResourceSchema } from './resources.js'

export const canvasDocumentElementTypeSchema = z.enum([
  'raster',
  'text',
  'shape',
  'vector',
  'path',
  'group',
  'mask',
  'adjustment'
])

export const canvasDocumentBlendModeSchema = z.enum([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'colorDodge',
  'colorBurn',
  'hardLight',
  'softLight',
  'difference',
  'exclusion'
])

export const canvasDocumentElementBaseSchema = z.object({
  id: z.string().min(1),
  type: canvasDocumentElementTypeSchema,
  name: z.string(),
  parentId: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rotation: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  zIndex: z.number().int().nonnegative(),
  blendMode: canvasDocumentBlendModeSchema.default('normal'),
  maskElementId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export const canvasDocumentAiAnnotationSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['object', 'region', 'mask', 'prompt', 'generation']),
  elementId: z.string().nullable().optional(),
  label: z.string().default(''),
  prompt: z.string().default(''),
  bounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().nonnegative(),
      height: z.number().nonnegative()
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.number()
})

export const canvasRasterElementSchema = canvasDocumentElementBaseSchema.extend(
  {
    type: z.literal('raster'),
    mediaType: canvasMediaKindSchema.default('image'),
    assetId: z.string().nullable().optional()
  }
)

export const canvasTextElementSchema = canvasDocumentElementBaseSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional()
})

export const canvasShapeElementSchema = canvasDocumentElementBaseSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rectangle', 'ellipse', 'triangle', 'line']),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  radius: z.number().nonnegative().optional()
})

export const canvasVectorElementSchema = canvasDocumentElementBaseSchema.extend(
  {
    type: z.literal('vector'),
    svg: z.string(),
    viewBox: z.string().optional()
  }
)

export const canvasPathPointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().min(0).max(1).optional()
})

export const canvasPathElementSchema = canvasDocumentElementBaseSchema.extend({
  type: z.literal('path'),
  points: z.array(canvasPathPointSchema).min(2),
  stroke: z.string().default('#111827'),
  strokeWidth: z.number().positive().default(16),
  lineCap: z.enum(['butt', 'round', 'square']).default('round'),
  lineJoin: z.enum(['miter', 'round', 'bevel']).default('round')
})

export const canvasGroupElementSchema = canvasDocumentElementBaseSchema.extend({
  type: z.literal('group'),
  childElementIds: z.array(z.string()).default([])
})

export const canvasMaskElementSchema = canvasDocumentElementBaseSchema.extend({
  type: z.literal('mask'),
  assetId: z.string().nullable().optional(),
  targetElementId: z.string().nullable().optional(),
  mode: z.enum(['alpha', 'luminance']).default('alpha')
})

export const canvasAdjustmentElementSchema =
  canvasDocumentElementBaseSchema.extend({
    type: z.literal('adjustment'),
    adjustment: z.enum([
      'brightness',
      'contrast',
      'saturation',
      'exposure',
      'hue',
      'blur'
    ]),
    value: z.number()
  })

export const canvasDocumentElementSchema = z.discriminatedUnion('type', [
  canvasRasterElementSchema,
  canvasTextElementSchema,
  canvasShapeElementSchema,
  canvasVectorElementSchema,
  canvasPathElementSchema,
  canvasGroupElementSchema,
  canvasMaskElementSchema,
  canvasAdjustmentElementSchema
])

export const canvasDocumentSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().nullable().optional(),
  title: z.string().optional(),
  version: z.literal(1).default(1),
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string().nullable().optional(),
  sourceNodeId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
  outputResource: canvasResourceSchema.nullable().optional(),
  selectedElementIds: z.array(z.string()).default([]),
  aiAnnotations: z.array(canvasDocumentAiAnnotationSchema).default([]),
  elements: z.array(canvasDocumentElementSchema),
  createdAt: z.number(),
  updatedAt: z.number()
})

export type CanvasDocumentElementType = z.infer<
  typeof canvasDocumentElementTypeSchema
>
export type CanvasDocumentBlendMode = z.infer<
  typeof canvasDocumentBlendModeSchema
>
export type CanvasRasterElement = z.infer<typeof canvasRasterElementSchema>
export type CanvasTextElement = z.infer<typeof canvasTextElementSchema>
export type CanvasShapeElement = z.infer<typeof canvasShapeElementSchema>
export type CanvasVectorElement = z.infer<typeof canvasVectorElementSchema>
export type CanvasPathPoint = z.infer<typeof canvasPathPointSchema>
export type CanvasPathElement = z.infer<typeof canvasPathElementSchema>
export type CanvasGroupElement = z.infer<typeof canvasGroupElementSchema>
export type CanvasMaskElement = z.infer<typeof canvasMaskElementSchema>
export type CanvasAdjustmentElement = z.infer<
  typeof canvasAdjustmentElementSchema
>
export type CanvasDocumentElement = z.infer<typeof canvasDocumentElementSchema>
export type CanvasDocumentAiAnnotation = z.infer<
  typeof canvasDocumentAiAnnotationSchema
>
export type CanvasDocument = z.infer<typeof canvasDocumentSchema>
