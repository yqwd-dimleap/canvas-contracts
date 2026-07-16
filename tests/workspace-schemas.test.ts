import { describe, expect, test } from 'bun:test'
import { adminUserPatchRequestSchema } from '../src/admin/admin-business.js'
import { setPasswordRequestSchema } from '../src/auth/session.js'
import { workspaceProjectSchema } from '../src/canvas/workspace/project.js'
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

  test('keeps project session, run, and publish review fields typed', () => {
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
      publishStatus: 'pending_review',
      publishReview: { agentStatus: 'pass', humanNote: null }
    })

    expect(project.session.quality).toBe('high')
    expect(project.runs[0]?.id).toBe('run-1')
    expect(project.publishReview?.agentStatus).toBe('pass')
    expect(project.publishReview?.humanNote).toBeUndefined()
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
        cover: media,
        media: [media],
        generation: { prompt: 'prompt', modelId: 'model', size: '1024x1024' },
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
