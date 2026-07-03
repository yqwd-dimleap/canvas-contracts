import { z } from 'zod'
import { canvasOperationSchema } from '../canvas/operations.js'
import { baseEventSchema } from './base.js'

/**
 * Renderer-agnostic Canvas operation event.
 *
 * Runtime channels must transport canvas changes through this single event
 * type. UI-specific node/edge event variants are intentionally not part of the
 * contract; adapters can derive renderer updates from CanvasOperation.
 */
export const canvasOperationEventSchema = baseEventSchema.extend({
  type: z.literal('canvas.operation'),
  operation: canvasOperationSchema,
  artifactId: z.string().min(1).optional(),
  transient: z.boolean().default(false)
})

export type CanvasOperationEvent = z.infer<typeof canvasOperationEventSchema>

/**
 * Canvas runtime event union.
 */
export const canvasRuntimeEventSchema = canvasOperationEventSchema

export type CanvasRuntimeEvent = CanvasOperationEvent
