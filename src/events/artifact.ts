/**
 * Artifact 事件类型
 */

import { z } from 'zod'
import { artifactPatchSchema, artifactSchema } from '../artifacts/index.js'
import { baseEventSchema } from './base.js'

/**
 * Artifact 创建事件
 */
export const artifactCreateEventSchema = baseEventSchema.extend({
  type: z.literal('artifact.create'),
  artifactId: z.string(),
  artifactType: z.string(),
  title: z.string().optional(),
  artifact: artifactSchema
})

export type ArtifactCreateEvent = z.infer<typeof artifactCreateEventSchema>

/**
 * Artifact 更新事件
 */
export const artifactUpdateEventSchema = baseEventSchema.extend({
  type: z.literal('artifact.update'),
  artifactId: z.string(),
  patch: artifactPatchSchema,
  artifact: artifactSchema.optional()
})

export type ArtifactUpdateEvent = z.infer<typeof artifactUpdateEventSchema>

/**
 * Artifact 完成事件
 */
export const artifactCompleteEventSchema = baseEventSchema.extend({
  type: z.literal('artifact.complete'),
  artifactId: z.string(),
  artifact: artifactSchema
})

export type ArtifactCompleteEvent = z.infer<typeof artifactCompleteEventSchema>

/**
 * Artifact 删除事件
 */
export const artifactDeleteEventSchema = baseEventSchema.extend({
  type: z.literal('artifact.delete'),
  artifactId: z.string(),
  reason: z.string().optional()
})

export type ArtifactDeleteEvent = z.infer<typeof artifactDeleteEventSchema>

/**
 * Artifact 事件联合类型
 */
export const artifactEventSchema = z.discriminatedUnion('type', [
  artifactCreateEventSchema,
  artifactUpdateEventSchema,
  artifactCompleteEventSchema,
  artifactDeleteEventSchema
])

export type ArtifactEvent =
  | ArtifactCreateEvent
  | ArtifactUpdateEvent
  | ArtifactCompleteEvent
  | ArtifactDeleteEvent
