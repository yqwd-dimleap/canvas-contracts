/**
 * Utilities for safely extracting typed values from untyped records.
 * Used across migration scripts and data normalization flows.
 */

/**
 * Extract a trimmed non-empty string from a record field, or return empty string.
 */
export function stringValue(
  record: Record<string, unknown>,
  key: string
): string {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

/**
 * Extract a finite number from a record field, or return null.
 */
export function numberValue(
  record: Record<string, unknown>,
  key: string
): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Extract a positive finite number from a record field, or return null.
 */
export function positiveNumberValue(
  record: Record<string, unknown>,
  key: string
): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null
}

/**
 * Extract a boolean from a record field, or return false.
 */
export function booleanValue(
  record: Record<string, unknown>,
  key: string
): boolean {
  const value = record[key]
  return value === true
}

/**
 * Extract a timestamp (ms since epoch) from various date-like values.
 * Accepts: Date objects, numeric timestamps, ISO strings.
 */
export function dateMs(value: unknown): number {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return Date.now()
}

/**
 * Extract a nested record object from a field, or return null.
 */
export function recordValue(value: unknown): Record<string, unknown> | null {
  return value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Extract an array from a field, or return empty array.
 */
export function arrayValue<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}
