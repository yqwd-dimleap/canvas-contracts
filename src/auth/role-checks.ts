import type { Role } from './roles.js'

export function canAccessAdminWithRoles(roles: Set<Role> | Role[]): boolean {
  const roleSet = Array.isArray(roles) ? new Set(roles) : roles
  return roleSet.has('root') || roleSet.has('admin') || roleSet.has('reviewer')
}

export function isAdminWithRoles(roles: Set<Role> | Role[]): boolean {
  const roleSet = Array.isArray(roles) ? new Set(roles) : roles
  return roleSet.has('root') || roleSet.has('admin')
}
