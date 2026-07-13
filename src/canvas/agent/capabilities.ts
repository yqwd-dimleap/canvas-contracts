import { z } from 'zod'
import { canvasDocumentElementTypeSchema } from '../core/document.js'

export const canvasAgentActionTypeSchema = z.enum([
  'document.create',
  'document.patch',
  'document.delete',
  'element.add',
  'element.patch',
  'element.delete',
  'element.reorder',
  'element.select',
  'element.status',
  'element.generationProgress',
  'element.highlight',
  'element.clearHighlight',
  'element.generate',
  'resource.upsert',
  'resource.delete',
  'viewport.set',
  'viewport.focus'
])

export const canvasAgentGenerationMediaTypeSchema = z.enum(['image', 'video'])

export const canvasAgentElementCapabilitySchema = z
  .object({
    elementType: canvasDocumentElementTypeSchema,
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    enabled: z.boolean().default(true),
    visible: z.boolean().default(true),
    supportsCreate: z.boolean().default(true),
    supportsPatch: z.boolean().default(true),
    supportsGeneration: z.boolean().default(false),
    requiredFields: z.array(z.string().min(1)).default([]),
    editableFields: z.array(z.string().min(1)).default([]),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const canvasAgentActionCapabilitySchema = z
  .object({
    action: canvasAgentActionTypeSchema,
    enabled: z.boolean().default(true),
    description: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const canvasAgentRecipeCapabilitySchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    enabled: z.boolean().default(true),
    visible: z.boolean().default(true),
    intentKinds: z
      .array(
        z.enum([
          'conversation',
          'chat',
          'question',
          'image',
          'image_edit',
          'video',
          'video_edit',
          'script',
          'storyboard'
        ])
      )
      .default([]),
    elementTypes: z.array(canvasDocumentElementTypeSchema).default([]),
    actionTypes: z.array(canvasAgentActionTypeSchema).default([]),
    starterIntent: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const canvasAgentToolRuntimeSchema = z.enum(['langchain', 'execution'])

export const canvasAgentToolPermissionSchema = z.enum([
  'read',
  'reference',
  'write'
])

export const canvasAgentToolCategorySchema = z.enum([
  'canvas',
  'generation',
  'prompt',
  'memory',
  'review',
  'other'
])

export const canvasAgentToolCapabilitySchema = z
  .object({
    name: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    category: canvasAgentToolCategorySchema,
    runtime: canvasAgentToolRuntimeSchema,
    permission: canvasAgentToolPermissionSchema,
    enabled: z.boolean().default(true),
    visible: z.boolean().default(true),
    streaming: z.boolean().default(false),
    interruptible: z.boolean().default(false),
    requiresConfirmation: z.boolean(),
    actionTypes: z.array(canvasAgentActionTypeSchema),
    elementTypes: z.array(canvasDocumentElementTypeSchema).default([]),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const canvasAgentCapabilityManifestSchema = z
  .object({
    version: z
      .literal('canvas-agent-capabilities.v4')
      .default('canvas-agent-capabilities.v4'),
    generatedAt: z.string().min(1).optional(),
    source: z.enum(['frontend', 'server', 'test']).default('frontend'),
    actions: z.array(canvasAgentActionCapabilitySchema).default([]),
    elements: z.array(canvasAgentElementCapabilitySchema).default([]),
    recipes: z.array(canvasAgentRecipeCapabilitySchema).default([]),
    tools: z.array(canvasAgentToolCapabilitySchema).default([]),
    disabledReasonById: z.record(z.string(), z.string()).default({}),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const DEFAULT_CANVAS_AGENT_ACTION_CAPABILITIES = [
  { action: 'document.create', enabled: true },
  { action: 'document.patch', enabled: true },
  { action: 'document.delete', enabled: true },
  { action: 'element.add', enabled: true },
  { action: 'element.patch', enabled: true },
  { action: 'element.delete', enabled: true },
  { action: 'element.reorder', enabled: true },
  { action: 'element.select', enabled: true },
  { action: 'element.status', enabled: true },
  { action: 'element.generationProgress', enabled: true },
  { action: 'element.highlight', enabled: true },
  { action: 'element.clearHighlight', enabled: true },
  {
    action: 'element.generate',
    enabled: true,
    metadata: { mediaTypes: ['image', 'video'] }
  },
  { action: 'resource.upsert', enabled: true },
  { action: 'resource.delete', enabled: true },
  { action: 'viewport.set', enabled: true },
  { action: 'viewport.focus', enabled: true }
] as const

export const DEFAULT_CANVAS_AGENT_ELEMENT_CAPABILITIES = [
  {
    elementType: 'raster',
    title: 'Raster media',
    supportsGeneration: true,
    requiredFields: ['assetId'],
    editableFields: ['x', 'y', 'width', 'height', 'opacity', 'visible'],
    metadata: {
      modelRoles: ['image', 'video'],
      generationMediaTypes: ['image', 'video']
    }
  },
  {
    elementType: 'text',
    title: 'Text',
    supportsGeneration: true,
    requiredFields: ['text'],
    editableFields: [
      'text',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'color',
      'align'
    ],
    metadata: {
      modelRoles: ['text']
    }
  },
  {
    elementType: 'shape',
    title: 'Shape',
    requiredFields: ['shape'],
    editableFields: ['shape', 'fill', 'stroke', 'strokeWidth', 'radius'],
    metadata: {
      modelRoles: ['image']
    }
  },
  {
    elementType: 'vector',
    title: 'Vector',
    requiredFields: ['svg'],
    editableFields: ['svg', 'viewBox', 'x', 'y', 'width', 'height'],
    metadata: {
      modelRoles: ['image']
    }
  },
  {
    elementType: 'path',
    title: 'Path',
    requiredFields: ['points'],
    editableFields: ['stroke', 'strokeWidth', 'lineCap', 'lineJoin'],
    metadata: {
      modelRoles: ['image']
    }
  },
  {
    elementType: 'group',
    title: 'Group',
    supportsGeneration: false,
    requiredFields: ['childElementIds'],
    editableFields: ['childElementIds', 'x', 'y', 'opacity', 'visible']
  },
  {
    elementType: 'mask',
    title: 'Mask',
    supportsGeneration: false,
    requiredFields: ['targetElementId'],
    editableFields: ['assetId', 'targetElementId', 'mode', 'opacity', 'visible']
  },
  {
    elementType: 'adjustment',
    title: 'Adjustment',
    supportsGeneration: false,
    requiredFields: ['adjustment', 'value'],
    editableFields: ['adjustment', 'value', 'opacity', 'visible']
  }
] as const

export const DEFAULT_CANVAS_AGENT_RECIPE_CAPABILITIES = [
  {
    id: 'canvas2d-compose-image',
    title: 'Compose image',
    intentKinds: ['image', 'image_edit'],
    elementTypes: ['raster', 'text', 'shape', 'vector', 'path'],
    actionTypes: [
      'document.create',
      'element.add',
      'element.patch',
      'element.generate',
      'viewport.focus'
    ],
    metadata: {
      surface: 'canvas2d'
    }
  },
  {
    id: 'canvas2d-edit-selection',
    title: 'Edit selection',
    intentKinds: ['image_edit', 'question'],
    elementTypes: [
      'raster',
      'text',
      'shape',
      'vector',
      'path',
      'group',
      'mask',
      'adjustment'
    ],
    actionTypes: [
      'element.patch',
      'element.reorder',
      'element.select',
      'element.delete',
      'viewport.focus'
    ],
    metadata: {
      surface: 'canvas2d'
    }
  },
  {
    id: 'canvas2d-video-layout',
    title: 'Compose video layout',
    intentKinds: ['video', 'video_edit'],
    elementTypes: ['raster', 'text', 'shape', 'vector', 'path'],
    actionTypes: [
      'document.create',
      'element.add',
      'element.patch',
      'element.generate',
      'viewport.focus'
    ],
    metadata: {
      surface: 'canvas2d'
    }
  }
] as const

export const CANVAS_AGENT_TOOL_NAMES = {
  inspect: 'canvas.inspect',
  inspectAssets: 'canvas.inspect_assets',
  inspectCanvas2dScene: 'canvas2d.inspect_scene',
  inspectCanvas2dElements: 'canvas2d.inspect_elements',
  inspectCanvas2dSelection: 'canvas2d.inspect_selection',
  searchCanvas2dRecipes: 'canvas2d.search_recipes',
  searchPromptTemplates: 'prompt.search_templates',
  executeActions: 'canvas2d.execute_actions'
} as const

export type CanvasAgentToolName =
  (typeof CANVAS_AGENT_TOOL_NAMES)[keyof typeof CANVAS_AGENT_TOOL_NAMES]

export const DEFAULT_CANVAS_AGENT_TOOL_CAPABILITIES = [
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspect,
    title: 'Inspect current canvas',
    description:
      'Read active Canvas2D document, viewport, resources, and selection.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectAssets,
    title: 'Inspect assets',
    description:
      'Read lightweight workspace resource metadata and media references.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectCanvas2dScene,
    title: 'Inspect Canvas2D scene',
    description:
      'Read document bounds, viewport, element summary, and resource links.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectCanvas2dElements,
    title: 'Inspect Canvas2D elements',
    description:
      'Read element order, bounds, visibility, resources, and editable fields.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectCanvas2dSelection,
    title: 'Inspect Canvas2D selection',
    description:
      'Read selected elements and the actions they can safely support.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.searchCanvas2dRecipes,
    title: 'Reference Canvas2D recipes',
    description: 'Search reusable Canvas2D composition and editing patterns.',
    category: 'memory',
    runtime: 'langchain',
    permission: 'reference',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'reference',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.searchPromptTemplates,
    title: 'Reference prompt templates',
    description: 'Search reusable image and video prompt structures.',
    category: 'prompt',
    runtime: 'langchain',
    permission: 'reference',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    elementTypes: [],
    metadata: {
      uiGroup: 'reference'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.executeActions,
    title: 'Apply Canvas2D changes',
    description:
      'Materialize planned document, element, resource, and viewport operations.',
    category: 'canvas',
    runtime: 'execution',
    permission: 'write',
    enabled: true,
    visible: true,
    streaming: true,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: DEFAULT_CANVAS_AGENT_ACTION_CAPABILITIES.map(
      (item) => item.action
    ),
    elementTypes: DEFAULT_CANVAS_AGENT_ELEMENT_CAPABILITIES.map(
      (element) => element.elementType
    ),
    metadata: {
      uiGroup: 'apply',
      executionPath: 'canvas-agent',
      surface: 'canvas2d'
    }
  }
] as const

export function createDefaultCanvasAgentCapabilityManifest() {
  return canvasAgentCapabilityManifestSchema.parse({
    source: 'server',
    generatedAt: new Date().toISOString(),
    actions: DEFAULT_CANVAS_AGENT_ACTION_CAPABILITIES,
    elements: DEFAULT_CANVAS_AGENT_ELEMENT_CAPABILITIES,
    recipes: DEFAULT_CANVAS_AGENT_RECIPE_CAPABILITIES,
    tools: DEFAULT_CANVAS_AGENT_TOOL_CAPABILITIES
  })
}

export function enabledCanvasAgentCapabilities(
  manifest?: CanvasAgentCapabilityManifest | null
) {
  const normalized = manifest ?? createDefaultCanvasAgentCapabilityManifest()
  const enabledTools = normalized.tools.filter(
    (item) => item.enabled && item.visible
  )
  const enabledActions = new Set(
    normalized.actions.filter((item) => item.enabled).map((item) => item.action)
  )
  const enabledElementTypes = new Set(
    normalized.elements
      .filter((item) => item.enabled && item.visible)
      .map((item) => item.elementType)
  )
  const enabledRecipeIds = new Set(
    normalized.recipes
      .filter((item) => item.enabled && item.visible)
      .map((item) => item.id)
  )
  const enabledToolNames = new Set(enabledTools.map((item) => item.name))

  return {
    manifest: normalized,
    enabledActions,
    enabledElementTypes,
    enabledRecipeIds,
    enabledTools,
    enabledToolNames
  }
}

function generationMediaTypesFromMetadata(
  metadata: Record<string, unknown> | undefined,
  fallbackToAll: boolean
): CanvasAgentGenerationMediaType[] {
  const raw = metadata?.mediaTypes
  if (!Array.isArray(raw)) return fallbackToAll ? ['image', 'video'] : []
  return Array.from(
    new Set(
      raw.filter(
        (item): item is CanvasAgentGenerationMediaType =>
          item === 'image' || item === 'video'
      )
    )
  )
}

export function enabledCanvasAgentGenerationMediaTypes(
  manifest?: CanvasAgentCapabilityManifest | null
): Set<CanvasAgentGenerationMediaType> {
  const normalized = manifest ?? createDefaultCanvasAgentCapabilityManifest()
  const generateAction = normalized.actions.find(
    (item) => item.action === 'element.generate'
  )
  if (!generateAction?.enabled) return new Set()

  return new Set(
    generationMediaTypesFromMetadata(generateAction.metadata, true)
  )
}

function matchesFilter<T extends string>(
  value: T,
  filter: T | readonly T[] | undefined
) {
  if (!filter) return true
  return Array.isArray(filter) ? filter.includes(value) : value === filter
}

export function enabledCanvasAgentTools(
  manifest?: CanvasAgentCapabilityManifest | null,
  filters?: {
    runtime?: CanvasAgentToolRuntime | readonly CanvasAgentToolRuntime[]
    permission?:
      | CanvasAgentToolPermission
      | readonly CanvasAgentToolPermission[]
  }
): CanvasAgentToolCapability[] {
  return enabledCanvasAgentCapabilities(manifest).enabledTools.filter(
    (tool) =>
      matchesFilter(tool.runtime, filters?.runtime) &&
      matchesFilter(tool.permission, filters?.permission)
  )
}

export function canvasAgentToolAllowed(
  manifest: CanvasAgentCapabilityManifest | undefined | null,
  name: string,
  filters?: {
    runtime?: CanvasAgentToolRuntime | readonly CanvasAgentToolRuntime[]
    permission?:
      | CanvasAgentToolPermission
      | readonly CanvasAgentToolPermission[]
  }
): boolean {
  return enabledCanvasAgentTools(manifest, filters).some(
    (tool) => tool.name === name
  )
}

export function canvasAgentActionAllowed(
  manifest: CanvasAgentCapabilityManifest | undefined | null,
  action: {
    type: CanvasAgentActionType
    elementType?: z.infer<typeof canvasDocumentElementTypeSchema>
    mediaType?: CanvasAgentGenerationMediaType
  }
): boolean {
  const enabled = enabledCanvasAgentCapabilities(manifest)
  if (!enabled.enabledActions.has(action.type)) return false
  if (action.type === 'element.add' && action.elementType) {
    return enabled.enabledElementTypes.has(action.elementType)
  }
  if (action.type === 'element.generate' && action.mediaType) {
    return enabledCanvasAgentGenerationMediaTypes(manifest).has(
      action.mediaType
    )
  }
  return true
}

export type CanvasAgentActionType = z.infer<typeof canvasAgentActionTypeSchema>
export type CanvasAgentGenerationMediaType = z.infer<
  typeof canvasAgentGenerationMediaTypeSchema
>
export type CanvasAgentToolRuntime = z.infer<
  typeof canvasAgentToolRuntimeSchema
>
export type CanvasAgentToolPermission = z.infer<
  typeof canvasAgentToolPermissionSchema
>
export type CanvasAgentToolCategory = z.infer<
  typeof canvasAgentToolCategorySchema
>
export type CanvasAgentElementCapability = z.infer<
  typeof canvasAgentElementCapabilitySchema
>
export type CanvasAgentActionCapability = z.infer<
  typeof canvasAgentActionCapabilitySchema
>
export type CanvasAgentRecipeCapability = z.infer<
  typeof canvasAgentRecipeCapabilitySchema
>
export type CanvasAgentToolCapability = z.infer<
  typeof canvasAgentToolCapabilitySchema
>
export type CanvasAgentCapabilityManifest = z.infer<
  typeof canvasAgentCapabilityManifestSchema
>
