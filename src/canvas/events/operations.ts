import { z } from 'zod'
import { baseEventSchema } from '../../events/base.js'
import {
  canvasMutationReceiptSchema,
  canvasMutationTransactionSchema,
  canvasTransientEffectSchema
} from '../core/mutations.js'

/** Internal audit vocabulary. UI transport projects these into protocol frames. */
export const canvasTransactionEventSchema = baseEventSchema.extend({
  type: z.literal('canvas.transaction'),
  transaction: canvasMutationTransactionSchema,
  receipt: canvasMutationReceiptSchema,
  artifactId: z.string().min(1).optional()
})

export const canvasTransientEffectEventSchema = baseEventSchema.extend({
  type: z.literal('canvas.effect'),
  effect: canvasTransientEffectSchema
})

export const canvasRuntimeEventSchema = z.discriminatedUnion('type', [
  canvasTransactionEventSchema,
  canvasTransientEffectEventSchema
])

export type CanvasTransactionEvent = z.infer<
  typeof canvasTransactionEventSchema
>
export type CanvasTransientEffectEvent = z.infer<
  typeof canvasTransientEffectEventSchema
>
export type CanvasRuntimeEvent = z.infer<typeof canvasRuntimeEventSchema>
