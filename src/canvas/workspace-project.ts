import { z } from 'zod'
import {
  workspaceAssetMetadataSchema,
  workspaceAssetTypeSchema
} from '../storage/workspace-assets.js'
import { canvas2dWorkspaceViewSchema } from './canvas2d.js'
import { canvasDocumentSchema } from './document.js'
import { canvasResourceSchema } from './resources.js'

export const workspaceProjectSummaryMediaSourceSchema = z.enum([
  'cover',
  'session',
  'run',
  'resource',
  'node',
  'asset'
])

export const workspaceProjectTitleSourceSchema = z.enum([
  'manual',
  'agent',
  'prompt',
  'run',
  'fallback'
])

export const workspaceProjectSummaryMediaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'video']),
  url: z.string().min(1),
  posterUrl: z.string().default(''),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  durationSec: z.number().positive().optional(),
  source: workspaceProjectSummaryMediaSourceSchema,
  label: z.string().optional(),
  createdAt: z.string().optional()
})

export const workspaceProjectSummaryCoverSchema = z.object({
  url: z.string().min(1),
  posterUrl: z.string().default(''),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  sourceMediaId: z.string().optional()
})

export const workspaceProjectSummarySchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  titleSource: workspaceProjectTitleSourceSchema,
  cover: workspaceProjectSummaryCoverSchema.nullable(),
  media: z.array(workspaceProjectSummaryMediaSchema).default([]),
  mediaCount: z.number().int().nonnegative(),
  prompt: z.string().default(''),
  model: z.string().default(''),
  updatedAt: z.number()
})

export const workspaceProjectPreviewDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
})

export const recentWorkspaceProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  previewImage: z.string(),
  previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
  updatedAt: z.number()
})

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function normalizeWorkspaceProjectCanvasPayloadInput(value: unknown) {
  const record = recordValue(value)
  if (!record) return value

  const { nodes: _nodes, edges: _edges, canvasDocuments, ...rest } = record
  const canvasDocument =
    recordValue(record.canvasDocument) ??
    (Array.isArray(canvasDocuments)
      ? (canvasDocuments.find((item) => recordValue(item)) ?? null)
      : null)

  return {
    ...rest,
    schemaVersion: 2,
    canvasDocument
  }
}

export const workspaceProjectCanvasPayloadV2Schema = z
  .object({
    schemaVersion: z.literal(2).default(2),
    canvasDocument: canvasDocumentSchema.nullable().default(null),
    conversations: z.array(z.unknown()).default([]),
    activeConversationId: z.string().nullable().default(null),
    orphanResources: z.array(canvasResourceSchema).default([]),
    canvas2d: canvas2dWorkspaceViewSchema.optional(),
    updatedAt: z.number().optional()
  })
  .strict()

export const workspaceProjectCanvasPayloadSchema = z.preprocess(
  normalizeWorkspaceProjectCanvasPayloadInput,
  workspaceProjectCanvasPayloadV2Schema
)

export const workspaceProjectResourcesSchema =
  workspaceProjectCanvasPayloadSchema

export const workspaceProjectAssetSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  projectId: z.string().nullable().optional(),
  type: workspaceAssetTypeSchema,
  name: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  url: z.string().nullable(),
  metadata: workspaceAssetMetadataSchema.default({}),
  createdAt: z.string().or(z.number()).or(z.date()),
  updatedAt: z.string().or(z.number()).or(z.date())
})

export const workspaceProjectSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  title: z.string(),
  status: z.string(),
  historyId: z.string().nullable(),
  previewImage: z.string(),
  previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
  runs: z.array(z.unknown()).default([]),
  session: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().or(z.number()),
  updatedAt: z.string().or(z.number()),
  assets: z.array(workspaceProjectAssetSchema).optional(),
  resources: workspaceProjectResourcesSchema.optional(),
  summary: workspaceProjectSummarySchema.optional(),
  publishStatus: z
    .enum(['none', 'pending_review', 'published', 'rejected'])
    .optional(),
  publishSubmittedAt: z.string().optional(),
  publishReview: z.record(z.string(), z.unknown()).optional(),
  publishCoverMediaId: z.string().optional(),
  publishCoverDimensions: workspaceProjectPreviewDimensionsSchema.optional()
})

export const workspaceProjectImageDefaultsSchema = z
  .record(z.string(), z.unknown())
  .default({})

export const workspaceProjectDocumentSchema =
  workspaceProjectCanvasPayloadV2Schema.extend({
    id: z.string().min(1),
    userId: z.string().optional(),
    title: z.string(),
    status: z.string(),
    previewImage: z.string(),
    previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
    runs: z.array(z.unknown()).default([]),
    historyId: z.string().nullable(),
    createdAt: z.number(),
    updatedAt: z.number(),
    defaults: workspaceProjectImageDefaultsSchema.optional(),
    summary: workspaceProjectSummarySchema.optional()
  })

export function parseWorkspaceProjectResources(
  value: unknown
): WorkspaceProjectCanvasPayload {
  return workspaceProjectResourcesSchema.parse(value)
}

export function safeParseWorkspaceProjectResources(
  value: unknown
): WorkspaceProjectCanvasPayload | null {
  const result = workspaceProjectResourcesSchema.safeParse(value)
  return result.success ? result.data : null
}

export type WorkspaceProjectSummaryMediaSource = z.infer<
  typeof workspaceProjectSummaryMediaSourceSchema
>
export type WorkspaceProjectTitleSource = z.infer<
  typeof workspaceProjectTitleSourceSchema
>
export type WorkspaceProjectSummaryMedia = z.infer<
  typeof workspaceProjectSummaryMediaSchema
>
export type WorkspaceProjectSummaryCover = z.infer<
  typeof workspaceProjectSummaryCoverSchema
>
export type WorkspaceProjectSummary = z.infer<
  typeof workspaceProjectSummarySchema
>
export type WorkspaceProjectPreviewDimensions = z.infer<
  typeof workspaceProjectPreviewDimensionsSchema
>
export type RecentWorkspaceProject = z.infer<
  typeof recentWorkspaceProjectSchema
>
export type WorkspaceProjectCanvasPayload = z.infer<
  typeof workspaceProjectCanvasPayloadSchema
>
export type WorkspaceProjectResources = z.infer<
  typeof workspaceProjectResourcesSchema
>
export type WorkspaceProjectAsset = z.infer<typeof workspaceProjectAssetSchema>
export type WorkspaceProject = z.infer<typeof workspaceProjectSchema>
export type WorkspaceProjectImageDefaults = z.infer<
  typeof workspaceProjectImageDefaultsSchema
>
export type WorkspaceProjectDocument = z.infer<
  typeof workspaceProjectDocumentSchema
>
