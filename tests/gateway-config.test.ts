import { describe, expect, test } from 'bun:test'
import {
  mergeGenerationGatewayConfig,
  readGenerationGatewayConfig
} from '../src/generation/gateway-config.js'

describe('generation gateway config', () => {
  test('reads payloadProfile and falls back to legacy payloadType', () => {
    expect(
      readGenerationGatewayConfig({
        gateway: {
          generation: {
            payloadProfile: 'seedance-content-task'
          }
        }
      }).payloadProfile
    ).toBe('seedance-content-task')

    expect(
      readGenerationGatewayConfig({
        gateway: {
          generation: {
            payloadType: 'legacy-seedance-task'
          }
        }
      }).payloadProfile
    ).toBe('legacy-seedance-task')
  })

  test('merge writes payloadProfile and removes legacy payloadType', () => {
    const metadata = mergeGenerationGatewayConfig(
      {
        gateway: {
          generation: {
            payloadType: 'legacy-seedance-task'
          }
        }
      },
      {
        payloadProfile: 'seedance-content-task'
      }
    )

    expect(metadata).toMatchObject({
      gateway: {
        generation: {
          payloadProfile: 'seedance-content-task'
        }
      }
    })
    expect(
      (metadata.gateway as Record<string, unknown>).generation
    ).not.toHaveProperty('payloadType')
  })
})
