import type { z } from 'zod'
import { visualMediaExecutionUseCaseSchema } from '../generation/media-execution.js'
import type { ModelCategory } from './model-provider.js'

/** @deprecated Prefer mediaExecutionUseCaseSchema from ./generation. */
export const canvasGenerationUseCaseSchema = visualMediaExecutionUseCaseSchema

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
