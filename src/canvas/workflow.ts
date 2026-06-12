import { z } from 'zod'
import { canvasDocumentSchema } from './document.js'
import {
  base64ImageSourceSchema,
  canvasNodeGenerationConfigSchema,
  imageTransportModeSchema,
  urlImageSourceSchema
} from './generation.js'
import { canvasMediaEntrySchema, xyPositionSchema } from './media.js'
import { type CanvasResource, canvasResourceSchema } from './resources.js'

/**
 * Resource arrays shared across all node data types.
 * These track input/output/manual resources for workflow execution.
 */
const resourceArrays = {
  inputResources: z.array(canvasResourceSchema).optional(),
  outputResources: z.array(canvasResourceSchema).optional(),
  manualResources: z.array(canvasResourceSchema).optional()
}

/**
 * Exported type for node resource arrays.
 * All node data types extend this interface.
 */
export type NodeResourceArrays = {
  inputResources?: CanvasResource[]
  outputResources?: CanvasResource[]
  manualResources?: CanvasResource[]
}

export const projectCanvasNodeTypeSchema = z.enum([
  'canvasNormalResource',
  'canvasAiPrompt',
  'canvasAiImage',
  'canvasAiVideo',
  'canvasAiWrite',
  'canvasAiWriteShot',
  'canvasAiStoryboardTable',
  'canvasAiImageGrid',
  'canvasText',
  'canvasShape',
  'canvasFrame',
  'canvasImageEdit',
  'canvasMockup',
  'canvasVector',
  'canvasMask',
  'canvasComposition'
])

export const canvasNodeActionSchema = z.enum([
  'crop',
  'adjust',
  'mockup',
  'vectorize',
  'mask',
  'frame',
  'text',
  'shape',
  'rotateLeft',
  'rotateRight',
  'flipHorizontal',
  'flipVertical',
  'duplicate',
  'download',
  'delete'
])

export const canvasNodeCapabilitySchema = z.enum([
  'mediaInput',
  'mediaOutput',
  'text',
  'shape',
  'frame',
  'crop',
  'adjust',
  'mockup',
  'vector',
  'mask',
  'composition'
])

const canvasNodeStyleSchema = z.object({
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  radius: z.number().optional(),
  rotation: z.number().optional()
})

export const canvasCreativeNodeBaseDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  actions: z.array(canvasNodeActionSchema).optional(),
  capabilities: z.array(canvasNodeCapabilitySchema).optional(),
  style: canvasNodeStyleSchema.optional(),
  ...resourceArrays
})

export const canvasTextNodeDataSchema = canvasCreativeNodeBaseDataSchema.extend(
  {
    text: z.string(),
    fontFamily: z.string().optional(),
    fontSize: z.number().positive().optional(),
    fontWeight: z.number().optional(),
    color: z.string().optional(),
    align: z.enum(['left', 'center', 'right']).optional()
  }
)

export const canvasShapeNodeDataSchema =
  canvasCreativeNodeBaseDataSchema.extend({
    shape: z.enum(['rectangle', 'ellipse', 'triangle', 'line']),
    label: z.string().optional()
  })

export const canvasFrameNodeDataSchema =
  canvasCreativeNodeBaseDataSchema.extend({
    frameKind: z
      .enum(['freeform', 'square', 'portrait', 'landscape'])
      .optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  })

export const canvasImageEditNodeDataSchema =
  canvasCreativeNodeBaseDataSchema.extend({
    documentId: z.string().optional(),
    sourceNodeId: z.string().optional(),
    sourceResourceId: z.string().nullable().optional(),
    sourceUrl: z.string().optional(),
    previewUrl: z.string().nullable().optional(),
    outputUrl: z.string().nullable().optional(),
    outputResourceId: z.string().nullable().optional(),
    errorMessage: z.string().optional(),
    operations: z
      .array(
        z.object({
          id: z.string(),
          action: canvasNodeActionSchema,
          params: z.record(z.string(), z.unknown()).optional()
        })
      )
      .optional()
  })

export const canvasMockupNodeDataSchema =
  canvasCreativeNodeBaseDataSchema.extend({
    sourceNodeId: z.string().optional(),
    sourceUrl: z.string().optional(),
    device: z.string().optional()
  })

export const canvasVectorNodeDataSchema =
  canvasCreativeNodeBaseDataSchema.extend({
    sourceNodeId: z.string().optional(),
    sourceUrl: z.string().optional(),
    svg: z.string().optional()
  })

export const canvasMaskNodeDataSchema = canvasCreativeNodeBaseDataSchema.extend(
  {
    sourceNodeId: z.string().optional(),
    sourceUrl: z.string().optional(),
    maskUrl: z.string().optional()
  }
)

export const canvasCompositionNodeDataSchema =
  canvasCreativeNodeBaseDataSchema.extend({
    childrenNodeIds: z.array(z.string()).optional(),
    outputUrl: z.string().optional()
  })

export const normalResourceNodeDataSchema = z.object({
  src: z.string(),
  caption: z.string().optional(),
  kind: z.enum(['image', 'video']),
  assetId: z.string().nullable().optional(),
  modelUrl: z.string().nullable().optional(),
  ...resourceArrays
})

export const aiPromptNodeDataSchema = z.object({
  title: z.string().optional(),
  prompt: z.string(),
  enrichModel: z.string().optional(),
  errorMessage: z.string().optional(),
  parentWriteNodeId: z.string().optional(),
  ...resourceArrays
})

export const aiImageNodeDataSchema = z.object({
  title: z.string().optional(),
  hint: z.string().optional(),
  thumbnailSrc: z.string().optional(),
  imageAssetId: z.string().nullable().optional(),
  imageModelUrl: z.string().nullable().optional(),
  seedPrompt: z.string().optional(),
  errorMessage: z.string().optional(),
  parentWriteNodeId: z.string().optional(),
  generation: canvasNodeGenerationConfigSchema.partial().optional(),
  ...resourceArrays
})

export const aiVideoNodeDataSchema = z.object({
  title: z.string().optional(),
  hint: z.string().optional(),
  thumbnailSrc: z.string().optional(),
  videoAssetId: z.string().nullable().optional(),
  videoModelUrl: z.string().nullable().optional(),
  durationLabel: z.string().optional(),
  errorMessage: z.string().optional(),
  seedPrompt: z.string().optional(),
  refCanvasNodeId: z.string().optional(),
  parentWriteNodeId: z.string().optional(),
  mergePipelineRole: z.literal('gridOutput').optional(),
  generation: canvasNodeGenerationConfigSchema.partial().optional(),
  i2vImageTransportMode: imageTransportModeSchema.optional(),
  i2vUploadedImages: z.array(base64ImageSourceSchema).optional(),
  i2vUrlImages: z.array(urlImageSourceSchema).optional(),
  i2vPendingUrl: z.string().optional(),
  flowGenerationPending: z.boolean().optional(),
  ...resourceArrays
})

export const aiWriteNodeDataSchema = z.object({
  title: z.string().optional(),
  hint: z.string().optional(),
  script: z.string().optional(),
  shotCount: z.number().optional(),
  linkedTableNodeId: z.string().optional(),
  errorMessage: z.string().optional(),
  ...resourceArrays
})

export const aiWriteShotNodeDataSchema = z.object({
  title: z.string().optional(),
  parentWriteNodeId: z.string(),
  shotText: z.string(),
  shotIndex: z.number(),
  totalShots: z.number(),
  imagePrompt: z.string().optional(),
  thumbnailSrc: z.string().optional(),
  imageAssetId: z.string().nullable().optional(),
  imageModelUrl: z.string().nullable().optional(),
  errorMessage: z.string().optional(),
  ...resourceArrays
})

export const storyboardTableRowSchema = z.object({
  beat: z.string(),
  imagePrompt: z.string(),
  thumbnailSrc: z.string().optional()
})

export const storyboardTableNodeDataSchema = z.object({
  title: z.string().optional(),
  script: z.string().optional(),
  rows: z.array(storyboardTableRowSchema),
  linkedGridNodeId: z.string().optional(),
  parentWriteNodeId: z.string().optional(),
  errorMessage: z.string().optional(),
  ...resourceArrays
})

export const imageGridNodeDataSchema = z.object({
  title: z.string().optional(),
  parentTableNodeId: z.string().optional(),
  cellPrompts: z.array(z.string()),
  cellUrls: z.array(z.string().optional()),
  pipelineImageNodeIds: z.array(z.string()).optional(),
  pipelineVideoNodeIds: z.array(z.string()).optional(),
  pipelineMergeVideoNodeId: z.string().optional(),
  errorMessage: z.string().optional(),
  ...resourceArrays
})

export const projectCanvasFlowNodeSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasNormalResource'),
    position: xyPositionSchema,
    data: normalResourceNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiPrompt'),
    position: xyPositionSchema,
    data: aiPromptNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiImage'),
    position: xyPositionSchema,
    data: aiImageNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiVideo'),
    position: xyPositionSchema,
    data: aiVideoNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiWrite'),
    position: xyPositionSchema,
    data: aiWriteNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiWriteShot'),
    position: xyPositionSchema,
    data: aiWriteShotNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiStoryboardTable'),
    position: xyPositionSchema,
    data: storyboardTableNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasAiImageGrid'),
    position: xyPositionSchema,
    data: imageGridNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasText'),
    position: xyPositionSchema,
    data: canvasTextNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasShape'),
    position: xyPositionSchema,
    data: canvasShapeNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasFrame'),
    position: xyPositionSchema,
    data: canvasFrameNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasImageEdit'),
    position: xyPositionSchema,
    data: canvasImageEditNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasMockup'),
    position: xyPositionSchema,
    data: canvasMockupNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasVector'),
    position: xyPositionSchema,
    data: canvasVectorNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasMask'),
    position: xyPositionSchema,
    data: canvasMaskNodeDataSchema
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('canvasComposition'),
    position: xyPositionSchema,
    data: canvasCompositionNodeDataSchema
  })
])

export const persistedProjectCanvasSchema = z.object({
  mediaEntries: z.array(canvasMediaEntrySchema),
  nodes: z.array(projectCanvasFlowNodeSchema),
  edges: z.array(z.record(z.string(), z.unknown())),
  canvasDocuments: z.array(canvasDocumentSchema).default([])
})

export type ProjectCanvasNodeType = z.infer<typeof projectCanvasNodeTypeSchema>
export type NormalResourceNodeData = z.infer<
  typeof normalResourceNodeDataSchema
>
export type AiPromptNodeData = z.infer<typeof aiPromptNodeDataSchema>
export type AiImageNodeData = z.infer<typeof aiImageNodeDataSchema>
export type AiVideoNodeData = z.infer<typeof aiVideoNodeDataSchema>
export type AiWriteNodeData = z.infer<typeof aiWriteNodeDataSchema>
export type AiWriteShotNodeData = z.infer<typeof aiWriteShotNodeDataSchema>
export type StoryboardTableRow = z.infer<typeof storyboardTableRowSchema>
export type StoryboardTableNodeData = z.infer<
  typeof storyboardTableNodeDataSchema
>
export type ImageGridNodeData = z.infer<typeof imageGridNodeDataSchema>
export type CanvasNodeAction = z.infer<typeof canvasNodeActionSchema>
export type CanvasNodeCapability = z.infer<typeof canvasNodeCapabilitySchema>
export type CanvasNodeStyle = z.infer<typeof canvasNodeStyleSchema>
export type CanvasCreativeNodeBaseData = z.infer<
  typeof canvasCreativeNodeBaseDataSchema
>
export type CanvasTextNodeData = z.infer<typeof canvasTextNodeDataSchema>
export type CanvasShapeNodeData = z.infer<typeof canvasShapeNodeDataSchema>
export type CanvasFrameNodeData = z.infer<typeof canvasFrameNodeDataSchema>
export type CanvasImageEditNodeData = z.infer<
  typeof canvasImageEditNodeDataSchema
>
export type CanvasMockupNodeData = z.infer<typeof canvasMockupNodeDataSchema>
export type CanvasVectorNodeData = z.infer<typeof canvasVectorNodeDataSchema>
export type CanvasMaskNodeData = z.infer<typeof canvasMaskNodeDataSchema>
export type CanvasCompositionNodeData = z.infer<
  typeof canvasCompositionNodeDataSchema
>
export type ProjectCanvasFlowNode = z.infer<typeof projectCanvasFlowNodeSchema>
export type PersistedProjectCanvas = z.infer<
  typeof persistedProjectCanvasSchema
>
