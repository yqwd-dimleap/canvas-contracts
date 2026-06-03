import { can } from './guards.js'
import type { Permission } from './permissions.js'
import type { UserPermissionContext } from './user-context.js'

export type AuthzGuardError = {
  status: number
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'EMAIL_UNVERIFIED'
  message: string
}

export function checkVerifiedEmail(
  emailVerified: boolean
): AuthzGuardError | null {
  return !emailVerified
    ? {
        status: 403,
        code: 'EMAIL_UNVERIFIED',
        message: 'Email verification required.'
      }
    : null
}

export function checkPermission(
  ctx: UserPermissionContext,
  permission: Permission
): AuthzGuardError | null {
  return !can(ctx, permission)
    ? {
        status: 403,
        code: 'FORBIDDEN',
        message: `Permission denied: ${permission}`
      }
    : null
}
