import { z } from 'zod'

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
    action: z.enum(['createNode', 'patchNodeData', 'createEdge', 'deleteNode']),
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
    actionTypes: z
      .array(
        z.enum(['createNode', 'patchNodeData', 'createEdge', 'deleteNode'])
      )
      .default([]),
    starterIntent: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const canvasAgentToolCapabilitySchema = z
  .object({
    name: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1).optional(),
    category: z.enum([
      'canvas',
      'generation',
      'prompt',
      'memory',
      'review',
      'other'
    ]),
    enabled: z.boolean().default(true),
    visible: z.boolean().default(true),
    streaming: z.boolean().default(false),
    interruptible: z.boolean().default(false),
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
  { action: 'deleteNode', enabled: true }
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
    outputFields: ['resourceUrl', 'assetId']
  },
  {
    nodeType: 'canvasAiVideo',
    title: 'Video',
    supportsGeneration: true,
    mediaKind: 'video',
    requiredFields: ['seedPrompt'],
    outputFields: ['resourceUrl', 'assetId', 'taskId']
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
  }
] as const

export function createDefaultCanvasAgentCapabilityManifest() {
  return canvasAgentCapabilityManifestSchema.parse({
    source: 'server',
    generatedAt: new Date().toISOString(),
    actions: DEFAULT_CANVAS_AGENT_ACTION_CAPABILITIES,
    nodes: DEFAULT_CANVAS_AGENT_NODE_CAPABILITIES,
    workflows: DEFAULT_CANVAS_AGENT_WORKFLOW_CAPABILITIES,
    tools: [
      {
        name: 'canvas.plan',
        title: 'Canvas planning',
        category: 'canvas',
        enabled: true,
        visible: true,
        streaming: false,
        interruptible: true
      },
      {
        name: 'prompt.improve',
        title: 'Prompt improvement',
        category: 'prompt',
        enabled: true,
        visible: true,
        streaming: false,
        interruptible: true
      },
      {
        name: 'canvas.execute_actions',
        title: 'Canvas execution',
        category: 'canvas',
        enabled: true,
        visible: true,
        streaming: true,
        interruptible: true
      }
    ]
  })
}

export function enabledCanvasAgentCapabilities(
  manifest?: CanvasAgentCapabilityManifest | null
) {
  const normalized = manifest ?? createDefaultCanvasAgentCapabilityManifest()
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
  const enabledToolNames = new Set(
    normalized.tools
      .filter((item) => item.enabled && item.visible)
      .map((item) => item.name)
  )

  return {
    manifest: normalized,
    enabledActions,
    enabledNodeTypes,
    enabledWorkflowIds,
    enabledToolNames
  }
}

export function canvasAgentActionAllowed(
  manifest: CanvasAgentCapabilityManifest | undefined | null,
  action: {
    type: 'createNode' | 'patchNodeData' | 'createEdge' | 'deleteNode'
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
