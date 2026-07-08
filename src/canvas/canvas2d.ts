import { z } from 'zod'

export const canvas2dRendererSchema = z.literal('pixi')

export const canvas2dViewModeSchema = z.enum(['freeform'])

export const canvas2dInteractionToolSchema = z.enum([
  'pointer',
  'pan',
  'brush',
  'text',
  'rectangle',
  'ellipse'
])

export const canvas2dElementMenuActionSchema = z.enum([
  'duplicate',
  'delete',
  'download',
  'bringForward',
  'sendBackward',
  'setCover'
])

export const canvas2dViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive()
})

export const canvas2dRenderPolicySchema = z.object({
  renderer: canvas2dRendererSchema.default('pixi'),
  minZoom: z.number().positive().default(0.08),
  maxZoom: z.number().positive().default(6)
})

export const canvas2dWorkspaceViewSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  mode: canvas2dViewModeSchema.default('freeform'),
  renderer: canvas2dRendererSchema.default('pixi'),
  viewport: canvas2dViewportSchema.optional(),
  activeDocumentId: z.string().nullable().default(null),
  selectedElementIds: z.array(z.string()).default([]),
  tool: canvas2dInteractionToolSchema.default('pointer'),
  renderPolicy: canvas2dRenderPolicySchema.optional()
})

export const CANVAS2D_MIN_ZOOM = 0.08
export const CANVAS2D_MAX_ZOOM = 6

export const CANVAS2D_DEFAULT_VIEWPORT = {
  x: 96,
  y: 96,
  zoom: 1
} as const

export const CANVAS2D_DEFAULT_RENDER_POLICY = {
  renderer: 'pixi',
  minZoom: CANVAS2D_MIN_ZOOM,
  maxZoom: CANVAS2D_MAX_ZOOM
} as const

export type Canvas2dRenderer = z.infer<typeof canvas2dRendererSchema>
export type Canvas2dViewMode = z.infer<typeof canvas2dViewModeSchema>
export type Canvas2dInteractionTool = z.infer<
  typeof canvas2dInteractionToolSchema
>
export type Canvas2dElementMenuAction = z.infer<
  typeof canvas2dElementMenuActionSchema
>
export type Canvas2dViewport = z.infer<typeof canvas2dViewportSchema>
export type Canvas2dRenderPolicy = z.infer<typeof canvas2dRenderPolicySchema>
export type Canvas2dWorkspaceView = z.infer<typeof canvas2dWorkspaceViewSchema>
