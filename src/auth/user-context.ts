import { z } from 'zod'
import type { Permission } from './permissions.js'
import { roleSchema } from './roles.js'

/**
 * 用户角色记录 schema
 * 用于数据库存储用户-角色关联
 */
export const userRoleSchema = z.object({
  userId: z.string(),
  role: roleSchema,
  grantedAt: z.number(),
  grantedBy: z.string().optional(),
  expiresAt: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export type UserRole = z.infer<typeof userRoleSchema>

/**
 * 用户权限上下文 schema
 * 用于应用层传递用户身份和权限信息
 */
export const userPermissionContextSchema = z.object({
  userId: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  roles: z.array(roleSchema),
  permissions: z.array(z.string()),
  isAdmin: z.boolean()
})

export type UserPermissionContext = z.infer<typeof userPermissionContextSchema>

/**
 * 构建用户权限上下文
 * @param userId - 用户ID
 * @param email - 用户邮箱
 * @param emailVerified - 邮箱是否验证
 * @param roles - 用户角色列表
 * @param permissions - 用户权限列表
 * @returns 用户权限上下文对象
 */
export function createUserPermissionContext(
  userId: string,
  email: string,
  emailVerified: boolean,
  roles: string[],
  permissions: Permission[]
): UserPermissionContext {
  return {
    userId,
    email,
    emailVerified,
    roles: roles as any[],
    permissions,
    isAdmin: roles.includes('admin')
  }
}
