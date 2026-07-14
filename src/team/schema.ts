import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  nullableTimestampSchema,
  timestampSchema
} from '../shared/timestamp.js'

export const teamRoleSchema = z.enum(['owner', 'admin', 'member'])
export type TeamRole = z.infer<typeof teamRoleSchema>

export const teamStatusSchema = z.enum(['active', 'archived'])
export type TeamStatus = z.infer<typeof teamStatusSchema>

export const teamMembershipStatusSchema = z.enum(['active', 'removed'])
export type TeamMembershipStatus = z.infer<typeof teamMembershipStatusSchema>

export const teamInviteStatusSchema = z.enum([
  'pending',
  'accepted',
  'revoked',
  'expired'
])
export type TeamInviteStatus = z.infer<typeof teamInviteStatusSchema>

export const teamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  ownerId: z.string().min(1),
  billingOwnerId: z.string().min(1),
  status: teamStatusSchema.default('active'),
  seatsLimit: z.number().int().min(1).default(5),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})
export type Team = z.infer<typeof teamSchema>

export const teamMemberSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: teamRoleSchema,
  status: teamMembershipStatusSchema.default('active'),
  invitedByUserId: z.string().nullable().default(null),
  joinedAt: nullableTimestampSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})
export type TeamMember = z.infer<typeof teamMemberSchema>

export const teamInviteSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  tokenHash: z.string().min(32),
  email: z.string().email().nullable().default(null),
  role: teamRoleSchema.exclude(['owner']).default('member'),
  status: teamInviteStatusSchema.default('pending'),
  createdByUserId: z.string().min(1),
  acceptedByUserId: z.string().nullable().default(null),
  expiresAt: timestampSchema,
  acceptedAt: nullableTimestampSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
})
export type TeamInvite = z.infer<typeof teamInviteSchema>

export const teamMemberViewSchema = teamMemberSchema.extend({
  user: z
    .object({
      id: z.string().min(1),
      name: z.string().nullable().default(null),
      email: z.string().nullable().default(null),
      image: z.string().nullable().default(null)
    })
    .nullable()
    .default(null)
})
export type TeamMemberView = z.infer<typeof teamMemberViewSchema>

export const teamInviteViewSchema = teamInviteSchema
  .omit({ tokenHash: true })
  .extend({
    inviteUrl: z.string().url().optional()
  })
export type TeamInviteView = z.infer<typeof teamInviteViewSchema>

export const teamOverviewSchema = z.object({
  teams: z.array(
    z.object({
      team: teamSchema,
      membership: teamMemberSchema
    })
  ),
  activeTeamId: z.string().nullable().default(null)
})
export type TeamOverview = z.infer<typeof teamOverviewSchema>

export const teamDetailSchema = z.object({
  team: teamSchema,
  membership: teamMemberSchema,
  members: z.array(teamMemberViewSchema),
  invites: z.array(teamInviteViewSchema).default([]),
  canManage: z.boolean().default(false)
})
export type TeamDetail = z.infer<typeof teamDetailSchema>

export const teamInvitePreviewSchema = z.object({
  team: teamSchema.pick({ id: true, name: true, seatsLimit: true }),
  invite: teamInviteSchema
    .pick({ id: true, email: true, role: true, expiresAt: true, status: true })
    .extend({
      expired: z.boolean()
    }),
  alreadyMember: z.boolean().default(false)
})
export type TeamInvitePreview = z.infer<typeof teamInvitePreviewSchema>

export const createTeamRequestSchema = z.object({
  name: z.string().trim().min(2).max(80)
})
export type CreateTeamRequest = z.infer<typeof createTeamRequestSchema>

export const createTeamInviteRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  role: teamRoleSchema.exclude(['owner']).default('member'),
  expiresInDays: z.number().int().min(1).max(30).default(7)
})
export type CreateTeamInviteRequest = z.infer<
  typeof createTeamInviteRequestSchema
>

export const acceptTeamInviteRequestSchema = z.object({
  token: z.string().min(20)
})
export type AcceptTeamInviteRequest = z.infer<
  typeof acceptTeamInviteRequestSchema
>

export const updateTeamMemberRoleRequestSchema = z.object({
  role: teamRoleSchema.exclude(['owner'])
})
export type UpdateTeamMemberRoleRequest = z.infer<
  typeof updateTeamMemberRoleRequestSchema
>

// ── 标准信封响应 schema（apiSuccess 内层，前端 parseEnvelope 校验用）──

/** GET /api/teams —— 当前用户可见的团队总览。 */
export const teamOverviewApiResponseSchema = apiSuccessResponseSchema(
  z.object({ overview: teamOverviewSchema })
)

/** 单个团队详情：POST /api/teams、GET/:id、接受邀请、成员增删改后统一返回。 */
export const teamDetailApiResponseSchema = apiSuccessResponseSchema(
  z.object({ detail: teamDetailSchema })
)

/** POST /api/teams/:teamId/invites —— 新建邀请。 */
export const teamInviteApiResponseSchema = apiSuccessResponseSchema(
  z.object({ invite: teamInviteViewSchema })
)

/** GET /api/teams/invites/:token —— 邀请预览（公开，无需登录）。 */
export const teamInvitePreviewApiResponseSchema = apiSuccessResponseSchema(
  z.object({ preview: teamInvitePreviewSchema })
)

/** DELETE /api/teams/:teamId/invites/:inviteId —— 撤销邀请。 */
export const teamRevokeInviteApiResponseSchema = apiSuccessResponseSchema(
  z.object({ deleted: z.boolean() })
)
