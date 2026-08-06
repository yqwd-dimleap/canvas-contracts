import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import { timestampSchema } from '../shared/timestamp.js'

/** Canonical workspace context transport for capability-style APIs. */
export const WORKSPACE_CONTEXT_HEADER = 'X-Workspace-Id' as const
/** WebSocket fallback because browser WebSocket handshakes cannot set headers. */
export const WORKSPACE_CONTEXT_QUERY = 'workspace_id' as const

/**
 * A workspace is the sole content and authorization boundary for projects,
 * assets, brand kits, generation and deterministic media processing.
 *
 * Teams remain the organization, billing and membership domain. In the current
 * product model a team owns one workspace; a personal workspace is owned
 * directly by a user.
 */
export const workspaceKindSchema = z.enum(['personal', 'team'])
export type WorkspaceKind = z.infer<typeof workspaceKindSchema>

export const workspaceStatusSchema = z.enum(['active', 'archived'])
export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>

export const workspaceRoleSchema = z.enum([
  'owner',
  'admin',
  'editor',
  'commenter',
  'viewer'
])
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>

const workspaceBaseShape = {
  /** MongoDB ObjectId projected to a transport-safe string by the backend. */
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  status: workspaceStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}

export const personalWorkspaceSchema = z
  .object({
    ...workspaceBaseShape,
    kind: z.literal('personal'),
    ownerUserId: z.string().min(1),
    teamId: z.null()
  })
  .strict()

export const teamWorkspaceSchema = z
  .object({
    ...workspaceBaseShape,
    kind: z.literal('team'),
    ownerUserId: z.null(),
    teamId: z.string().min(1)
  })
  .strict()

export const workspaceSchema = z.discriminatedUnion('kind', [
  personalWorkspaceSchema,
  teamWorkspaceSchema
])
export type Workspace = z.infer<typeof workspaceSchema>

/** Resolved server-side access; clients must never self-assign this role. */
export const workspaceAccessSchema = z
  .object({
    workspace: workspaceSchema,
    role: workspaceRoleSchema
  })
  .strict()
export type WorkspaceAccess = z.infer<typeof workspaceAccessSchema>

export const workspaceListResponseSchema = z
  .object({ workspaces: z.array(workspaceAccessSchema) })
  .strict()

export const workspaceResponseSchema = z
  .object({ workspace: workspaceAccessSchema })
  .strict()

export const workspaceListApiResponseSchema = apiSuccessResponseSchema(
  workspaceListResponseSchema
)
export const workspaceApiResponseSchema = apiSuccessResponseSchema(
  workspaceResponseSchema
)
