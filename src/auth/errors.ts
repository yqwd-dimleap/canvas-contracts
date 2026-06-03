export class AuthzError extends Error {
  status: number
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'EMAIL_UNVERIFIED'

  constructor(status: number, code: AuthzError['code'], message: string) {
    super(message)
    this.name = 'AuthzError'
    this.status = status
    this.code = code
  }
}

export function requireVerifiedEmail(emailVerified: boolean): void {
  if (!emailVerified) {
    throw new AuthzError(
      403,
      'EMAIL_UNVERIFIED',
      'Email verification required.'
    )
  }
}
