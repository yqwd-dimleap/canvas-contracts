import { z } from 'zod'
import { apiSuccessResponseSchema } from '../../api/response.js'
import {
  workspaceAssetMetadataSchema,
  workspaceAssetTypeSchema
} from '../../storage/workspace-assets.js'
import { canvasDocumentSchema } from '../core/document.js'
import { canvasMutationReceiptSchema } from '../core/mutations.js'

/** Persisted project Canvas schema baseline; independent from package semver. */
export const WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION = 2 as const

export const workspaceProjectMediaSourceSchema = z.enum([
  'cover',
  'session',
  'run',
  'resource',
  'asset'
])

export const workspaceProjectSummaryMediaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'video']),
  url: z.string().min(1),
  posterUrl: z.string().default(''),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  durationSec: z.number().positive().optional(),
  source: workspaceProjectMediaSourceSchema,
  label: z.string().optional(),
  createdAt: z.string().optional()
})

export const workspaceProjectSummarySchema = z.object({
  schemaVersion: z.literal(2),
  media: z.array(workspaceProjectSummaryMediaSchema).default([])
})

export const workspaceProjectPreviewDimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive()
})

export const workspaceProjectPublicationStatusSchema = z.enum([
  'pending_review',
  'published',
  'rejected'
])

export const workspaceProjectPublicationCheckStatusSchema = z.enum([
  'pass',
  'flag'
])

export const workspaceProjectPublicationMediaSchema =
  workspaceProjectSummaryMediaSchema.extend({
    prompt: z.string().optional(),
    model: z.string().optional(),
    size: z.string().optional(),
    quality: z.enum(['auto', 'high', 'medium', 'low']).optional(),
    runId: z.string().optional()
  })

export const workspaceProjectPublicationSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string(),
    prompt: z.string(),
    model: z.string(),
    media: z.array(workspaceProjectPublicationMediaSchema).min(1)
  })
  .strict()

export const workspaceProjectPublicationAutomatedReviewSchema = z
  .object({
    status: workspaceProjectPublicationCheckStatusSchema,
    notes: z.string(),
    reviewedAt: z.string()
  })
  .strict()

export const workspaceProjectPublicationHumanReviewSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    note: z.string().optional(),
    moderatorId: z.string(),
    reviewedAt: z.string()
  })
  .strict()

export const workspaceProjectPublicationSchema = z
  .object({
    status: workspaceProjectPublicationStatusSchema,
    submittedAt: z.string(),
    snapshot: workspaceProjectPublicationSnapshotSchema,
    automatedReview: workspaceProjectPublicationAutomatedReviewSchema,
    humanReview: workspaceProjectPublicationHumanReviewSchema.optional()
  })
  .strict()

export const workspaceProjectSessionSchema = z
  .object({
    prompt: z.string().optional(),
    imageTransportMode: z.enum(['url', 'base64']).optional(),
    uploadedImages: z.array(z.unknown()).optional(),
    urlImages: z.array(z.unknown()).optional(),
    pendingUrl: z.string().optional(),
    model: z.string().optional(),
    quality: z
      .enum(['auto', 'high', 'medium', 'low'])
      .optional()
      .catch(undefined),
    background: z.string().optional(),
    outputFormat: z.string().optional(),
    outputCompression: z.number().optional(),
    imageCount: z.number().optional(),
    sizeInputMode: z.enum(['preset', 'custom']).optional(),
    customSize: z.string().optional(),
    presetSize: z.string().optional(),
    isGenerating: z.boolean().optional(),
    taskStatus: z.string().optional(),
    generationProgress: z.record(z.string(), z.unknown()).optional(),
    noticeText: z.string().optional(),
    activeResultTab: z.string().optional(),
    previewImageUrls: z.array(z.string()).optional(),
    previewFallbackText: z.string().optional(),
    requestJson: z.string().optional(),
    responseJson: z.string().optional()
  })
  .loose()

export const workspaceProjectRunSchema = z.object({
  id: z.string().optional(),
  historyId: z.string().nullable().optional(),
  timestamp: z.number().optional(),
  status: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  previewImages: z.array(z.string()).default([]),
  errorMessage: z.string().optional()
})

export const recentWorkspaceProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  previewImage: z.string(),
  previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
  updatedAt: z.number()
})

/**
 * Canonical workspace Canvas snapshot. The identical shape is stored in
 * MongoDB `workspace_projects.canvas`, returned by the workspace API, and
 * cached locally by the frontend.
 */
export const workspaceProjectCanvasSchema = z
  .object({
    schemaVersion: z
      .literal(WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION)
      .default(WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION),
    revision: z.number().int().nonnegative().default(0),
    canvasDocument: canvasDocumentSchema.nullable().default(null),
    updatedAt: z.number().optional()
  })
  .strict()

export const workspaceProjectAgentStateSchema = z
  .object({
    activeThreadId: z.string().trim().min(1).nullable().default(null)
  })
  .strict()

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

/**
 * MongoDB project document schema
 * 项目完整存储结构
 */
export const workspaceProjectSchema = z.object({
  id: z.string().min(1),
  userId: z.string().optional(),
  title: z.string(),
  status: z.string(),
  historyId: z.string().nullable(),
  previewImage: z.string(),
  previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
  runs: z.array(workspaceProjectRunSchema).default([]),
  session: workspaceProjectSessionSchema.default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().or(z.number()),
  updatedAt: z.string().or(z.number()),
  assets: z.array(workspaceProjectAssetSchema).optional(),
  canvas: workspaceProjectCanvasSchema.optional(),
  agent: workspaceProjectAgentStateSchema.optional(),
  summary: workspaceProjectSummarySchema.optional(),
  publication: workspaceProjectPublicationSchema.optional()
})

const workspaceProjectRecordSchema = z.record(z.string(), z.unknown())

export const workspaceProjectCreateRequestSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    historyId: z.string().nullable().optional(),
    previewImage: z.string().optional(),
    previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
    runs: z.array(workspaceProjectRunSchema).optional(),
    session: workspaceProjectSessionSchema.optional(),
    metadata: workspaceProjectRecordSchema.optional()
  })
  .strict()

export const workspaceProjectUpdateRequestSchema = z
  .object({
    title: z.string().optional(),
    status: z.string().optional(),
    historyId: z.string().nullable().optional(),
    previewImage: z.string().optional(),
    previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
    runs: z.array(workspaceProjectRunSchema).optional(),
    session: workspaceProjectSessionSchema.optional(),
    metadata: workspaceProjectRecordSchema.optional(),
    assets: z.array(workspaceProjectAssetSchema).optional()
  })
  .strict()

export const workspaceProjectPublishRequestSchema = z
  .object({
    coverMediaId: z.string().trim().min(1).optional()
  })
  .strict()

export const listWorkspaceProjectsResponseSchema = z.object({
  projects: z.array(workspaceProjectSchema)
})

export const getWorkspaceProjectResponseSchema = z.object({
  project: workspaceProjectSchema
})

export const recentWorkspaceProjectsResponseSchema = z.object({
  projects: z.array(recentWorkspaceProjectSchema)
})

export const workspaceProjectDeleteResponseSchema = z.object({
  success: z.literal(true)
})

export const workspaceProjectPublishWithdrawResponseSchema = z.object({
  success: z.literal(true),
  status: z.enum(['withdrawn', 'unpublished'])
})

export const listWorkspaceProjectsApiResponseSchema = apiSuccessResponseSchema(
  listWorkspaceProjectsResponseSchema
)

export const workspaceProjectApiResponseSchema = apiSuccessResponseSchema(
  getWorkspaceProjectResponseSchema
)

export const workspaceProjectCanvasCommitApiResponseSchema =
  apiSuccessResponseSchema(
    z.object({
      receipt: canvasMutationReceiptSchema,
      canvas: workspaceProjectCanvasSchema
    })
  )

export const recentWorkspaceProjectsApiResponseSchema =
  apiSuccessResponseSchema(recentWorkspaceProjectsResponseSchema)

export const workspaceProjectDeleteApiResponseSchema = apiSuccessResponseSchema(
  workspaceProjectDeleteResponseSchema
)

export const workspaceProjectPublishWithdrawApiResponseSchema =
  apiSuccessResponseSchema(workspaceProjectPublishWithdrawResponseSchema)

export function parseWorkspaceProjectCanvas(
  value: unknown
): WorkspaceProjectCanvas {
  return workspaceProjectCanvasSchema.parse(value)
}

export type WorkspaceProjectSummary = z.infer<
  typeof workspaceProjectSummarySchema
>
export type WorkspaceProjectPublicationStatus = z.infer<
  typeof workspaceProjectPublicationStatusSchema
>
export type WorkspaceProjectPublication = z.infer<
  typeof workspaceProjectPublicationSchema
>
export type WorkspaceProjectPublicationSnapshot = z.infer<
  typeof workspaceProjectPublicationSnapshotSchema
>
export type RecentWorkspaceProject = z.infer<
  typeof recentWorkspaceProjectSchema
>

export type WorkspaceProjectCanvas = z.infer<
  typeof workspaceProjectCanvasSchema
>
export type WorkspaceProjectAgentState = z.infer<
  typeof workspaceProjectAgentStateSchema
>

export type WorkspaceProjectAsset = z.infer<typeof workspaceProjectAssetSchema>
export type WorkspaceProject = z.infer<typeof workspaceProjectSchema>
export type WorkspaceProjectCreateRequest = z.infer<
  typeof workspaceProjectCreateRequestSchema
>
export type WorkspaceProjectUpdateRequest = z.infer<
  typeof workspaceProjectUpdateRequestSchema
>
export type WorkspaceProjectPublishRequest = z.infer<
  typeof workspaceProjectPublishRequestSchema
>
