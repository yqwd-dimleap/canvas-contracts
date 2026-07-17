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

export const workspaceProjectSummaryMediaSourceSchema = z.enum([
  'cover',
  'session',
  'run',
  'resource',
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

export const workspaceProjectPublishStatusSchema = z.enum([
  'none',
  'pending_review',
  'published',
  'rejected'
])

export const workspaceProjectPublishAgentStatusSchema = z.enum([
  'pass',
  'flag',
  'skipped'
])

export const workspaceProjectPublishReviewSchema = z
  .object({
    agentStatus: workspaceProjectPublishAgentStatusSchema
      .nullish()
      .transform((value) => value ?? undefined),
    agentNotes: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined),
    agentAt: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined),
    humanStatus: z
      .enum(['approved', 'rejected'])
      .nullish()
      .transform((value) => value ?? undefined),
    humanNote: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined),
    humanBy: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined),
    humanAt: z
      .string()
      .nullish()
      .transform((value) => value ?? undefined)
  })
  .loose()

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
  publishStatus: workspaceProjectPublishStatusSchema.optional(),
  publishSubmittedAt: z.string().optional(),
  publishReview: workspaceProjectPublishReviewSchema.optional(),
  publishCoverMediaId: z.string().optional(),
  publishCoverDimensions: workspaceProjectPreviewDimensionsSchema.optional()
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
    assets: z.array(workspaceProjectAssetSchema).optional(),
    publishStatus: workspaceProjectPublishStatusSchema.optional(),
    publishSubmittedAt: z.string().optional(),
    publishReview: workspaceProjectPublishReviewSchema.optional(),
    publishCoverMediaId: z.string().optional(),
    publishCoverDimensions: workspaceProjectPreviewDimensionsSchema.optional()
  })
  .strict()

export const workspaceProjectPublishRequestSchema = z
  .object({
    useAgentReview: z.boolean().optional(),
    coverMediaId: z.string().trim().min(1).optional(),
    coverDimensions: workspaceProjectPreviewDimensionsSchema.optional()
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

export function safeParseWorkspaceProjectCanvas(
  value: unknown
): WorkspaceProjectCanvas | null {
  const result = workspaceProjectCanvasSchema.safeParse(value)
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
export type WorkspaceProjectPublishStatus = z.infer<
  typeof workspaceProjectPublishStatusSchema
>
export type WorkspaceProjectPublishAgentStatus = z.infer<
  typeof workspaceProjectPublishAgentStatusSchema
>
export type WorkspaceProjectPublishReview = z.infer<
  typeof workspaceProjectPublishReviewSchema
>
export type WorkspaceProjectSession = z.infer<
  typeof workspaceProjectSessionSchema
>
export type WorkspaceProjectRun = z.infer<typeof workspaceProjectRunSchema>
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
export type ListWorkspaceProjectsResponse = z.infer<
  typeof listWorkspaceProjectsResponseSchema
>
export type GetWorkspaceProjectResponse = z.infer<
  typeof getWorkspaceProjectResponseSchema
>
export type RecentWorkspaceProjectsResponse = z.infer<
  typeof recentWorkspaceProjectsResponseSchema
>
export type WorkspaceProjectDeleteResponse = z.infer<
  typeof workspaceProjectDeleteResponseSchema
>
export type WorkspaceProjectPublishWithdrawResponse = z.infer<
  typeof workspaceProjectPublishWithdrawResponseSchema
>
