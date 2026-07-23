import { describe, expect, test } from 'bun:test'
import { adminUserPatchRequestSchema } from '../src/admin/admin-business.js'
import { setPasswordRequestSchema } from '../src/auth/session.js'
import {
  WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION,
  workspaceProjectCanvasSchema,
  workspaceProjectSchema
} from '../src/canvas/workspace/project.js'
import { featuredWorkDocumentSchema } from '../src/workspace/featured-work.js'

describe('shared workspace schemas', () => {
  test('validates admin user mutations at the shared boundary', () => {
    expect(
      adminUserPatchRequestSchema.safeParse({
        userId: 'user-1',
        roles: ['admin']
      }).success
    ).toBe(true)
    expect(
      adminUserPatchRequestSchema.safeParse({ userId: 'user-1' }).success
    ).toBe(false)
    expect(
      adminUserPatchRequestSchema.safeParse({
        userId: 'user-1',
        plan: 'invalid'
      }).success
    ).toBe(false)
  })

  test('keeps project session, runs, and publication snapshot typed', () => {
    const project = workspaceProjectSchema.parse({
      id: 'project-1',
      title: 'Project',
      status: 'completed',
      historyId: null,
      previewImage: '',
      runs: [
        {
          id: 'run-1',
          timestamp: 1,
          status: 'success',
          prompt: 'prompt',
          model: 'model',
          previewImages: []
        }
      ],
      session: { prompt: 'prompt', quality: 'high' },
      createdAt: 1,
      updatedAt: 1,
      publication: {
        status: 'pending_review',
        submittedAt: '2026-07-22T00:00:00.000Z',
        snapshot: {
          schemaVersion: 1,
          title: 'Project',
          prompt: 'prompt',
          model: 'model',
          media: [
            {
              id: 'media-1',
              type: 'image',
              url: 'https://example.com/image.png',
              posterUrl: 'https://example.com/image.png',
              source: 'run'
            }
          ]
        },
        automatedReview: {
          status: 'pass',
          notes: 'Automatic checks passed.',
          reviewedAt: '2026-07-22T00:00:00.000Z'
        }
      }
    })

    expect(project.session.quality).toBe('high')
    expect(project.runs[0]?.id).toBe('run-1')
    expect(project.publication?.status).toBe('pending_review')
    expect(project.publication?.snapshot.media[0]?.id).toBe('media-1')
  })

  test('uses canvas as the only project snapshot field', () => {
    const canvas = {
      schemaVersion: WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION,
      revision: 1,
      canvasDocument: null
    }
    expect(workspaceProjectCanvasSchema.safeParse(canvas).success).toBe(true)
    expect(
      workspaceProjectCanvasSchema.safeParse({ resources: canvas }).success
    ).toBe(false)
  })

  test('validates featured work storage documents', () => {
    const media = {
      id: 'media-1',
      type: 'image' as const,
      url: 'https://example.com/image.png',
      width: 1024,
      height: 1024
    }
    expect(
      featuredWorkDocumentSchema.safeParse({
        id: 'work-1',
        title: 'Work',
        author: { name: 'Creator', handle: '@creator' },
        cover: {
          ...media,
          generation: {
            prompt: 'prompt',
            modelId: 'model',
            size: '1024x1024'
          }
        },
        media: [],
        taxonomy: { categories: [], tags: [], styleTags: [] },
        actions: [],
        relatedIds: [],
        createdAt: '2026-07-15T00:00:00.000Z'
      }).success
    ).toBe(true)
  })

  test('shares password request validation', () => {
    expect(
      setPasswordRequestSchema.safeParse({ newPassword: 'long-enough' }).success
    ).toBe(true)
    expect(
      setPasswordRequestSchema.safeParse({ newPassword: 'short' }).success
    ).toBe(false)
  })
})
