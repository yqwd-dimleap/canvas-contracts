import { describe, expect, test } from 'bun:test'
import {
  redisAgentPrefix,
  redisAgentRunEventsKey,
  redisAgentRunQueueKey,
  redisAgentRunQueueStreamKey,
  redisGlobalEventStreamKey,
  redisUserEventChannel,
  resolveCanvasRedisPrefix,
  resolveRedisEventBusPrefix
} from '../src/events/index.js'

describe('Canvas Redis keys', () => {
  test('uses one environment-scoped root for agent and shared events', () => {
    const root = resolveCanvasRedisPrefix({ appEnv: 'Test Env' })
    const agent = redisAgentPrefix(root)
    const events = resolveRedisEventBusPrefix({ rootPrefix: root })

    expect(root).toBe('canvas:test-env:')
    expect(agent).toBe('canvas:test-env:agent:')
    expect(redisAgentRunQueueKey(agent)).toBe(
      'canvas:test-env:agent:runs:ready'
    )
    expect(redisAgentRunQueueStreamKey(agent)).toBe(
      'canvas:test-env:agent:runs:stream'
    )
    expect(redisAgentRunEventsKey(agent, 'run-1')).toBe(
      'canvas:test-env:agent:run:run-1:events'
    )
    expect(redisUserEventChannel(events, 'user-1')).toBe(
      'canvas:test-env:events:user:user-1:notify'
    )
    expect(redisGlobalEventStreamKey(events)).toBe(
      'canvas:test-env:events:global:stream'
    )
  })

  test('uses a deterministic development namespace when APP_ENV is absent', () => {
    expect(resolveCanvasRedisPrefix({})).toBe('canvas:development:')
    expect(resolveRedisEventBusPrefix({})).toBe('canvas:development:events:')
  })

  test('normalizes explicit prefixes for migration overrides', () => {
    expect(resolveCanvasRedisPrefix({ explicitPrefix: 'legacy-root' })).toBe(
      'legacy-root:'
    )
    expect(
      resolveRedisEventBusPrefix({ explicitPrefix: 'legacy-events:' })
    ).toBe('legacy-events:')
  })
})
