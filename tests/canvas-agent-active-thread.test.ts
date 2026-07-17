import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canvasAgentActiveThreadRequestSchema,
  canvasAgentActiveThreadResponseSchema,
  canvasAgentThreadPageSchema
} from '../src/canvas/index.js'

test('active thread request and response round-trip a thread id', () => {
  const value = { activeThreadId: 'thread-1' }
  assert.deepEqual(canvasAgentActiveThreadRequestSchema.parse(value), value)
  assert.deepEqual(canvasAgentActiveThreadResponseSchema.parse(value), value)
})

test('thread page carries the authoritative active thread', () => {
  const page = canvasAgentThreadPageSchema.parse({
    threads: [],
    nextCursor: null,
    activeThreadId: 'thread-1'
  })
  assert.equal(page.activeThreadId, 'thread-1')
})

test('active thread accepts null', () => {
  assert.deepEqual(
    canvasAgentActiveThreadRequestSchema.parse({
      activeThreadId: null
    }),
    { activeThreadId: null }
  )
})

test('active thread rejects missing and unknown fields', () => {
  assert.equal(
    canvasAgentActiveThreadRequestSchema.safeParse({}).success,
    false
  )
  assert.equal(
    canvasAgentActiveThreadRequestSchema.safeParse({
      activeThreadId: 'thread-1',
      revision: 3
    }).success,
    false
  )
})
