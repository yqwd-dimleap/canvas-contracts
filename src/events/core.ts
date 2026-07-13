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
import { baseEventSchema } from './base.js'
import { type RuntimeEvent, runtimeEventSchema } from './runtime.js'
import { type SystemControlEvent, systemControlEventSchema } from './system.js'
import { type ToolEvent, toolEventSchema } from './tool.js'
import { type UserEvent, userEventSchema } from './user.js'

export const systemEventSchema = z.union([
  runtimeEventSchema,
  agentEventSchema,
  toolEventSchema,
  artifactEventSchema,
  canvasRuntimeEventSchema,
  userEventSchema,
  systemControlEventSchema
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
  | UserEvent
  | SystemControlEvent

export type SequencedSystemEvent = z.infer<typeof sequencedSystemEventSchema>

export function isSystemEvent(value: unknown): value is SystemEvent {
  return systemEventSchema.safeParse(value).success
}

export function isBaseCanvasEvent(value: unknown) {
  return baseEventSchema.safeParse(value).success
}
