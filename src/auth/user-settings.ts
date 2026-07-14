import { z } from 'zod'
import { canvasGenerationUseCaseSchema } from '../agent/model-preferences.js'
import {
  modelCategorySchema,
  modelPricingConfigSchema
} from '../agent/model-provider.js'
import { apiSuccessResponseSchema } from '../api/response.js'
import { generationPayloadConfigSchema } from '../models/payload.js'
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
  defaultModel: z.string().default(''),
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
    defaultModel: '',
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
  pricing: modelPricingConfigSchema.optional(),
  payload: generationPayloadConfigSchema,
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

// ── 用户相关端点的标准信封响应 schema ──

/** GET/POST /api/user/settings —— 用户设置。 */
export const userSettingsApiResponseSchema = apiSuccessResponseSchema(
  z.object({ settings: userSettingsSchema })
)

/** GET /api/user/roles —— 当前用户角色列表。 */
export const userRolesApiResponseSchema = apiSuccessResponseSchema(
  z.object({ roles: z.array(z.string()) })
)

/** GET/PATCH /api/user/generation-model-preferences —— 生成模型偏好视图。 */
export const userGenerationModelPreferencesApiResponseSchema =
  apiSuccessResponseSchema(
    z.object({ preferences: userGenerationModelPreferencesViewSchema })
  )

/** GET /api/user/init-status —— 用户初始化状态。 */
export const userInitStatusApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    initialized: z.boolean(),
    userId: z.string(),
    checks: z.object({ billing: z.boolean(), role: z.boolean() })
  })
)

/** POST /api/user/init-status —— 重新初始化结果。 */
export const userInitRepairApiResponseSchema = apiSuccessResponseSchema(
  z.object({
    success: z.boolean(),
    message: z.string().optional()
  })
)
