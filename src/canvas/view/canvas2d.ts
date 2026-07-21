import { z } from 'zod'

export const canvas2dViewModeSchema = z.enum(['freeform'])

export const canvas2dInteractionToolSchema = z.enum([
  'pointer',
  'pan',
  'brush',
  'text',
  'rectangle',
  'ellipse'
])

export const canvas2dInspectorPanelSchema = z.enum([
  'elements',
  'style',
  'assets'
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

export const canvas2dWorkspaceViewSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  mode: canvas2dViewModeSchema.default('freeform'),
  viewport: canvas2dViewportSchema.optional(),
  activeDocumentId: z.string().nullable().default(null),
  selectedElementIds: z.array(z.string()).default([]),
  tool: canvas2dInteractionToolSchema.default('pointer'),
  inspectorPanel: canvas2dInspectorPanelSchema.nullable().default('elements'),
  elementPanelOpen: z.boolean().default(true),
  stylePanelOpen: z.boolean().default(false),
  assetPanelOpen: z.boolean().default(false)
})

export const CANVAS2D_MIN_ZOOM = 0.08
export const CANVAS2D_MAX_ZOOM = 6

export const CANVAS2D_DEFAULT_VIEWPORT = {
  x: 96,
  y: 96,
  zoom: 1
} as const

export const CANVAS2D_DEFAULT_WORKSPACE_VIEW = {
  schemaVersion: 1,
  mode: 'freeform',
  viewport: CANVAS2D_DEFAULT_VIEWPORT,
  activeDocumentId: null,
  selectedElementIds: [],
  tool: 'pointer',
  inspectorPanel: 'elements',
  elementPanelOpen: true,
  stylePanelOpen: false,
  assetPanelOpen: false
} as const

export type Canvas2dInteractionTool = z.infer<
  typeof canvas2dInteractionToolSchema
>
export type Canvas2dInspectorPanel = z.infer<
  typeof canvas2dInspectorPanelSchema
>
export type Canvas2dElementMenuAction = z.infer<
  typeof canvas2dElementMenuActionSchema
>
export type Canvas2dViewport = z.infer<typeof canvas2dViewportSchema>
export type Canvas2dWorkspaceView = z.infer<typeof canvas2dWorkspaceViewSchema>
