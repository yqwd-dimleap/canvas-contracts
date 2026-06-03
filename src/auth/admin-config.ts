import type { Permission } from './permissions.js'

export type AdminAuthzConfig = {
  permission: Permission
  requireVerifiedEmail: boolean
}

export function adminApiAuthz(permission: Permission): AdminAuthzConfig {
  return { permission, requireVerifiedEmail: true }
}
