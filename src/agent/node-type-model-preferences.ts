/**
 * 节点类型的推荐模型配置
 *
 * 根据画布节点类型自动选择最优模型，而不是让用户手动选择。
 * 优化原则：
 * - image 节点优先用 gpt-image-2
 * - video 节点优先用 doubao-seedance-2-0-260128 (Seedance 2.0)
 */

import type { ProjectCanvasNodeType } from '../canvas/workflow.js'
import type { ModelCategory } from './profiles.js'

export interface NodeTypeModelPreference {
  /** 节点类型 */
  nodeType: ProjectCanvasNodeType
  /** 推荐模型列表（按优先级排序） */
  preferredModels: string[]
  /** 模型类别 */
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
  // 视频生成节点 - 优先 Seedance 2.0
  {
    nodeType: 'canvasAiVideo',
    category: 'video',
    preferredModels: [
      'doubao-seedance-2-0-260128', // Seedance 2.0
      'happyhorse-1.0-t2v',
      'wan2.7-i2v',
      'wan2.7-r2v',
      'kling-v2.1',
      'runway-gen3'
    ]
  },
  // 文案生成节点
  {
    nodeType: 'canvasAiWrite',
    category: 'chat',
    preferredModels: ['claude-sonnet-4-6', 'gpt-5.4', 'gpt-4o']
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
      'doubao-seedance-2-0-260128',
      'happyhorse-1.0-i2v',
      'happyhorse-1.0-t2v'
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
    preferredModels: ['gpt-4o-mini', 'claude-sonnet-4-6', 'gpt-5.4', 'gpt-4o']
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
