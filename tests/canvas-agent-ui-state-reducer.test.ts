import { describe, expect, test } from 'bun:test'
import {
  canvasMutationSchema,
  canvasMutationTransactionSchema
} from '../src/canvas/core/mutations.js'

describe('Canvas mutation validation', () => {
  test('rejects immutable element fields in a typed patch', () => {
    const result = canvasMutationSchema.safeParse({
      mutationId: 'm-1',
      type: 'element.patch',
      payload: {
        documentId: 'doc-1',
        elementId: 'el-1',
        expectedRevision: 0,
        elementType: 'text',
        patch: { id: 'replacement' }
      }
    })
    expect(result.success).toBe(false)
  })

  test('rejects nested batches and transactions over 500 mutations', () => {
    const base = {
      transactionId: 'tx-1',
      projectId: 'project-1',
      origin: 'user',
      baseRevision: 0
    }
    expect(
      canvasMutationTransactionSchema.safeParse({
        ...base,
        mutations: [{ mutationId: 'nested', type: 'batch', payload: {} }]
      }).success
    ).toBe(false)
    expect(
      canvasMutationTransactionSchema.safeParse({
        ...base,
        mutations: Array.from({ length: 501 }, (_, index) => ({
          mutationId: `m-${index}`,
          type: 'document.delete',
          payload: { documentId: 'doc-1', expectedRevision: index }
        }))
      }).success
    ).toBe(false)
  })

  test('requires unique mutation ids and an origin run for agent writes', () => {
    const mutation = {
      mutationId: 'duplicate',
      type: 'document.delete',
      payload: { documentId: 'doc-1', expectedRevision: 0 }
    }
    const result = canvasMutationTransactionSchema.safeParse({
      transactionId: 'tx-agent',
      projectId: 'project-1',
      origin: 'agent',
      baseRevision: 0,
      mutations: [mutation, mutation]
    })
    expect(result.success).toBe(false)
  })
})
