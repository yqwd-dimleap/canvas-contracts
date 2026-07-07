import { z } from 'zod'

export const canvasAgentActionTypeSchema = z.enum([
  'createNode',
  'patchNodeData',
  'createEdge',
  'deleteNode',
  'document.create',
  'element.add',
  'element.patch',
  'element.delete',
  'element.reorder',
  'element.select',
  'viewport.focus'
])

export const canvasAgentNodeCapabilitySchema = z
  .object({
    nodeType: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    enabled: z.boolean().default(true),
    visible: z.boolean().default(true),
    supportsCreate: z.boolean().default(true),
    supportsPatch: z.boolean().default(true),
    supportsGeneration: z.boolean().default(false),
    mediaKind: z.enum(['text', 'image', 'video', 'data']).optional(),
    requiredFields: z.array(z.string().min(1)).default([]),
    outputFields: z.array(z.string().min(1)).default([]),
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

export const canvasAgentWorkflowCapabilitySchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    enabled: z.boolean().default(true),
    visible: z.boolean().default(true),
    intentKinds: z
      .array(
        z.enum([
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
    nodeTypes: z.array(z.string().min(1)).default([]),
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
    nodeTypes: z.array(z.string().min(1)),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const canvasAgentCapabilityManifestSchema = z
  .object({
    version: z
      .literal('canvas-agent-capabilities.v2')
      .default('canvas-agent-capabilities.v2'),
    generatedAt: z.string().min(1).optional(),
    source: z.enum(['frontend', 'server', 'test']).default('frontend'),
    actions: z.array(canvasAgentActionCapabilitySchema).default([]),
    nodes: z.array(canvasAgentNodeCapabilitySchema).default([]),
    workflows: z.array(canvasAgentWorkflowCapabilitySchema).default([]),
    tools: z.array(canvasAgentToolCapabilitySchema).default([]),
    disabledReasonById: z.record(z.string(), z.string()).default({}),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const DEFAULT_CANVAS_AGENT_ACTION_CAPABILITIES = [
  { action: 'createNode', enabled: true },
  { action: 'patchNodeData', enabled: true },
  { action: 'createEdge', enabled: true },
  { action: 'deleteNode', enabled: true },
  { action: 'document.create', enabled: true },
  { action: 'element.add', enabled: true },
  { action: 'element.patch', enabled: true },
  { action: 'element.delete', enabled: true },
  { action: 'element.reorder', enabled: true },
  { action: 'element.select', enabled: true },
  { action: 'viewport.focus', enabled: true }
] as const

export const DEFAULT_CANVAS_AGENT_NODE_CAPABILITIES = [
  {
    nodeType: 'canvasAiPrompt',
    title: 'Prompt',
    supportsGeneration: false,
    mediaKind: 'text',
    requiredFields: ['prompt'],
    outputFields: ['prompt', 'expandedPrompt']
  },
  {
    nodeType: 'canvasAiImage',
    title: 'Image',
    supportsGeneration: true,
    mediaKind: 'image',
    requiredFields: ['seedPrompt'],
    outputFields: ['assetId']
  },
  {
    nodeType: 'canvasAiVideo',
    title: 'Video',
    supportsGeneration: true,
    mediaKind: 'video',
    requiredFields: ['seedPrompt'],
    outputFields: ['assetId', 'taskId']
  }
] as const

export const DEFAULT_CANVAS_AGENT_WORKFLOW_CAPABILITIES = [
  {
    id: 'prompt-to-image',
    title: 'Prompt to image',
    intentKinds: ['image'],
    nodeTypes: ['canvasAiPrompt', 'canvasAiImage'],
    actionTypes: ['createNode', 'createEdge']
  },
  {
    id: 'direct-image',
    title: 'Direct image',
    intentKinds: ['image'],
    nodeTypes: ['canvasAiImage'],
    actionTypes: ['createNode']
  },
  {
    id: 'prompt-to-video',
    title: 'Prompt to video',
    intentKinds: ['video'],
    nodeTypes: ['canvasAiPrompt', 'canvasAiVideo'],
    actionTypes: ['createNode', 'createEdge']
  },
  {
    id: 'direct-video',
    title: 'Direct video',
    intentKinds: ['video'],
    nodeTypes: ['canvasAiVideo'],
    actionTypes: ['createNode']
  },
  {
    id: 'image-to-video',
    title: 'Image to video',
    intentKinds: ['video', 'video_edit'],
    nodeTypes: ['canvasAiVideo'],
    actionTypes: ['createNode', 'createEdge']
  },
  {
    id: 'canvas2d-composition',
    title: 'Canvas2D composition',
    intentKinds: ['image', 'image_edit', 'question'],
    nodeTypes: [],
    actionTypes: [
      'document.create',
      'element.add',
      'element.patch',
      'element.delete',
      'element.reorder',
      'element.select',
      'viewport.focus'
    ],
    metadata: {
      surface: 'canvas2d'
    }
  }
] as const

export const CANVAS_AGENT_TOOL_NAMES = {
  inspect: 'canvas_inspect',
  inspectGraph: 'canvas.inspect_graph',
  inspectAssets: 'canvas.inspect_assets',
  inspectGenerationState: 'canvas.inspect_generation_state',
  inspectCanvas2dScene: 'canvas2d.inspect_scene',
  inspectCanvas2dElements: 'canvas2d.inspect_elements',
  inspectCanvas2dSelection: 'canvas2d.inspect_selection',
  searchWorkflows: 'rag_search_workflows',
  searchPromptTemplates: 'rag_search_prompt_templates',
  executeActions: 'canvas.execute_actions'
} as const

export type CanvasAgentToolName =
  (typeof CANVAS_AGENT_TOOL_NAMES)[keyof typeof CANVAS_AGENT_TOOL_NAMES]

export const DEFAULT_CANVAS_AGENT_TOOL_CAPABILITIES = [
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspect,
    title: 'Inspect current content',
    description: 'Read selected and existing canvas content for planning.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectGraph,
    title: 'Inspect canvas graph',
    description:
      'Read graph relationships, upstream sources, downstream outputs, and isolated content.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectAssets,
    title: 'Inspect assets',
    description:
      'Read lightweight canvas resource metadata and media references for planning.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectGenerationState,
    title: 'Inspect generation state',
    description:
      'Read generation status, model settings, failures, and retry/edit readiness.',
    category: 'generation',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectCanvas2dScene,
    title: 'Inspect Canvas2D scene',
    description:
      'Read active Canvas2D document, viewport, bounds, and element overview.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectCanvas2dElements,
    title: 'Inspect Canvas2D elements',
    description:
      'Read Canvas2D element order, bounds, visibility, resources, and editable properties.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.inspectCanvas2dSelection,
    title: 'Inspect Canvas2D selection',
    description:
      'Read selected Canvas2D elements and the actions they can safely support.',
    category: 'review',
    runtime: 'langchain',
    permission: 'read',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'understand',
      surface: 'canvas2d'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.searchWorkflows,
    title: 'Reference workflow patterns',
    description: 'Search similar workflow structures and action patterns.',
    category: 'memory',
    runtime: 'langchain',
    permission: 'reference',
    enabled: true,
    visible: true,
    streaming: false,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [],
    nodeTypes: [],
    metadata: {
      uiGroup: 'reference'
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
    nodeTypes: [],
    metadata: {
      uiGroup: 'reference'
    }
  },
  {
    name: CANVAS_AGENT_TOOL_NAMES.executeActions,
    title: 'Apply generated results',
    description: 'Materialize planned changes through the canvas runtime.',
    category: 'canvas',
    runtime: 'execution',
    permission: 'write',
    enabled: true,
    visible: true,
    streaming: true,
    interruptible: true,
    requiresConfirmation: false,
    actionTypes: [
      'createNode',
      'patchNodeData',
      'createEdge',
      'deleteNode',
      'document.create',
      'element.add',
      'element.patch',
      'element.delete',
      'element.reorder',
      'element.select',
      'viewport.focus'
    ],
    nodeTypes: DEFAULT_CANVAS_AGENT_NODE_CAPABILITIES.map(
      (node) => node.nodeType
    ),
    metadata: {
      uiGroup: 'apply',
      executionPath: 'canvas-agent'
    }
  }
] as const

export function createDefaultCanvasAgentCapabilityManifest() {
  return canvasAgentCapabilityManifestSchema.parse({
    source: 'server',
    generatedAt: new Date().toISOString(),
    actions: DEFAULT_CANVAS_AGENT_ACTION_CAPABILITIES,
    nodes: DEFAULT_CANVAS_AGENT_NODE_CAPABILITIES,
    workflows: DEFAULT_CANVAS_AGENT_WORKFLOW_CAPABILITIES,
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
  const enabledNodeTypes = new Set(
    normalized.nodes
      .filter((item) => item.enabled && item.visible)
      .map((item) => item.nodeType)
  )
  const enabledWorkflowIds = new Set(
    normalized.workflows
      .filter((item) => item.enabled && item.visible)
      .map((item) => item.id)
  )
  const enabledToolNames = new Set(enabledTools.map((item) => item.name))

  return {
    manifest: normalized,
    enabledActions,
    enabledNodeTypes,
    enabledWorkflowIds,
    enabledTools,
    enabledToolNames
  }
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
    nodeType?: string
  }
): boolean {
  const enabled = enabledCanvasAgentCapabilities(manifest)
  if (!enabled.enabledActions.has(action.type)) return false
  if (action.type === 'createNode') {
    if (!action.nodeType) return false
    return enabled.enabledNodeTypes.has(action.nodeType)
  }
  return true
}

export type CanvasAgentActionType = z.infer<typeof canvasAgentActionTypeSchema>
export type CanvasAgentToolRuntime = z.infer<
  typeof canvasAgentToolRuntimeSchema
>
export type CanvasAgentToolPermission = z.infer<
  typeof canvasAgentToolPermissionSchema
>
export type CanvasAgentToolCategory = z.infer<
  typeof canvasAgentToolCategorySchema
>
export type CanvasAgentNodeCapability = z.infer<
  typeof canvasAgentNodeCapabilitySchema
>
export type CanvasAgentActionCapability = z.infer<
  typeof canvasAgentActionCapabilitySchema
>
export type CanvasAgentWorkflowCapability = z.infer<
  typeof canvasAgentWorkflowCapabilitySchema
>
export type CanvasAgentToolCapability = z.infer<
  typeof canvasAgentToolCapabilitySchema
>
export type CanvasAgentCapabilityManifest = z.infer<
  typeof canvasAgentCapabilityManifestSchema
>
