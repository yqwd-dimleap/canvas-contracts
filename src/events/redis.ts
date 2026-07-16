import { z } from 'zod'
import { canvasEventSchema } from './events.js'

const DEFAULT_CANVAS_REDIS_ROOT = 'canvas'
const DEFAULT_CANVAS_REDIS_ENV = 'development'

export const canvasEventBusMessageSchema = z.object({
  streamId: z.string().min(1),
  event: canvasEventSchema
})

export type CanvasEventBusMessage = z.infer<typeof canvasEventBusMessageSchema>

export function normalizeCanvasRedisEnv(
  value: string | undefined
): string | undefined {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || undefined
}

export const normalizeRedisEventBusEnv = normalizeCanvasRedisEnv

function normalizePrefix(value: string): string {
  return value.endsWith(':') ? value : `${value}:`
}

/** Shared physical Redis root for every Canvas service and domain. */
export function resolveCanvasRedisPrefix(input: {
  appEnv?: string
  explicitPrefix?: string
}): string {
  const explicit = input.explicitPrefix?.trim()
  if (explicit) return normalizePrefix(explicit)

  const env = normalizeCanvasRedisEnv(input.appEnv) ?? DEFAULT_CANVAS_REDIS_ENV
  return `${DEFAULT_CANVAS_REDIS_ROOT}:${env}:`
}

export function redisAgentPrefix(rootPrefix: string): string {
  return `${normalizePrefix(rootPrefix)}agent:`
}

export function redisEventsPrefix(rootPrefix: string): string {
  return `${normalizePrefix(rootPrefix)}events:`
}

export function redisAgentRunQueueKey(agentPrefix: string): string {
  return `${normalizePrefix(agentPrefix)}runs:ready`
}

export function redisAgentRunQueueStreamKey(agentPrefix: string): string {
  return `${normalizePrefix(agentPrefix)}runs:stream`
}

export function redisAgentRunEventsKey(
  agentPrefix: string,
  runId: string
): string {
  return `${normalizePrefix(agentPrefix)}run:${runId}:events`
}

export function resolveRedisEventBusPrefix(input: {
  appEnv?: string
  explicitPrefix?: string
  rootPrefix?: string
}): string {
  const explicit = input.explicitPrefix?.trim()
  if (explicit) return normalizePrefix(explicit)

  return redisEventsPrefix(
    input.rootPrefix ?? resolveCanvasRedisPrefix({ appEnv: input.appEnv })
  )
}

export function redisUserEventStreamKey(
  prefix: string,
  userId: string
): string {
  return `${prefix}user:${userId}:stream`
}

export function redisUserEventChannel(prefix: string, userId: string): string {
  return `${prefix}user:${userId}:notify`
}

export function redisGlobalEventStreamKey(prefix: string): string {
  return `${prefix}global:stream`
}

export function redisGlobalEventChannel(prefix: string): string {
  return `${prefix}global:notify`
}
