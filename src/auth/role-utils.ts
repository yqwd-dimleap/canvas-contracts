import type { Role } from './roles.js'

export const ASSIGNABLE_STAFF_ROLES = [
  'admin',
  'reviewer'
] as const satisfies readonly Role[]

export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number]

export function isRole(value: unknown): value is Role {
  return (
    value === 'user' ||
    value === 'admin' ||
    value === 'reviewer' ||
    value === 'editor' ||
    value === 'viewer'
  )
}

export function isAssignableStaffRole(
  value: unknown
): value is AssignableStaffRole {
  return value === 'admin' || value === 'reviewer'
}

export function normalizeAssignableStaffRoles(
  roles: readonly unknown[]
): AssignableStaffRole[] {
  return ASSIGNABLE_STAFF_ROLES.filter((role) => roles.includes(role))
}
