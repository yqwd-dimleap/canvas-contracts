import { z } from 'zod'
import { canvasGenerationUseCaseSchema } from '../agent/model-preferences.js'
import {
  modelCategorySchema,
  modelPricingConfigSchema
} from '../agent/model-provider.js'
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

export const generationModelPreferencesSchema = z
  .partialRecord(canvasGenerationUseCaseSchema, z.string().min(1))
  .default({})

export const userApiSettingsSchema = z.object({
  defaultModel: z.string().default('gpt-image-2'),
  defaultQuality: z.string().default('auto'),
  defaultSize: z.string().default('1024x1024'),
  generationModelPreferences: generationModelPreferencesSchema
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
    generationModelPreferences: {}
  }),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})

export const updateUserGenerationModelPreferencesSchema = z.object({
  generationModelPreferences: z
    .partialRecord(canvasGenerationUseCaseSchema, z.string().min(1).nullable())
    .default({})
})

export const userGenerationModelPreferenceModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1).optional(),
  category: modelCategorySchema,
  pricing: modelPricingConfigSchema,
  isSystemDefault: z.boolean().default(false)
})

export const userGenerationModelPreferenceRowSchema = z.object({
  useCase: canvasGenerationUseCaseSchema,
  label: z.string().min(1),
  category: modelCategorySchema,
  systemDefaultModelId: z.string().min(1).nullable(),
  selectedModelId: z.string().min(1).nullable(),
  userModelId: z.string().min(1).nullable(),
  models: z.array(userGenerationModelPreferenceModelSchema).default([])
})

export const userGenerationModelPreferencesViewSchema = z.object({
  generationModelPreferences: generationModelPreferencesSchema,
  rows: z.array(userGenerationModelPreferenceRowSchema)
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>
export type UserApiSettings = z.infer<typeof userApiSettingsSchema>
export type UserSettings = z.infer<typeof userSettingsSchema>
export type UserGenerationModelPreferences = z.infer<
  typeof generationModelPreferencesSchema
>
export type UserGenerationModelPreferenceModel = z.infer<
  typeof userGenerationModelPreferenceModelSchema
>
export type UserGenerationModelPreferenceRow = z.infer<
  typeof userGenerationModelPreferenceRowSchema
>
export type UserGenerationModelPreferencesView = z.infer<
  typeof userGenerationModelPreferencesViewSchema
>
