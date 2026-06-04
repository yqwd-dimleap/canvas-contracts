import type { AuthzContext } from './client-capabilities.js'
import type { Role } from './roles.js'
import { aggregateRolePermissions } from './roles.js'
import type { AuthSessionPayload } from './session.js'

export type RoleProvider = {
  getRolesForUser(userId: string): Promise<Set<Role>>
}

export async function buildAuthzContextWithProvider(
  session: AuthSessionPayload,
  roleProvider: RoleProvider
): Promise<AuthzContext> {
  const roles = await roleProvider.getRolesForUser(session.user.id)
  const rolesArray = Array.from(roles) as any[]
  const permissions = aggregateRolePermissions(rolesArray)
  const isAdmin = roles.has('admin') || roles.has('root')

  return {
    session,
    userId: session.user.id,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    roles: rolesArray,
    permissions,
    isAdmin
  }
}
