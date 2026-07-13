import { z } from 'zod'
import {
  workspaceAssetMetadataSchema,
  workspaceAssetTypeSchema
} from '../../storage/workspace-assets.js'
import { canvasDocumentSchema } from '../core/document.js'
import {
  CANVAS2D_DEFAULT_WORKSPACE_VIEW,
  canvas2dWorkspaceViewSchema
} from '../view/canvas2d.js'

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

export const recentWorkspaceProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  previewImage: z.string(),
  previewImageDimensions: workspaceProjectPreviewDimensionsSchema.optional(),
  updatedAt: z.number()
})

/**
 * Canvas 画布数据完整结构
 * 存储在 MongoDB project.resources 字段
 *
 * schemaVersion: 2 是当前稳定版本
 * - v1: 已废弃的图结构画布架构
 * - v2: Canvas2D 架构（当前使用）
 *
 * 资产管理说明：
 * - 所有资产通过 project.assets[] 统一管理
 * - canvasDocument.elements[].assetId 引用 assets
 * - 不再使用独立的 resources[] 字段
 */
export const workspaceProjectCanvasDataSchema = z
  .object({
    schemaVersion: z.literal(2).default(2),
    canvasDocument: canvasDocumentSchema.nullable().default(null),
    conversations: z.array(z.unknown()).default([]),
    activeConversationId: z.string().nullable().default(null),
    canvas2d: canvas2dWorkspaceViewSchema.default(() => ({
      ...CANVAS2D_DEFAULT_WORKSPACE_VIEW,
      selectedElementIds: []
    })),
    updatedAt: z.number().optional()
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
  runs: z.array(z.unknown()).default([]),
  session: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().or(z.number()),
  updatedAt: z.string().or(z.number()),
  assets: z.array(workspaceProjectAssetSchema).optional(),
  // Canvas 画布数据
  resources: workspaceProjectCanvasDataSchema.optional(),
  summary: workspaceProjectSummarySchema.optional(),
  publishStatus: z
    .enum(['none', 'pending_review', 'published', 'rejected'])
    .optional(),
  publishSubmittedAt: z.string().optional(),
  publishReview: z.record(z.string(), z.unknown()).optional(),
  publishCoverMediaId: z.string().optional(),
  publishCoverDimensions: workspaceProjectPreviewDimensionsSchema.optional()
})

export function parseWorkspaceProjectCanvasData(
  value: unknown
): WorkspaceProjectCanvasData {
  return workspaceProjectCanvasDataSchema.parse(value)
}

export function safeParseWorkspaceProjectCanvasData(
  value: unknown
): WorkspaceProjectCanvasData | null {
  const result = workspaceProjectCanvasDataSchema.safeParse(value)
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

/**
 * Canvas 画布数据类型（推荐使用）
 */
export type WorkspaceProjectCanvasData = z.infer<
  typeof workspaceProjectCanvasDataSchema
>

export type WorkspaceProjectAsset = z.infer<typeof workspaceProjectAssetSchema>
export type WorkspaceProject = z.infer<typeof workspaceProjectSchema>
