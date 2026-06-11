import { z } from 'zod'
import { canvasResourceSchema } from './resources.js'

export const canvasDocumentLayerTypeSchema = z.enum([
  'raster',
  'text',
  'shape',
  'vector',
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

export const canvasDocumentLayerBaseSchema = z.object({
  id: z.string().min(1),
  type: canvasDocumentLayerTypeSchema,
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
  maskLayerId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export const canvasRasterLayerSchema = canvasDocumentLayerBaseSchema.extend({
  type: z.literal('raster'),
  sourceUrl: z.string(),
  sourceResourceId: z.string().nullable().optional(),
  assetId: z.string().nullable().optional()
})

export const canvasTextLayerSchema = canvasDocumentLayerBaseSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  align: z.enum(['left', 'center', 'right']).optional()
})

export const canvasShapeLayerSchema = canvasDocumentLayerBaseSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rectangle', 'ellipse', 'triangle', 'line']),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  radius: z.number().nonnegative().optional()
})

export const canvasVectorLayerSchema = canvasDocumentLayerBaseSchema.extend({
  type: z.literal('vector'),
  svg: z.string(),
  viewBox: z.string().optional()
})

export const canvasGroupLayerSchema = canvasDocumentLayerBaseSchema.extend({
  type: z.literal('group'),
  childLayerIds: z.array(z.string()).default([])
})

export const canvasMaskLayerSchema = canvasDocumentLayerBaseSchema.extend({
  type: z.literal('mask'),
  sourceUrl: z.string().optional(),
  targetLayerId: z.string().nullable().optional(),
  mode: z.enum(['alpha', 'luminance']).default('alpha')
})

export const canvasAdjustmentLayerSchema = canvasDocumentLayerBaseSchema.extend(
  {
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
  }
)

export const canvasDocumentLayerSchema = z.discriminatedUnion('type', [
  canvasRasterLayerSchema,
  canvasTextLayerSchema,
  canvasShapeLayerSchema,
  canvasVectorLayerSchema,
  canvasGroupLayerSchema,
  canvasMaskLayerSchema,
  canvasAdjustmentLayerSchema
])

export const canvasDocumentSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().nullable().optional(),
  title: z.string().optional(),
  kind: z.enum(['imageEdit', 'composition']).default('imageEdit'),
  version: z.literal(1).default(1),
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string().nullable().optional(),
  sourceNodeId: z.string().nullable().optional(),
  sourceResourceId: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  outputResource: canvasResourceSchema.nullable().optional(),
  selectedLayerIds: z.array(z.string()).default([]),
  layers: z.array(canvasDocumentLayerSchema),
  createdAt: z.number(),
  updatedAt: z.number()
})

export type CanvasDocumentLayerType = z.infer<
  typeof canvasDocumentLayerTypeSchema
>
export type CanvasDocumentBlendMode = z.infer<
  typeof canvasDocumentBlendModeSchema
>
export type CanvasRasterLayer = z.infer<typeof canvasRasterLayerSchema>
export type CanvasTextLayer = z.infer<typeof canvasTextLayerSchema>
export type CanvasShapeLayer = z.infer<typeof canvasShapeLayerSchema>
export type CanvasVectorLayer = z.infer<typeof canvasVectorLayerSchema>
export type CanvasGroupLayer = z.infer<typeof canvasGroupLayerSchema>
export type CanvasMaskLayer = z.infer<typeof canvasMaskLayerSchema>
export type CanvasAdjustmentLayer = z.infer<typeof canvasAdjustmentLayerSchema>
export type CanvasDocumentLayer = z.infer<typeof canvasDocumentLayerSchema>
export type CanvasDocument = z.infer<typeof canvasDocumentSchema>
