import { z } from 'zod'
import { canvasResourceSchema } from './resources.js'

export const canvasNodeSnapshotSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().optional(),
    position: z
      .object({
        x: z.number(),
        y: z.number()
      })
      .optional(),
    data: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown())

export const canvasEdgeSnapshotSchema = z
  .object({
    id: z.string().optional(),
    source: z.string().min(1),
    target: z.string().min(1),
    data: z.record(z.string(), z.unknown()).optional()
  })
  .catchall(z.unknown())

export const canvasContextSchema = z
  .object({
    nodes: z.array(canvasNodeSnapshotSchema).default([]),
    edges: z.array(canvasEdgeSnapshotSchema).default([]),
    resources: z.array(canvasResourceSchema).default([])
  })
  .default({
    nodes: [],
    edges: [],
    resources: []
  })

export const canvasSelectionSchema = z
  .object({
    nodeIds: z.array(z.string()).default([]),
    resourceIds: z.array(z.string()).default([])
  })
  .default({
    nodeIds: [],
    resourceIds: []
  })

export type CanvasNodeSnapshot = z.infer<typeof canvasNodeSnapshotSchema>
export type CanvasEdgeSnapshot = z.infer<typeof canvasEdgeSnapshotSchema>
export type CanvasContext = z.infer<typeof canvasContextSchema>
export type CanvasSelection = z.infer<typeof canvasSelectionSchema>
