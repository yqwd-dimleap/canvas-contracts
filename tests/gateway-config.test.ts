import { describe, expect, test } from 'bun:test'
import {
  buildGatewayChatPayloadPreview,
  mergeGatewayChatConfig,
  readGatewayChatConfig
} from '../src/generation/gateway-config.js'

describe('chat gateway config', () => {
  test('keeps chat parameters under metadata.gateway.chat', () => {
    const metadata = mergeGatewayChatConfig(null, {
      parameters: {
        temperature: 0.2,
        model: 'must-not-override'
      },
      omitParameters: ['max_tokens', 'messages']
    })

    expect(readGatewayChatConfig(metadata)).toEqual({
      parameters: { temperature: 0.2 },
      omitParameters: ['max_tokens']
    })
  })

  test('previews chat payload without reserved overrides', () => {
    const preview = buildGatewayChatPayloadPreview({
      parameters: {
        temperature: 0.2,
        stream: false
      },
      omitParameters: ['max_tokens', 'messages']
    })

    expect(preview.payload).toMatchObject({
      model: '<agent runtime model>',
      temperature: 0.2
    })
    expect(preview.payload).not.toHaveProperty('max_tokens')
    expect(preview.payload).toHaveProperty('messages')
    expect(preview.ignoredParameterKeys).toEqual(['stream'])
    expect(preview.ignoredOmitKeys).toEqual(['messages'])
  })
})
