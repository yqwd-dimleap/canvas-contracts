import { describe, expect, test } from 'bun:test'
import {
  CANVAS_AGENT_PROTOCOL_VERSION,
  canvasAgentLangGraphProtocolEventSchema,
  canvasAgentLangGraphThreadStateResponseSchema,
  canvasAgentThreadSnapshotSchema
} from '../src/agent/langgraph-protocol.js'

const lifecycleFrame = {
  type: 'event',
  event_id: 'thread-1:1',
  seq: 1,
  run_id: 'run-1',
  thread_id: 'thread-1',
  method: 'lifecycle',
  params: {
    namespace: [],
    timestamp: '2026-07-17T00:00:00.000Z',
    data: { event: 'running', status: 'running' }
  }
}

const threadSnapshot = {
  protocolVersion: CANVAS_AGENT_PROTOCOL_VERSION,
  projectId: 'project-1',
  threadId: 'thread-1',
  currentRun: null,
  assistantMessage: null,
  activities: [],
  interrupt: null,
  suggestions: [],
  artifacts: [],
  appliedThroughSeq: -1,
  canvasRevision: 4
} as const

describe('Canvas Agent application protocol v2', () => {
  test('round-trips a fully sequenced wire frame', () => {
    expect(
      canvasAgentLangGraphProtocolEventSchema.parse(lifecycleFrame)
    ).toEqual(lifecycleFrame)
  })

  test('encodes named custom channels in the LangGraph custom event', () => {
    const frame = {
      ...lifecycleFrame,
      method: 'custom',
      params: {
        namespace: [],
        timestamp: '2026-07-17T00:00:00.000Z',
        data: {
          name: 'activity',
          payload: {
            event: 'activity.upsert',
            activity: {
              id: 'activity-1',
              scope: 'stage',
              kind: 'planning',
              title: 'Planning',
              status: 'waiting'
            }
          }
        }
      }
    }
    expect(canvasAgentLangGraphProtocolEventSchema.parse(frame)).toEqual(frame)
    expect(
      canvasAgentLangGraphProtocolEventSchema.safeParse({
        ...frame,
        method: 'custom:activity'
      }).success
    ).toBe(false)
  })

  test('rejects unknown channels, missing sequence and malformed payloads', () => {
    expect(
      canvasAgentLangGraphProtocolEventSchema.safeParse({
        ...lifecycleFrame,
        method: 'values'
      }).success
    ).toBe(false)
    const { seq: _seq, ...missingSequence } = lifecycleFrame
    expect(
      canvasAgentLangGraphProtocolEventSchema.safeParse(missingSequence).success
    ).toBe(false)
    expect(
      canvasAgentLangGraphProtocolEventSchema.safeParse({
        ...lifecycleFrame,
        params: {
          ...lifecycleFrame.params,
          data: { event: 'running', status: 'made-up' }
        }
      }).success
    ).toBe(false)
  })

  test('snapshot is materialized state, not raw event history', () => {
    const snapshot = canvasAgentThreadSnapshotSchema.parse(threadSnapshot)
    expect(snapshot.appliedThroughSeq).toBe(-1)
    expect('events' in snapshot).toBe(false)
    expect('operations' in snapshot).toBe(false)
  })

  test('accepts the strict LangGraph SDK state envelope', () => {
    const state = {
      values: threadSnapshot,
      next: [],
      tasks: [],
      metadata: {},
      checkpoint: null,
      parent_checkpoint: null,
      created_at: null
    }
    expect(canvasAgentLangGraphThreadStateResponseSchema.parse(state)).toEqual(
      state
    )
  })

  test('rejects checkpoint task state outside the materialized snapshot', () => {
    expect(
      canvasAgentLangGraphThreadStateResponseSchema.safeParse({
        values: threadSnapshot,
        next: ['legacy-node'],
        tasks: [],
        metadata: {},
        checkpoint: null,
        parent_checkpoint: null,
        created_at: null
      }).success
    ).toBe(false)
  })
})
