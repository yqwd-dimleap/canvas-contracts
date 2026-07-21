/**
 * RBAC (Role-Based Access Control) Permission Model
 *
 * 提供统一的权限模型定义，供 canvas-agent 和 canvas-frontend 共享使用
 *
 * @module auth
 */

// Build context
export * from './build-context.js'
// Client capabilities
export * from './client-capabilities.js'
// Errors
export * from './errors.js'
// Guard checks
export * from './guard-checks.js'
export {
  can,
  hasPermission,
  requireAllPermissions,
  requireAnyPermission,
  requirePermission
} from './guards.js'
// Path sanitizer
export * from './path-sanitizer.js'
export * from './permissions.js'
// Role checks
export * from './role-checks.js'
// Role utilities
export * from './role-utils.js'
export * from './roles.js'
// Server authz
export * from './server-authz.js'
// Session schemas
export * from './session.js'
export * from './user-context.js'
export * from './user-settings.js'
