/**
 * 节点类型的推荐模型配置
 *
 * 根据画布节点类型自动选择最优模型，而不是让用户手动选择。
 * 优化原则：
 * - image 节点优先用 gpt-image-2
 * - video 节点优先用 Wan 2.7 I2V；纯文生视频优先 Wan T2V
 */

import type { ProjectCanvasNodeType } from '../canvas/graph.js'
import type { ModelCategory } from './model-provider.js'

export interface NodeTypeModelPreference {
  /** 节点类型 */
  nodeType: ProjectCanvasNodeType
  /** 推荐模型列表（按优先级排序） */
  preferredModels: string[]
  /** 模型类别 */
  category: ModelCategory
}

export type GenerationUseCase =
  | 'text-to-image'
  | 'image-to-image'
  | 'image-edit'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-edit'
  | 'video-merge'

export interface GenerationUseCaseModelPreference {
  useCase: GenerationUseCase
  preferredModels: string[]
  category: ModelCategory
}

/**
 * 节点类型到推荐模型的映射
 *
 * 按优先级排序：
 * - 第一个是默认推荐
 * - 后续是备选方案
 */
export const NODE_TYPE_MODEL_PREFERENCES: NodeTypeModelPreference[] = [
  // 图片生成节点 - 优先 gpt-image-2
  {
    nodeType: 'canvasAiImage',
    category: 'image',
    preferredModels: [
      'gpt-image-2',
      'gpt-image-2-vip',
      'gpt-image-1.5',
      'qwen-image-1.0',
      'gpt-image-1'
    ]
  },
  // 视频生成节点 - 优先当前可用 Wan / HappyHorse / Kling / Runway
  {
    nodeType: 'canvasAiVideo',
    category: 'video',
    preferredModels: [
      'wan2.7-i2v',
      'wan2.7-r2v',
      'wan2.7-t2v',
      'wan2.6-i2v',
      'wan2.6-r2v',
      'wan2.6-t2v',
      'happyhorse-1.0-i2v',
      'happyhorse-1.0-video-edit'
    ]
  },
  // 文案生成节点
  {
    nodeType: 'canvasAiWrite',
    category: 'chat',
    preferredModels: ['deepseek-v4-pro']
  },
  // 分镜单镜头出图
  {
    nodeType: 'canvasAiWriteShot',
    category: 'image',
    preferredModels: [
      'gpt-image-2',
      'qwen-image-2.0',
      'gpt-image-2-vip',
      'gpt-image-1.5',
      'qwen-image-1.0'
    ]
  },
  // 图片网格节点 - 同图片生成
  {
    nodeType: 'canvasAiImageGrid',
    category: 'video',
    preferredModels: [
      'wan2.7-i2v',
      'wan2.7-r2v',
      'wan2.6-i2v',
      'wan2.6-r2v',
      'happyhorse-1.0-i2v'
    ]
  },
  // 分镜表节点 - 同图片生成
  {
    nodeType: 'canvasAiStoryboardTable',
    category: 'image',
    preferredModels: [
      'gpt-image-2',
      'gpt-image-2-vip',
      'gpt-image-1.5',
      'qwen-image-1.0'
    ]
  },
  // Prompt 节点 - 文本类
  {
    nodeType: 'canvasAiPrompt',
    category: 'chat',
    preferredModels: ['deepseek-v4-pro']
  }
]

/**
 * 生成场景到模型的推荐映射。
 *
 * 保持只引用 `models/registry` 中已经注册的模型 id；运行时仍会优先尊重
 * 后台 node_type_models / 用户偏好，这里用于 planner、UI 文案和兜底选择。
 */
export const GENERATION_USE_CASE_MODEL_PREFERENCES: GenerationUseCaseModelPreference[] =
  [
    {
      useCase: 'text-to-image',
      category: 'image',
      preferredModels: [
        'gpt-image-2',
        'gpt-image-2-vip',
        'gpt-image-1.5',
        'qwen-image-2.0',
        'nano-banana-2',
        'qwen-image-1.0',
        'gpt-image-1'
      ]
    },
    {
      useCase: 'image-to-image',
      category: 'image',
      preferredModels: [
        'gpt-image-2',
        'qwen-image-2.0',
        'nano-banana-2',
        'gpt-image-1.5',
        'gpt-image-1'
      ]
    },
    {
      useCase: 'image-edit',
      category: 'image',
      preferredModels: [
        'gpt-image-2',
        'qwen-image-2.0',
        'nano-banana-2',
        'gpt-image-1.5',
        'gpt-image-1'
      ]
    },
    {
      useCase: 'text-to-video',
      category: 'video',
      preferredModels: ['wan2.7-t2v', 'wan2.6-t2v']
    },
    {
      useCase: 'image-to-video',
      category: 'video',
      preferredModels: [
        'wan2.7-i2v',
        'wan2.7-r2v',
        'wan2.6-i2v',
        'wan2.6-r2v',
        'happyhorse-1.0-i2v'
      ]
    },
    {
      useCase: 'video-edit',
      category: 'video',
      preferredModels: ['happyhorse-1.0-video-edit']
    },
    {
      useCase: 'video-merge',
      category: 'video',
      preferredModels: ['wan2.7-r2v', 'wan2.6-r2v']
    }
  ]

/**
 * 根据节点类型获取推荐模型列表
 */
export function getPreferredModelsForNodeType(
  nodeType: ProjectCanvasNodeType
): string[] {
  const pref = NODE_TYPE_MODEL_PREFERENCES.find((p) => p.nodeType === nodeType)
  return pref?.preferredModels ?? []
}

export function getPreferredModelsForGenerationUseCase(
  useCase: GenerationUseCase
): string[] {
  const pref = GENERATION_USE_CASE_MODEL_PREFERENCES.find(
    (item) => item.useCase === useCase
  )
  return pref?.preferredModels ?? []
}

export function getDefaultModelForGenerationUseCase(
  useCase: GenerationUseCase
): string | undefined {
  return getPreferredModelsForGenerationUseCase(useCase)[0]
}

/**
 * 根据节点类型获取默认推荐模型（第一个）
 */
export function getDefaultModelForNodeType(
  nodeType: ProjectCanvasNodeType
): string | undefined {
  return getPreferredModelsForNodeType(nodeType)[0]
}

/**
 * 根据节点类型获取模型类别
 */
export function getModelCategoryForNodeType(
  nodeType: ProjectCanvasNodeType
): ModelCategory | undefined {
  const pref = NODE_TYPE_MODEL_PREFERENCES.find((p) => p.nodeType === nodeType)
  return pref?.category
}

/**
 * 检查模型是否适用于指定节点类型
 */
export function isModelCompatibleWithNodeType(
  modelId: string,
  nodeType: ProjectCanvasNodeType
): boolean {
  const preferredModels = getPreferredModelsForNodeType(nodeType)
  return preferredModels.includes(modelId)
}
