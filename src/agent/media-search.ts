import { z } from 'zod'
import { timestampSchema } from '../shared/timestamp.js'

/**
 * Media search (find web images/videos) configuration.
 *
 * Unlike web search, this feature is self-hosted: a SearXNG instance provides
 * candidate page URLs (and, for the `images` category, direct image links), and
 * canvas-agent fetches those pages to extract `<img>`/`<video>` media. There is
 * no third-party API key; `baseUrl` points at the operator's SearXNG instance.
 */
export const MEDIA_SEARCH_CONFIG_ID = 'canvas-agent-media-search' as const

export const mediaSearchProviderSchema = z.enum(['searxng'])

export const mediaSearchConfigSchema = z.object({
  id: z.literal(MEDIA_SEARCH_CONFIG_ID),
  provider: mediaSearchProviderSchema,
  enabled: z.boolean().default(false),
  /** SearXNG instance base URL used to discover candidate pages and images. */
  searxngUrl: z.string().url().optional(),
  /** Per-request timeout for search + page fetches. */
  timeoutMs: z.number().int().min(1000).max(60000).default(12000),
  /** Max candidate pages fetched and scraped per query for video extraction. */
  maxPages: z.number().int().min(1).max(10).default(4),
  /** Max media items (images + videos) returned per query. */
  maxResults: z.number().int().min(1).max(40).default(16),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const mediaSearchConfigViewSchema = mediaSearchConfigSchema.extend({
  configured: z.boolean(),
  searxngConfigured: z.boolean()
})

export const updateMediaSearchConfigRequestSchema = z
  .object({
    provider: mediaSearchProviderSchema.default('searxng'),
    enabled: z.boolean(),
    searxngUrl: z.string().url().optional(),
    timeoutMs: z.number().int().min(1000).max(60000).default(12000),
    maxPages: z.number().int().min(1).max(10).default(4),
    maxResults: z.number().int().min(1).max(40).default(16)
  })
  .strict()

export type MediaSearchConfig = z.infer<typeof mediaSearchConfigSchema>
export type MediaSearchConfigView = z.infer<typeof mediaSearchConfigViewSchema>
export type UpdateMediaSearchConfigRequest = z.infer<
  typeof updateMediaSearchConfigRequestSchema
>
