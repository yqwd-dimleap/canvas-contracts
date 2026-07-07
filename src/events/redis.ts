import { z } from 'zod'
import { canvasEventSchema } from './events.js'

const DEFAULT_EVENT_BUS_ROOT = 'canvas:events'

export const canvasEventBusMessageSchema = z.object({
  streamId: z.string().min(1),
  event: canvasEventSchema
})

export type CanvasEventBusMessage = z.infer<typeof canvasEventBusMessageSchema>

export function normalizeRedisEventBusEnv(
  value: string | undefined
): string | undefined {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || undefined
}

export function resolveRedisEventBusPrefix(input: {
  appEnv?: string
  explicitPrefix?: string
}): string {
  const explicit = input.explicitPrefix?.trim()
  if (explicit) return explicit.endsWith(':') ? explicit : `${explicit}:`

  const env = normalizeRedisEventBusEnv(input.appEnv)
  return env
    ? `${DEFAULT_EVENT_BUS_ROOT}:${env}:`
    : `${DEFAULT_EVENT_BUS_ROOT}:`
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
