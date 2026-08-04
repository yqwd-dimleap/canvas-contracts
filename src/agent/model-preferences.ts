import { z } from 'zod'
import type { GenerationModelCategory } from './model-provider.js'

export const canvasGenerationUseCaseSchema = z.enum([
  'text-to-image',
  'image-to-image',
  'image-edit',
  'text-to-video',
  'image-to-video',
  'video-edit',
  'video-merge',
  'video-script',
  'lyrics'
])

export interface GenerationUseCaseModelPreference {
  useCase: CanvasGenerationUseCase
  category: GenerationModelCategory
}

/**
 * Canonical category for every generation use case. The exhaustive Record is
 * intentional: adding a schema value must fail typecheck until its category is
 * defined here, instead of leaving consumers to maintain parallel switches.
 */
export const GENERATION_USE_CASE_MODEL_CATEGORIES = {
  'text-to-image': 'image',
  'image-to-image': 'image',
  'image-edit': 'image',
  'text-to-video': 'video',
  'image-to-video': 'video',
  'video-edit': 'video',
  'video-merge': 'video',
  'video-script': 'chat',
  lyrics: 'chat'
} as const satisfies Record<CanvasGenerationUseCase, GenerationModelCategory>

export const GENERATION_USE_CASE_MODEL_PREFERENCES =
  canvasGenerationUseCaseSchema.options.map((useCase) => ({
    useCase,
    category: GENERATION_USE_CASE_MODEL_CATEGORIES[useCase]
  })) satisfies GenerationUseCaseModelPreference[]

export function getModelCategoryForGenerationUseCase(
  useCase: CanvasGenerationUseCase
): GenerationModelCategory {
  return GENERATION_USE_CASE_MODEL_CATEGORIES[useCase]
}

export type CanvasGenerationUseCase = z.infer<
  typeof canvasGenerationUseCaseSchema
>
