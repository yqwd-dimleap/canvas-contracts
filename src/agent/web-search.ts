import { z } from 'zod'
import { timestampSchema } from '../shared/timestamp.js'

export const WEB_SEARCH_CONFIG_ID = 'canvas-agent-web-search' as const
export const WEB_SEARCH_DEFAULT_BASE_URL = 'https://api.tavily.com' as const

export const webSearchProviderSchema = z.enum(['tavily'])

export const webSearchConfigSchema = z.object({
  id: z.literal(WEB_SEARCH_CONFIG_ID),
  provider: webSearchProviderSchema,
  enabled: z.boolean().default(false),
  apiKey: z.string().trim().min(1).optional(),
  baseUrl: z.string().url().default(WEB_SEARCH_DEFAULT_BASE_URL),
  maxResults: z.number().int().min(1).max(10).default(5),
  timeoutMs: z.number().int().min(1000).max(60000).default(10000),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const webSearchConfigViewSchema = webSearchConfigSchema
  .omit({ apiKey: true })
  .extend({
    configured: z.boolean(),
    apiKeyConfigured: z.boolean()
  })

export const updateWebSearchConfigRequestSchema = z
  .object({
    provider: webSearchProviderSchema.default('tavily'),
    enabled: z.boolean(),
    apiKey: z.string().trim().min(1).optional(),
    baseUrl: z.string().url().default(WEB_SEARCH_DEFAULT_BASE_URL),
    maxResults: z.number().int().min(1).max(10).default(5),
    timeoutMs: z.number().int().min(1000).max(60000).default(10000)
  })
  .strict()

export type WebSearchConfig = z.infer<typeof webSearchConfigSchema>
export type WebSearchConfigView = z.infer<typeof webSearchConfigViewSchema>
export type UpdateWebSearchConfigRequest = z.infer<
  typeof updateWebSearchConfigRequestSchema
>
