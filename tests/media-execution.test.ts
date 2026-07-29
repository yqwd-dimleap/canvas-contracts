import { describe, expect, test } from 'bun:test'
import { canvasEventSchema } from '../src/events/events.js'
import {
  listMediaExecutionsApiResponseSchema,
  mediaExecutionOutcomeSchema,
  mediaExecutionRequestSchema,
  mediaExecutionResultSchema,
  mediaExecutionSubmissionApiResponseSchema,
  mediaExecutionTaskDocumentSchema,
  mediaExecutionTaskSchema
} from '../src/generation/index.js'

const baseRequest = {
  schemaVersion: 1 as const,
  idempotencyKey: 'request-12345678',
  useCase: 'text-to-image' as const,
  input: {
    instruction: 'A quiet observatory above the clouds',
    params: {},
    references: { items: [] }
  },
  model: { strategy: 'system-default' as const },
  source: { kind: 'studio' as const },
  projections: [],
  policy: { mode: 'auto' as const, priority: 'interactive' as const },
  locale: 'en-US'
}

const completedTask = {
  schemaVersion: 1 as const,
  id: 'task-1',
  revision: 4,
  userId: 'user-1',
  projectId: null,
  idempotencyKey: 'request-12345678',
  useCase: 'text-to-image' as const,
  outputKind: 'image' as const,
  source: { kind: 'studio' as const },
  projectionTargets: [],
  status: 'completed' as const,
  stage: 'completed' as const,
  progress: 100,
  attempt: 1,
  maxAttempts: 3,
  createdAt: '2026-07-29T00:00:00.000Z',
  updatedAt: '2026-07-29T00:00:01.000Z',
  startedAt: '2026-07-29T00:00:00.100Z',
  completedAt: '2026-07-29T00:00:01.000Z',
  result: {
    assets: [
      {
        assetId: 'asset-1',
        type: 'image' as const,
        url: 'https://example.com/image.png'
      }
    ]
  }
}

describe('media execution request contracts', () => {
  test('keeps source and projection independent', () => {
    const request = mediaExecutionRequestSchema.parse({
      ...baseRequest,
      source: {
        kind: 'agent',
        projectId: 'project-1',
        threadId: 'thread-1',
        runId: 'run-1'
      },
      projections: [
        {
          kind: 'canvas-element',
          projectId: 'project-1',
          documentId: 'document-1',
          elementId: 'element-1'
        },
        {
          kind: 'agent-artifact',
          threadId: 'thread-1',
          runId: 'run-1'
        }
      ]
    })

    expect(request.source.kind).toBe('agent')
    expect(request.projections.map((target) => target.kind)).toEqual([
      'canvas-element',
      'agent-artifact'
    ])
  })

  test('requires explicit model ids only for explicit selection', () => {
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        model: { strategy: 'explicit' }
      }).success
    ).toBe(false)
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        model: { strategy: 'system-default', modelId: 'not-allowed' }
      }).success
    ).toBe(false)
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        model: { strategy: 'explicit', modelId: 'image-model-1' }
      }).success
    ).toBe(true)
  })

  test('validates use-case-specific text and reference inputs', () => {
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        useCase: 'text-to-speech',
        input: { params: {}, references: { items: [] } }
      }).success
    ).toBe(false)

    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        useCase: 'text-to-speech',
        input: {
          text: 'Welcome to VSpace',
          params: {},
          references: { items: [] }
        }
      }).success
    ).toBe(true)

    for (const useCase of ['image-to-image', 'image-edit', 'image-to-video']) {
      expect(
        mediaExecutionRequestSchema.safeParse({
          ...baseRequest,
          useCase,
          input: { ...baseRequest.input, references: { items: [] } }
        }).success
      ).toBe(false)
    }

    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        useCase: 'voice-clone',
        input: {
          params: {},
          references: {
            items: [
              {
                mediaType: 'audio',
                role: 'reference_voice',
                source: { kind: 'asset', assetId: 'audio-1' }
              }
            ]
          }
        }
      }).success
    ).toBe(true)
  })

  test('accepts every media use case with its required canonical input', () => {
    const image = {
      mediaType: 'image' as const,
      role: 'source' as const,
      source: { kind: 'asset' as const, assetId: 'image-1' }
    }
    const video = (assetId: string) => ({
      mediaType: 'video' as const,
      role: 'clip' as const,
      source: { kind: 'asset' as const, assetId }
    })
    const requests = [
      baseRequest,
      {
        ...baseRequest,
        useCase: 'image-to-image',
        input: {
          ...baseRequest.input,
          references: { items: [image] }
        }
      },
      {
        ...baseRequest,
        useCase: 'image-edit',
        input: {
          ...baseRequest.input,
          references: { items: [image] }
        }
      },
      { ...baseRequest, useCase: 'text-to-video' },
      {
        ...baseRequest,
        useCase: 'image-to-video',
        input: {
          ...baseRequest.input,
          references: { items: [image] }
        }
      },
      {
        ...baseRequest,
        useCase: 'video-edit',
        input: {
          ...baseRequest.input,
          references: { items: [video('video-1')] }
        }
      },
      {
        ...baseRequest,
        useCase: 'video-merge',
        input: {
          ...baseRequest.input,
          references: { items: [video('video-1'), video('video-2')] }
        }
      },
      {
        ...baseRequest,
        useCase: 'text-to-speech',
        input: { text: 'Welcome', params: {}, references: { items: [] } }
      },
      {
        ...baseRequest,
        useCase: 'voice-clone',
        input: {
          params: {},
          references: {
            items: [
              {
                mediaType: 'audio',
                role: 'reference_voice',
                source: { kind: 'asset', assetId: 'audio-1' }
              }
            ]
          }
        }
      }
    ]

    expect(
      requests.every(
        (request) => mediaExecutionRequestSchema.safeParse(request).success
      )
    ).toBe(true)
  })

  test('requires two clips for video merge', () => {
    const clip = (assetId: string) => ({
      mediaType: 'video' as const,
      role: 'clip' as const,
      source: { kind: 'asset' as const, assetId }
    })
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        useCase: 'video-merge',
        input: {
          ...baseRequest.input,
          references: { items: [clip('video-1')] }
        }
      }).success
    ).toBe(false)
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        useCase: 'video-merge',
        input: {
          ...baseRequest.input,
          references: { items: [clip('video-1'), clip('video-2')] }
        }
      }).success
    ).toBe(true)
  })

  test('rejects duplicate and cross-owner projections', () => {
    const canvasTarget = {
      kind: 'canvas-element' as const,
      projectId: 'project-2',
      documentId: 'document-1',
      elementId: 'element-1'
    }
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        source: { kind: 'canvas', projectId: 'project-1' },
        projections: [canvasTarget]
      }).success
    ).toBe(false)
    expect(
      mediaExecutionRequestSchema.safeParse({
        ...baseRequest,
        projections: [canvasTarget, canvasTarget]
      }).success
    ).toBe(false)
  })
})

describe('media execution task contracts', () => {
  test('supports voice profiles without pretending they are media assets', () => {
    expect(
      mediaExecutionResultSchema.parse({
        assets: [],
        voiceProfiles: [{ voiceProfileId: 'voice-1' }]
      })
    ).toMatchObject({
      assets: [],
      voiceProfiles: [{ voiceProfileId: 'voice-1' }]
    })
  })

  test('enforces output kind and terminal state invariants', () => {
    expect(mediaExecutionTaskSchema.safeParse(completedTask).success).toBe(true)
    expect(
      mediaExecutionTaskSchema.safeParse({
        ...completedTask,
        outputKind: 'video'
      }).success
    ).toBe(false)
    expect(
      mediaExecutionTaskSchema.safeParse({
        ...completedTask,
        stage: 'waiting-provider'
      }).success
    ).toBe(false)
    expect(
      mediaExecutionTaskSchema.safeParse({
        ...completedTask,
        attempt: 4,
        maxAttempts: 3
      }).success
    ).toBe(false)
    expect(
      mediaExecutionTaskSchema.safeParse({
        ...completedTask,
        result: {
          assets: [{ assetId: 'audio-1', type: 'audio' }]
        }
      }).success
    ).toBe(false)
    expect(
      mediaExecutionTaskSchema.safeParse({
        ...completedTask,
        completedAt: undefined
      }).success
    ).toBe(false)
    expect(
      mediaExecutionTaskSchema.safeParse({
        ...completedTask,
        status: 'failed',
        stage: 'failed',
        result: undefined,
        error: undefined
      }).success
    ).toBe(false)
  })

  test('distinguishes accepted and settled outcomes', () => {
    expect(
      mediaExecutionOutcomeSchema.safeParse({
        kind: 'settled',
        task: completedTask
      }).success
    ).toBe(true)
    expect(
      mediaExecutionOutcomeSchema.safeParse({
        kind: 'accepted',
        task: completedTask
      }).success
    ).toBe(false)
  })

  test('stores the complete recoverable request with normalized timestamps', () => {
    const document = mediaExecutionTaskDocumentSchema.parse({
      ...completedTask,
      request: baseRequest,
      requestHash: 'sha256:request',
      createdAt: new Date('2026-07-29T00:00:00.000Z'),
      updatedAt: '2026-07-29T00:00:01.000Z',
      startedAt: 1_753_747_200_100,
      completedAt: 1_753_747_201_000
    })
    expect(typeof document.createdAt).toBe('number')
    expect(document.request.useCase).toBe('text-to-image')
  })
})

describe('media execution HTTP contracts', () => {
  test('wraps submit and list responses in the shared API envelope', () => {
    expect(
      mediaExecutionSubmissionApiResponseSchema.safeParse({
        ok: true,
        data: {
          outcome: { kind: 'settled', task: completedTask },
          reused: false
        }
      }).success
    ).toBe(true)
    expect(
      listMediaExecutionsApiResponseSchema.safeParse({
        ok: true,
        data: { tasks: [completedTask], nextCursor: null }
      }).success
    ).toBe(true)
  })

  test('publishes the canonical task through one product event', () => {
    expect(
      canvasEventSchema.safeParse({
        eventId: 'event-1',
        eventType: 'generation.execution.updated',
        occurredAt: '2026-07-29T00:00:01.000Z',
        source: 'canvas-agent',
        userId: 'user-1',
        data: { task: completedTask }
      }).success
    ).toBe(true)
  })
})
