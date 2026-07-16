import { describe, expect, test } from 'bun:test'
import { mergeCanvasAgentLangGraphRuntimeEvent } from '../src/agent/langgraph-runtime.js'
import { reduceAgentRunStatus } from '../src/canvas/agent/run-state.js'
import type { SequencedSystemEvent } from '../src/events/core.js'

function toolStarted(toolName: string): SequencedSystemEvent {
  return {
    sequence: 1,
    event: {
      id: 'event-1',
      runId: 'run-1',
      timestamp: '2026-07-15T06:00:00.000Z',
      type: 'tool.start',
      toolId: 'tool-1',
      toolName,
      input: {},
      agentId: 'canvas-agent'
    }
  }
}

describe('Canvas Agent LangGraph runtime presentation', () => {
  test('does not expose provider tool identifiers as user activity', () => {
    const inspect = mergeCanvasAgentLangGraphRuntimeEvent(
      undefined,
      toolStarted('canvas2d_inspect_scene')
    )
    const internal = mergeCanvasAgentLangGraphRuntimeEvent(
      undefined,
      toolStarted('write_todos')
    )

    expect(inspect.currentActivity).toBe('正在查看当前内容...')
    expect(internal.currentActivity).toBe('正在处理...')
    expect(internal.currentActivity).not.toContain('write_todos')
  })

  test('keeps non-blocking suggestions outside the run lifecycle', () => {
    const event: SequencedSystemEvent = {
      sequence: 2,
      event: {
        id: 'suggestions-1',
        runId: 'run-1',
        timestamp: '2026-07-15T06:00:01.000Z',
        type: 'agent.suggestions',
        agentId: 'canvas-agent',
        reason: '可以继续这样处理',
        suggestions: [
          {
            id: 'continue-1',
            label: '继续整理',
            intent: '继续整理当前内容',
            kind: 'run',
            priority: 'normal',
            targetElementIds: []
          }
        ]
      }
    }

    const runtime = mergeCanvasAgentLangGraphRuntimeEvent(undefined, event)
    expect(reduceAgentRunStatus('running', event.event)).toBe('running')
    expect(runtime.suggestions.map((item) => item.label)).toEqual(['继续整理'])
    expect(runtime.interrupts).toEqual([])
  })

  test('only a real interrupt moves the run to interrupted', () => {
    const event: SequencedSystemEvent = {
      sequence: 3,
      event: {
        id: 'run-1:interrupt',
        runId: 'run-1',
        timestamp: '2026-07-15T06:00:02.000Z',
        type: 'agent.interrupt',
        agentId: 'canvas-agent',
        reason: '请选择一个方向',
        needsUserInput: true,
        metadata: {
          suggestions: [
            {
              id: 'choice-1',
              label: '方向一',
              intent: '采用方向一',
              kind: 'ask',
              priority: 'normal',
              targetElementIds: []
            }
          ]
        }
      }
    }

    const runtime = mergeCanvasAgentLangGraphRuntimeEvent(undefined, event)
    expect(reduceAgentRunStatus('running', event.event)).toBe('interrupted')
    expect(runtime.interrupts[0]?.status).toBe('waiting')
    expect(runtime.suggestions).toEqual([])
  })

  test('never regresses a terminal run when late events arrive', () => {
    const lateStart: SequencedSystemEvent['event'] = {
      id: 'late-start',
      runId: 'run-1',
      timestamp: '2026-07-15T06:00:03.000Z',
      type: 'run.started',
      intent: 'test',
      mode: 'plan-execute'
    }

    expect(reduceAgentRunStatus('completed', lateStart)).toBe('completed')
    expect(reduceAgentRunStatus('cancelled', lateStart)).toBe('cancelled')
  })
})
