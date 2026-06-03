import type { RoleProvider } from './build-context.js'
import { buildAuthzContextWithProvider } from './build-context.js'
import type { AuthzContext } from './client-capabilities.js'
import type { AuthSessionPayload } from './session.js'

export type SessionProvider = {
  getSession(): Promise<AuthSessionPayload | null>
}

export async function getOptionalServerAuthzWithProviders(
  sessionProvider: SessionProvider,
  roleProvider: RoleProvider
): Promise<AuthzContext | null> {
  const session = await sessionProvider.getSession()
  if (!session) return null
  return buildAuthzContextWithProvider(session, roleProvider)
}
