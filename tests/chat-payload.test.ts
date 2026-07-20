import { describe, expect, test } from 'bun:test'
import { getEffectiveModelCategory } from '../src/agent/model-category.js'
import {
  buildGenerationPayloadFromConfig,
  createDefaultGenerationPayloadConfig
} from '../src/models/payload.js'

const IMAGE_URL_1 = 'https://example.com/first.png'
const IMAGE_URL_2 = 'https://example.com/second.png'

describe('chat generation metadata.payload', () => {
  test('renders the default OpenAI chat payload template', () => {
    const payload = createDefaultGenerationPayloadConfig('chat')
    expect(payload.endpoint).toBe('/chat/completions')

    const configured = buildGenerationPayloadFromConfig(payload, {
      model: 'chat-model-a',
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'Describe the scene.' }
      ],
      params: {
        temperature: 0.2,
        maxTokens: 256,
        reasoningEffort: 'medium',
        stream: true,
        streamOptions: { include_usage: true }
      }
    })

    expect(configured.payload).toMatchObject({
      model: 'chat-model-a',
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'Describe the scene.' }
      ],
      temperature: 0.2,
      max_tokens: 256,
      reasoning_effort: 'medium',
      stream: true,
      stream_options: { include_usage: true }
    })
  })

  test('derives multiple reference images from media entries', () => {
    const payload = createDefaultGenerationPayloadConfig('chat')
    payload.request.body = {
      model: '{{model}}',
      messages: '{{messages}}',
      images: '{{references.images}}',
      firstImage: '{{references.firstImage}}'
    }

    const configured = buildGenerationPayloadFromConfig(payload, {
      model: 'chat-model-b',
      messages: [{ role: 'user', content: 'Use both images.' }],
      references: {
        media: [
          { type: 'reference_image', url: IMAGE_URL_1 },
          { type: 'reference_video', url: 'https://example.com/clip.mp4' },
          { type: 'reference_audio', url: 'https://example.com/sound.mp3' },
          { type: 'reference_image', url: IMAGE_URL_2 }
        ]
      }
    })

    expect(configured.payload).toEqual({
      model: 'chat-model-b',
      messages: [{ role: 'user', content: 'Use both images.' }],
      images: [IMAGE_URL_1, IMAGE_URL_2],
      firstImage: IMAGE_URL_1
    })
  })

  test('configured chat payloads keep the chat category', () => {
    expect(
      getEffectiveModelCategory('third-party-chat-model', {
        payload: createDefaultGenerationPayloadConfig('chat')
      })
    ).toBe('chat')
  })
})
