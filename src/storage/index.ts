export const STORAGE_KEY_VERSION = 'v1' as const
export * from './imgproxy.js'
export * from './workspace-assets.js'

export const STORAGE_ENVIRONMENTS = ['dev', 'test', 'prod'] as const
export type StorageEnvironment = (typeof STORAGE_ENVIRONMENTS)[number]

export type UserStorageKind = 'objects'

export type StorageRuntimeInput = {
  nodeEnv?: string | null
  appHost?: string | null
  appDbName?: string | null
}

export type ObjectStoragePublicUrlEnv = {
  bucket: string
  endpoint: string
  publicBaseUrl?: string | null
}

function utcYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function normalizeHost(raw: string | null | undefined): string {
  const value = raw?.trim() ?? ''
  if (!value) return ''
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return value.toLowerCase()
  }
}

function assertNoPathTraversal(key: string): boolean {
  for (const part of key.split('/')) {
    if (part === '' || part === '.' || part === '..') return false
  }
  return true
}

function pathSegments(path: string): string[] {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, '')
  if (!trimmed) return []
  return trimmed.split('/').map((segment) => {
    try {
      return decodeURIComponent(segment)
    } catch {
      return segment
    }
  })
}

function encodePathSegments(segments: string[]): string {
  return segments.map((segment) => encodeURIComponent(segment)).join('/')
}

function hasTrailingSegments(path: string, trailing: string[]): boolean {
  if (trailing.length === 0) return true
  const base = pathSegments(path)
  if (base.length < trailing.length) return false
  return trailing.every(
    (segment, index) => base[base.length - trailing.length + index] === segment
  )
}

function objectPrefixSegments(base: URL, bucketPath: string[]): string[] {
  const basePath = pathSegments(base.pathname)
  if (hasTrailingSegments(base.pathname, bucketPath)) return basePath
  return [...basePath, ...bucketPath]
}

function objectUrlForBase(input: {
  base: string
  bucketPath: string[]
  key: string
}): string {
  const prefix = input.base.endsWith('/') ? input.base.slice(0, -1) : input.base
  const objectPath = encodePathSegments(pathSegments(input.key))

  try {
    const url = new URL(prefix)
    const bucketPath = hasTrailingSegments(url.pathname, input.bucketPath)
      ? []
      : input.bucketPath
    const bucketPrefix = encodePathSegments(bucketPath)
    return `${prefix}/${bucketPrefix ? `${bucketPrefix}/` : ''}${objectPath}`
  } catch {
    const bucketPrefix = encodePathSegments(input.bucketPath)
    return `${prefix}/${bucketPrefix ? `${bucketPrefix}/` : ''}${objectPath}`
  }
}

function objectKeyFromBase(input: {
  base: string
  bucketPath: string[]
  url: URL
}): string | null {
  let base: URL
  try {
    base = new URL(input.base)
  } catch {
    return null
  }
  if (input.url.origin !== base.origin) return null

  const prefixSegments = objectPrefixSegments(base, input.bucketPath)
  const urlSegments = pathSegments(input.url.pathname)
  if (urlSegments.length <= prefixSegments.length) return null

  const matchesPrefix = prefixSegments.every(
    (segment, index) => urlSegments[index] === segment
  )
  if (!matchesPrefix) return null

  return urlSegments.slice(prefixSegments.length).join('/')
}

export function storageEnvironmentFromRuntime(
  input: StorageRuntimeInput
): StorageEnvironment {
  const nodeEnv = input.nodeEnv?.trim() ?? ''
  const appHost = normalizeHost(input.appHost)
  const appDb = input.appDbName?.trim().toLowerCase() ?? ''

  if (
    nodeEnv === 'development' ||
    appDb.endsWith('_dev') ||
    appHost === 'localhost' ||
    appHost === '127.0.0.1'
  ) {
    return 'dev'
  }

  if (
    nodeEnv === 'test' ||
    appDb.endsWith('_test') ||
    appHost.startsWith('dev.') ||
    appHost.includes('.dev.') ||
    appHost.startsWith('test.') ||
    appHost.includes('.test.')
  ) {
    return 'test'
  }

  return 'prod'
}

export function storageEnvironmentPrefix(
  environment: StorageEnvironment
): string {
  return environment
}

export function userStorageNamespacePrefix(input: {
  environment: StorageEnvironment
  userId: string
}): string {
  return `${storageEnvironmentPrefix(input.environment)}/${STORAGE_KEY_VERSION}/users/${input.userId}`
}

export function userStorageKindPrefix(input: {
  environment: StorageEnvironment
  userId: string
  kind: UserStorageKind
}): string {
  return `${userStorageNamespacePrefix(input)}/${input.kind}`
}

export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200)
  return cleaned.length > 0 ? cleaned : 'file'
}

export function buildUserUploadObjectKey(input: {
  environment: StorageEnvironment
  userId: string
  originalFilename: string
  objectId: string
  kind?: UserStorageKind
  now?: Date
}): string {
  const kind: UserStorageKind = input.kind ?? 'objects'
  const ymd = utcYmd(input.now ?? new Date())
  const safe = sanitizeUploadFilename(input.originalFilename)
  return `${userStorageKindPrefix({
    environment: input.environment,
    userId: input.userId,
    kind
  })}/${ymd}/${input.objectId}-${safe}`
}

export function segmentsToStorageKey(segments: string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join('/')
}

export function userOwnsStorageKey(input: {
  key: string
  userId: string
  environment?: StorageEnvironment
}): boolean {
  if (!assertNoPathTraversal(input.key)) return false
  if (input.environment) {
    const prefix = `${userStorageNamespacePrefix({
      environment: input.environment,
      userId: input.userId
    })}/`
    return input.key.startsWith(prefix)
  }

  const legacyPrefix = `${STORAGE_KEY_VERSION}/users/${input.userId}/`
  if (input.key.startsWith(legacyPrefix)) return true

  return STORAGE_ENVIRONMENTS.some((environment) =>
    input.key.startsWith(
      `${userStorageNamespacePrefix({
        environment,
        userId: input.userId
      })}/`
    )
  )
}

export function tryParseV1UserObjectKey(key: string): {
  env: StorageEnvironment
  userId: string
  kind: UserStorageKind
  datePartition: string
  leaf: string
} | null {
  const re =
    /^(dev|test|prod)\/v1\/users\/([^/]+)\/(objects)\/(\d{4}-\d{2}-\d{2})\/(.+)$/
  const m = re.exec(key)
  if (!m) return null
  const [, env, uid, kind, datePartition, leaf] = m
  if (kind !== 'objects') return null
  if (!assertNoPathTraversal(key)) return null
  return {
    env: env as StorageEnvironment,
    userId: uid!,
    kind: 'objects',
    datePartition: datePartition!,
    leaf: leaf!
  }
}

export function buildWorkspaceObjectKey(input: {
  environment: StorageEnvironment
  workspaceId: string
  objectId: string
  extension?: string
}): string {
  const ext = input.extension ? `.${input.extension}` : ''
  return `${storageEnvironmentPrefix(input.environment)}/workspaces/${input.workspaceId}/objects/${input.objectId}${ext}`
}

export function storageObjectViewPathFromKey(key: string): string {
  return `/api/storage/objects/${key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`
}

export function storageObjectKeyFromViewUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  let pathname = raw
  try {
    pathname = new URL(raw).pathname
  } catch {
    pathname = raw
  }

  const prefix = '/api/storage/objects/'
  if (!pathname.startsWith(prefix)) return null
  const encoded = pathname.slice(prefix.length)
  if (!encoded) return null
  try {
    return encoded
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/')
  } catch {
    return null
  }
}

export function rustfsPublicObjectUrlFromEnv(
  key: string,
  env: ObjectStoragePublicUrlEnv
): string | null {
  const base = env.publicBaseUrl?.trim()
  if (!base) return null
  return objectUrlForBase({
    base,
    bucketPath: [env.bucket],
    key
  })
}

export function rustfsObjectKeyFromUrl(
  raw: string,
  env: ObjectStoragePublicUrlEnv
): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const candidates = [
    env.publicBaseUrl
      ? {
          base: env.publicBaseUrl,
          bucketPath: [env.bucket]
        }
      : null,
    {
      base: env.endpoint,
      bucketPath: [env.bucket]
    }
  ].filter(
    (
      candidate
    ): candidate is {
      base: string
      bucketPath: string[]
    } => Boolean(candidate)
  )

  for (const candidate of candidates) {
    const key = objectKeyFromBase({
      ...candidate,
      url
    })
    if (key) return key
  }

  return null
}
