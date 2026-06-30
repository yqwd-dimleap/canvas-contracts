import { describe, expect, test } from 'bun:test'
import {
  buildConfiguredImageGenerationPayload,
  modelRegistry,
  normalizeImageGenerationParams
} from '../src/models/registry.js'

describe('image model payloads', () => {
  test('image params apply shared model defaults from raw minimal input', () => {
    const params = normalizeImageGenerationParams({
      model: 'gpt-image-2',
      prompt: 'generate a clean product render'
    })

    expect(params).toEqual({
      model: 'gpt-image-2',
      prompt: 'generate a clean product render',
      size: '1024x1024',
      n: 1,
      quality: 'auto',
      background: 'auto',
      output_format: 'png'
    })
  })

  test('qwen image params drop unsupported UI defaults before gateway payload build', () => {
    const params = normalizeImageGenerationParams({
      model: 'qwen-image-2.0',
      prompt: '一个现代创意工作室的内部场景',
      size: '2048x2048',
      n: 1,
      quality: 'auto',
      background: 'auto',
      output_format: 'png',
      output_compression: 85,
      prompt_extend: true,
      watermark: true,
      projectId: '6a3a2483356ab4ba58681ff8'
    })

    expect(params).toEqual({
      model: 'qwen-image-2.0',
      prompt: '一个现代创意工作室的内部场景',
      size: '2048x2048',
      n: 1,
      prompt_extend: true,
      watermark: true,
      projectId: '6a3a2483356ab4ba58681ff8'
    })
  })

  test('qwen image gateway payload uses qwen input/parameters shape', () => {
    const params = normalizeImageGenerationParams({
      model: 'qwen-image-2.0',
      prompt: '生成一只暹罗猫',
      size: '2048x2048',
      n: 1,
      quality: 'auto',
      background: 'auto',
      output_format: 'png',
      prompt_extend: true,
      watermark: false
    })

    const payload = modelRegistry.buildImagePayload(params)

    expect(payload).not.toHaveProperty('prompt')
    expect(payload).not.toHaveProperty('quality')
    expect(payload).not.toHaveProperty('background')
    expect(payload).not.toHaveProperty('output_format')
    expect(payload).toMatchObject({
      model: 'qwen-image-2.0',
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: '生成一只暹罗猫' }]
          }
        ]
      },
      parameters: {
        size: '2048*2048',
        n: 1,
        prompt_extend: true,
        watermark: false
      }
    })
  })

  test('qwen image params enforce the shared reference image limit', () => {
    const params = normalizeImageGenerationParams({
      model: 'qwen-image-2.0',
      prompt: '基于参考图生成新风格',
      image: [
        'https://example.com/1.png',
        'https://example.com/2.png',
        'https://example.com/3.png',
        'https://example.com/4.png'
      ]
    })

    expect(params.image).toEqual([
      'https://example.com/1.png',
      'https://example.com/2.png',
      'https://example.com/3.png'
    ])
  })

  test('gpt image params keep OpenAI-compatible fields', () => {
    const params = normalizeImageGenerationParams({
      model: 'gpt-image-2',
      prompt: 'generate a clean product render',
      size: '1536x1024',
      n: 2,
      quality: 'high',
      background: 'transparent',
      output_format: 'webp',
      output_compression: 80,
      image: ['https://example.com/reference.png']
    })

    expect(modelRegistry.buildImagePayload(params)).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'generate a clean product render',
      size: '1536x1024',
      n: 2,
      quality: 'high',
      background: 'transparent',
      output_format: 'webp',
      output_compression: 80,
      image: ['https://example.com/reference.png']
    })
  })

  test('configured image payload applies admin generation config after model build', () => {
    const configured = buildConfiguredImageGenerationPayload(
      {
        model: 'gpt-image-2',
        prompt: 'generate a clean product render',
        size: '1536x1024',
        quality: 'high',
        background: 'transparent',
        output_format: 'png',
        projectId: 'project-1'
      },
      {
        gateway: {
          generation: {
            endpoint: '/v1/images/custom',
            parameters: {
              prompt: 'must not override dynamic prompt',
              projectId: 'must-not-leak',
              provider_option: 'enabled'
            },
            omitParameters: ['background', 'model']
          }
        }
      }
    )

    expect(configured.config.endpoint).toBe('/v1/images/custom')
    expect(configured.payload).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'generate a clean product render',
      size: '1536x1024',
      quality: 'high',
      output_format: 'png',
      provider_option: 'enabled'
    })
    expect(configured.payload).not.toHaveProperty('background')
    expect(configured.payload).not.toHaveProperty('projectId')
  })
})
