import { z } from 'zod'
import { edgeDependencyTypeSchema, resourceFilterSchema } from './resources.js'

/**
 * Project canvas edge schema - represents connections between nodes in the workflow graph.
 * Edges control data flow, dependencies, and resource passing between nodes.
 */

export const projectCanvasEdgeVariantSchema = z.enum(['solid', 'dashed'])

export const projectCanvasEdgeDataSchema = z.object({
  /** Visual variant: solid for data flow, dashed for references/wait dependencies */
  variant: projectCanvasEdgeVariantSchema.optional(),
  /** Semantic dependency type: data, reference, or wait */
  dependencyType: edgeDependencyTypeSchema.optional(),
  /** Optional filter for which resources are passed through this edge */
  resourceFilter: resourceFilterSchema.optional()
})

export const projectCanvasEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  data: projectCanvasEdgeDataSchema.optional()
})

export type ProjectCanvasEdgeVariant = z.infer<
  typeof projectCanvasEdgeVariantSchema
>
export type ProjectCanvasEdgeData = z.infer<typeof projectCanvasEdgeDataSchema>
export type ProjectCanvasEdge = z.infer<typeof projectCanvasEdgeSchema>
