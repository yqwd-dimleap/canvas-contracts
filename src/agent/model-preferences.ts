import { z } from 'zod'
import type { ModelCategory } from './model-provider.js'

export const canvasGenerationUseCaseSchema = z.enum([
  'text-to-image',
  'image-to-image',
  'image-edit',
  'text-to-video',
  'image-to-video',
  'video-edit',
  'video-merge',
  'storyboard'
])

export interface GenerationUseCaseModelPreference {
  useCase: CanvasGenerationUseCase
  category: ModelCategory
}

export const GENERATION_USE_CASE_MODEL_PREFERENCES: GenerationUseCaseModelPreference[] =
  [
    {
      useCase: 'text-to-image',
      category: 'image'
    },
    {
      useCase: 'image-to-image',
      category: 'image'
    },
    {
      useCase: 'image-edit',
      category: 'image'
    },
    {
      useCase: 'text-to-video',
      category: 'video'
    },
    {
      useCase: 'image-to-video',
      category: 'video'
    },
    {
      useCase: 'video-edit',
      category: 'video'
    },
    {
      useCase: 'video-merge',
      category: 'video'
    },
    {
      useCase: 'storyboard',
      category: 'image'
    }
  ]

export function getModelCategoryForGenerationUseCase(
  useCase: CanvasGenerationUseCase
): ModelCategory | undefined {
  const pref = GENERATION_USE_CASE_MODEL_PREFERENCES.find(
    (item) => item.useCase === useCase
  )
  return pref?.category
}

export type CanvasGenerationUseCase = z.infer<
  typeof canvasGenerationUseCaseSchema
>
