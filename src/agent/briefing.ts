import { z } from 'zod'

/**
 * Visual-reference briefing artifact content.
 *
 * Emitted as a single `document` artifact per run (content.kind === 'briefing').
 * A find-material / reference run may call web search several times; each call
 * appends one group (keyed by its query) so the frontend can render one compact
 * card plus a grouped full report instead of one card per search.
 *
 * Shared by canvas-agent (run-recorder emit) and canvas-frontend (BriefingCard
 * render). Do not hand-write a copy on either side.
 */

/** A textual web source: page title, link, and snippet. */
export const canvasBriefingSourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  snippet: z.string().default(''),
  score: z.number().optional(),
  publishedAt: z.string().optional()
})

/** A reference image discovered for a query (Tavily include_images). */
export const canvasBriefingImageSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  /** Page the image was extracted from, when known. */
  sourceUrl: z.string().url().optional()
})

/** One search query and everything found for it. */
export const canvasBriefingGroupSchema = z.object({
  query: z.string().min(1),
  answer: z.string().optional(),
  sources: z.array(canvasBriefingSourceSchema).default([]),
  images: z.array(canvasBriefingImageSchema).default([])
})

export const CANVAS_BRIEFING_ARTIFACT_KIND = 'briefing' as const

export const canvasBriefingArtifactContentSchema = z.object({
  kind: z.literal(CANVAS_BRIEFING_ARTIFACT_KIND),
  /** Overall research topic, usually the user intent. */
  topic: z.string().optional(),
  /** One-line synthesis shown at the top of the card/report. */
  summary: z.string().optional(),
  groups: z.array(canvasBriefingGroupSchema).default([])
})

export type CanvasBriefingSource = z.infer<typeof canvasBriefingSourceSchema>
export type CanvasBriefingImage = z.infer<typeof canvasBriefingImageSchema>
export type CanvasBriefingGroup = z.infer<typeof canvasBriefingGroupSchema>
export type CanvasBriefingArtifactContent = z.infer<
  typeof canvasBriefingArtifactContentSchema
>
