import { z } from 'zod'
import type { Permission } from './permissions.js'

/**
 * 角色类型定义
 */
export const roleSchema = z.enum([
  'user',
  'admin',
  'reviewer',
  'editor',
  'viewer',
  'root'
])

export type Role = z.infer<typeof roleSchema>

/**
 * 角色权限映射 schema
 * 用于数据库存储和验证
 */
export const rolePermissionsSchema = z.object({
  role: roleSchema,
  permissions: z.array(z.string()),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export type RolePermissions = z.infer<typeof rolePermissionsSchema>

/**
 * 默认角色权限配置
 * 用于初始化和fallback
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'user',
    permissions: [
      'billing:read',
      'billing:write',
      'generation:generate',
      'workspace:sync'
    ],
    description: 'Regular user with basic permissions'
  },
  {
    role: 'viewer',
    permissions: ['canvas:read', 'generation:read', 'model-providers:read'],
    description: 'Read-only access to resources'
  },
  {
    role: 'editor',
    permissions: ['canvas:write', 'generation:write', 'model-providers:read'],
    description: 'Can create and edit content'
  },
  {
    role: 'reviewer',
    permissions: [
      'admin:access',
      'publish:review',
      'generation:generate',
      'workspace:sync'
    ],
    description: 'Content reviewer with admin and root access'
  },
  {
    role: 'admin',
    permissions: ['*:*'],
    description: 'Full system access'
  },
  {
    role: 'root',
    permissions: ['*:*'],
    description: 'Full system access'
  }
]

/**
 * 获取角色的权限列表
 * @param role - 角色名称
 * @param customPermissions - 自定义角色权限映射（可选）
 * @returns 该角色的权限列表
 */
export function getRolePermissions(
  role: Role,
  customPermissions?: RolePermissions[]
): Permission[] {
  const permissions = customPermissions ?? DEFAULT_ROLE_PERMISSIONS
  const rolePerms = permissions.find((rp) => rp.role === role)
  return (rolePerms?.permissions ?? []) as Permission[]
}

/**
 * 从多个角色聚合权限（去重）
 * @param roles - 角色列表
 * @param customPermissions - 自定义角色权限映射（可选）
 * @returns 聚合后的权限列表（去重）
 */
export function aggregateRolePermissions(
  roles: Role[],
  customPermissions?: RolePermissions[]
): Permission[] {
  const allPermissions = roles.flatMap((role) =>
    getRolePermissions(role, customPermissions)
  )
  return Array.from(new Set(allPermissions))
}

/**
 * 检查角色是否有特定权限
 * @param role - 角色名称
 * @param permission - 需要检查的权限
 * @param customPermissions - 自定义角色权限映射（可选）
 * @returns 该角色是否有此权限
 */
export function roleHasPermission(
  role: Role,
  permission: Permission,
  customPermissions?: RolePermissions[]
): boolean {
  const permissions = getRolePermissions(role, customPermissions)
  return permissions.includes(permission)
}
