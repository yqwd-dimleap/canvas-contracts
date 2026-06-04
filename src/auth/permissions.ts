import { z } from 'zod'

/**
 * 资源类型定义
 * 代表系统中可以被访问控制的资源
 */
export const resourceSchema = z.enum([
  'canvas',
  'generation',
  'agent-profiles',
  'model-providers',
  'users',
  'billing',
  'usage',
  'publish',
  'system',
  'workspace',
  'admin',
  'root'
])

/**
 * 操作类型定义
 * 代表可以对资源执行的操作
 */
export const actionSchema = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'write', // create + update
  'manage', // full access
  'access', // special action for admin areas
  'generate', // special action for AI generation
  'review', // special action for publish review
  'sync' // special action for workspace sync
])

/**
 * 权限字符串格式: resource:action
 * 例如: "canvas:create", "users:read", "admin:access", "root:access"
 */
export const permissionSchema = z.string().regex(/^[a-z-]+:[a-z]+$/)

export type Resource = z.infer<typeof resourceSchema>
export type Action = z.infer<typeof actionSchema>
export type Permission = z.infer<typeof permissionSchema>

/**
 * 类型安全的权限构造器
 * @param resource - 资源类型
 * @param action - 操作类型
 * @returns 格式化的权限字符串
 */
export function permission(resource: Resource, action: Action): Permission {
  return `${resource}:${action}` as Permission
}

/**
 * 权限匹配器（支持通配符）
 * @param required - 需要的权限
 * @param granted - 用户拥有的权限列表
 * @returns 是否匹配
 *
 * 支持的匹配模式：
 * 1. 精确匹配: "canvas:read" 匹配 "canvas:read"
 * 2. 资源通配: "canvas:*" 匹配 "canvas:read", "canvas:write" 等
 * 3. 超级权限: "*:*" 匹配所有权限
 */
export function matchPermission(
  required: Permission,
  granted: Permission[]
): boolean {
  // 精确匹配
  if (granted.includes(required)) return true

  // 通配符匹配（resource:* 表示该资源的所有操作）
  const [resource] = required.split(':')
  if (granted.includes(`${resource}:*` as Permission)) return true

  // 超级权限（*:* 表示所有权限）
  if (granted.includes('*:*' as Permission)) return true

  return false
}

/**
 * 批量权限匹配
 * @param required - 需要的权限列表
 * @param granted - 用户拥有的权限列表
 * @returns 每个权限的匹配结果
 */
export function matchPermissions(
  required: Permission[],
  granted: Permission[]
): boolean[] {
  return required.map((p) => matchPermission(p, granted))
}

/**
 * 检查是否拥有任一权限
 * @param required - 需要的权限列表（满足其一即可）
 * @param granted - 用户拥有的权限列表
 * @returns 是否拥有至少一个权限
 */
export function hasAnyPermission(
  required: Permission[],
  granted: Permission[]
): boolean {
  return required.some((p) => matchPermission(p, granted))
}

/**
 * 检查是否拥有所有权限
 * @param required - 需要的权限列表（必须全部拥有）
 * @param granted - 用户拥有的权限列表
 * @returns 是否拥有所有权限
 */
export function hasAllPermissions(
  required: Permission[],
  granted: Permission[]
): boolean {
  return required.every((p) => matchPermission(p, granted))
}
