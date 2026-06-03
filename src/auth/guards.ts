import type { Permission } from './permissions.js'
import { matchPermission } from './permissions.js'
import type { UserPermissionContext } from './user-context.js'

/**
 * 检查用户是否拥有特定权限
 * @param context - 用户权限上下文
 * @param required - 需要的权限
 * @returns 是否拥有该权限
 */
export function hasPermission(
  context: UserPermissionContext,
  required: Permission
): boolean {
  return matchPermission(required, context.permissions as Permission[])
}

/**
 * 检查用户是否拥有任一权限
 * @param context - 用户权限上下文
 * @param required - 需要的权限列表（满足其一即可）
 * @returns 是否拥有至少一个权限
 */
export function hasAnyPermission(
  context: UserPermissionContext,
  required: Permission[]
): boolean {
  return required.some((p) => hasPermission(context, p))
}

/**
 * 检查用户是否拥有所有权限
 * @param context - 用户权限上下文
 * @param required - 需要的权限列表（必须全部拥有）
 * @returns 是否拥有所有权限
 */
export function hasAllPermissions(
  context: UserPermissionContext,
  required: Permission[]
): boolean {
  return required.every((p) => hasPermission(context, p))
}

/**
 * 断言用户拥有特定权限（不满足则抛出错误）
 * @param context - 用户权限上下文
 * @param required - 需要的权限
 * @throws Error 如果用户没有该权限
 */
export function requirePermission(
  context: UserPermissionContext,
  required: Permission
): void {
  if (!hasPermission(context, required)) {
    throw new Error(`Permission denied: ${required}`)
  }
}

/**
 * 断言用户拥有任一权限（不满足则抛出错误）
 * @param context - 用户权限上下文
 * @param required - 需要的权限列表
 * @throws Error 如果用户没有任何一个权限
 */
export function requireAnyPermission(
  context: UserPermissionContext,
  required: Permission[]
): void {
  if (!hasAnyPermission(context, required)) {
    throw new Error(
      `Permission denied: requires one of [${required.join(', ')}]`
    )
  }
}

/**
 * 断言用户拥有所有权限（不满足则抛出错误）
 * @param context - 用户权限上下文
 * @param required - 需要的权限列表
 * @throws Error 如果用户缺少任何一个权限
 */
export function requireAllPermissions(
  context: UserPermissionContext,
  required: Permission[]
): void {
  if (!hasAllPermissions(context, required)) {
    const missing = required.filter((p) => !hasPermission(context, p))
    throw new Error(`Permission denied: missing [${missing.join(', ')}]`)
  }
}

/**
 * can() 是 hasPermission() 的别名，提供更直观的 API
 */
export const can = hasPermission
