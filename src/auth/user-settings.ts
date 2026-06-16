import { z } from 'zod'
import {
  modelCategorySchema,
  modelPricingConfigSchema
} from '../agent/profiles.js'
import { projectCanvasNodeTypeSchema } from '../canvas/workflow.js'
import { timestampSchema } from '../shared/timestamp.js'

export const userNotificationSettingsSchema = z.object({
  email: z.boolean().default(true),
  browser: z.boolean().default(true)
})

export const userPreferencesSchema = z.object({
  language: z.string().default('en-US'),
  theme: z.string().default('system'),
  notifications: userNotificationSettingsSchema.default({
    email: true,
    browser: true
  })
})

export const nodeModelPreferencesSchema = z
  .partialRecord(projectCanvasNodeTypeSchema, z.string().min(1))
  .default({})

export const userApiSettingsSchema = z.object({
  defaultModel: z.string().default('gpt-image-2'),
  defaultQuality: z.string().default('auto'),
  defaultSize: z.string().default('1024x1024'),
  nodeModelPreferences: nodeModelPreferencesSchema
})

export const userSettingsSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  preferences: userPreferencesSchema.default({
    language: 'en-US',
    theme: 'system',
    notifications: { email: true, browser: true }
  }),
  apiSettings: userApiSettingsSchema.default({
    defaultModel: 'gpt-image-2',
    defaultQuality: 'auto',
    defaultSize: '1024x1024',
    nodeModelPreferences: {}
  }),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const updateUserNodeModelPreferencesSchema = z.object({
  nodeModelPreferences: z
    .partialRecord(projectCanvasNodeTypeSchema, z.string().min(1).nullable())
    .default({})
})

export const userNodeModelPreferenceModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1).optional(),
  category: modelCategorySchema,
  pricing: modelPricingConfigSchema.optional(),
  creditsPerImage: z.number().min(0).optional(),
  costCentsPerImage: z.number().min(0).optional(),
  isSystemDefault: z.boolean().default(false)
})

export const userNodeModelPreferenceRowSchema = z.object({
  nodeType: projectCanvasNodeTypeSchema,
  label: z.string().min(1),
  category: modelCategorySchema,
  systemDefaultModelId: z.string().min(1).nullable(),
  selectedModelId: z.string().min(1).nullable(),
  userModelId: z.string().min(1).nullable(),
  models: z.array(userNodeModelPreferenceModelSchema).default([])
})

export const userNodeModelPreferencesViewSchema = z.object({
  nodeModelPreferences: nodeModelPreferencesSchema,
  rows: z.array(userNodeModelPreferenceRowSchema)
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UserApiSettings = z.infer<typeof userApiSettingsSchema>
export type UserSettings = z.infer<typeof userSettingsSchema>
export type UserNodeModelPreferences = z.infer<
  typeof nodeModelPreferencesSchema
>
export type UserNodeModelPreferenceModel = z.infer<
  typeof userNodeModelPreferenceModelSchema
>
export type UserNodeModelPreferenceRow = z.infer<
  typeof userNodeModelPreferenceRowSchema
>
export type UserNodeModelPreferencesView = z.infer<
  typeof userNodeModelPreferencesViewSchema
>
