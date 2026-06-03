export type PathSanitizerConfig = {
  allowPrefixes: readonly string[]
}

export function sanitizePath(
  value: string | null | undefined,
  config: PathSanitizerConfig
): string | null {
  const raw = (value ?? '').trim()
  if (raw === '/') return '/'
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  if (raw.includes('://') || raw.includes('\\')) return null
  const allowed = config.allowPrefixes.some(
    (prefix) => raw === prefix || raw.startsWith(`${prefix}/`)
  )
  return allowed ? raw : null
}
