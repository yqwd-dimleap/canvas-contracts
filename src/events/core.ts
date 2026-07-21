/**
 * Canvas v2 runtime event union.
 *
 * This is the single event vocabulary used by the AI Native Canvas runtime.
 * Feature code should import SystemEvent/SystemEventSchema from this module
 * instead of defining frontend/backend runtime envelopes.
 */

import { z } from 'zod'
import {
  type CanvasRuntimeEvent,
  canvasRuntimeEventSchema
} from '../canvas/events/operations.js'
import { type AgentEvent, agentEventSchema } from './agent.js'
import { type ArtifactEvent, artifactEventSchema } from './artifact.js'
import { type RuntimeEvent, runtimeEventSchema } from './runtime.js'
import { type ToolEvent, toolEventSchema } from './tool.js'

export const systemEventSchema = z.union([
  runtimeEventSchema,
  agentEventSchema,
  toolEventSchema,
  artifactEventSchema,
  canvasRuntimeEventSchema
])

export const sequencedSystemEventSchema = z.object({
  sequence: z.number().int().nonnegative().optional(),
  event: systemEventSchema
})

export type SystemEvent =
  | RuntimeEvent
  | AgentEvent
  | ToolEvent
  | ArtifactEvent
  | CanvasRuntimeEvent

export type SequencedSystemEvent = z.infer<typeof sequencedSystemEventSchema>
