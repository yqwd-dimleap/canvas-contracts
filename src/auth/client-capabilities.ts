import type { Permission } from './permissions.js'
import type { AuthSessionPayload } from './session.js'
import type { UserPermissionContext } from './user-context.js'

export type ClientCapabilities = {
  emailVerified: boolean
  isAdmin: boolean
  canAccessAdmin: boolean
  permissions: Permission[]
}

export type AuthzContext = UserPermissionContext & {
  session: AuthSessionPayload
}

export function serializeClientCapabilities(
  ctx: AuthzContext
): ClientCapabilities {
  return {
    emailVerified: ctx.session.user.emailVerified,
    isAdmin: ctx.isAdmin,
    canAccessAdmin:
      ctx.isAdmin || ctx.permissions.includes('admin:access' as Permission),
    permissions: ctx.permissions as Permission[]
  }
}
