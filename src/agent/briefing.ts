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

/**
 * A reference video discovered for a query.
 *
 * Unlike images, web video is rarely a plain playable URL, so `url` is only
 * populated when a direct media link (mp4/webm) could be extracted; the
 * `sourceUrl` page and optional poster still let the UI render a reference even
 * when no direct stream is available.
 */
export const canvasBriefingVideoSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  /** Still frame / poster for the video, when known. */
  thumbnailUrl: z.string().url().optional(),
  /** Page the video was extracted from, when known. */
  sourceUrl: z.string().url().optional(),
  /** Direct-media MIME (e.g. video/mp4) when the URL is a playable stream. */
  mimeType: z.string().optional()
})

/** One search query and everything found for it. */
export const canvasBriefingGroupSchema = z.object({
  query: z.string().min(1),
  answer: z.string().optional(),
  sources: z.array(canvasBriefingSourceSchema).default([]),
  images: z.array(canvasBriefingImageSchema).default([]),
  videos: z.array(canvasBriefingVideoSchema).default([])
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

export type CanvasBriefingImage = z.infer<typeof canvasBriefingImageSchema>
export type CanvasBriefingVideo = z.infer<typeof canvasBriefingVideoSchema>
export type CanvasBriefingGroup = z.infer<typeof canvasBriefingGroupSchema>
export type CanvasBriefingArtifactContent = z.infer<
  typeof canvasBriefingArtifactContentSchema
>
