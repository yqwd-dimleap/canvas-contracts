import { z } from 'zod'
import {
  agentActionSchema,
  workMediaSourceSchema,
  workMediumSchema,
  workQualitySchema,
  workSourceSchema
} from './works.js'

const featuredWorkTimestampSchema = z.union([z.string(), z.number(), z.date()])

export const featuredWorkGenerationSchema = z.object({
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  modelId: z.string(),
  seed: z.string().optional(),
  guidance: z.number().optional(),
  steps: z.number().int().positive().optional(),
  size: z.string(),
  quality: workQualitySchema.optional()
})

export const featuredWorkCoverMotionSchema = z.object({
  type: workMediumSchema,
  url: z.string().min(1),
  posterUrl: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  durationSec: z.number().positive().optional()
})

export const featuredWorkMediaDocumentSchema = z.object({
  id: z.string().min(1),
  type: workMediumSchema,
  url: z.string().min(1),
  posterUrl: z.string().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  durationSec: z.number().positive().optional(),
  source: workMediaSourceSchema.optional(),
  label: z.string().optional(),
  createdAt: z.string().optional(),
  runId: z.string().optional(),
  generation: featuredWorkGenerationSchema.optional(),
  motion: featuredWorkCoverMotionSchema.optional()
})

export const featuredWorkAuthorDocumentSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  handle: z.string(),
  avatar: z.string().optional()
})

export const featuredWorkTaxonomySchema = z.object({
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  styleTags: z.array(z.string()).default([])
})

/** Canonical Mongo document shape stored in the featured works collection. */
export const featuredWorkDocumentSchema = z.object({
  schemaVersion: z.literal(2).default(2),
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'hidden']).default('published'),
  published: z.boolean().default(true),
  sortOrder: z.number().default(0),
  source: workSourceSchema.default('curated'),
  projectId: z.string().optional(),
  ownerUserId: z.string().optional(),
  snapshotVersion: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  author: featuredWorkAuthorDocumentSchema,
  cover: featuredWorkMediaDocumentSchema,
  media: z.array(featuredWorkMediaDocumentSchema).default([]),
  generation: featuredWorkGenerationSchema,
  taxonomy: featuredWorkTaxonomySchema,
  actions: z.array(agentActionSchema).default([]),
  relatedIds: z.array(z.string()).default([]),
  publishedAt: featuredWorkTimestampSchema.optional(),
  createdAt: featuredWorkTimestampSchema,
  updatedAt: featuredWorkTimestampSchema.optional(),
  searchText: z.string().optional()
})

export type FeaturedWorkGeneration = z.infer<
  typeof featuredWorkGenerationSchema
>
export type FeaturedWorkCoverMotion = z.infer<
  typeof featuredWorkCoverMotionSchema
>
export type FeaturedWorkMediaDocument = z.infer<
  typeof featuredWorkMediaDocumentSchema
>
export type FeaturedWorkAuthorDocument = z.infer<
  typeof featuredWorkAuthorDocumentSchema
>
export type FeaturedWorkTaxonomy = z.infer<typeof featuredWorkTaxonomySchema>
export type FeaturedWorkDocument = z.infer<typeof featuredWorkDocumentSchema>
