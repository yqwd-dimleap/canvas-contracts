import { z } from 'zod'

export const apiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional()
})

export function apiSuccessResponseSchema<TSchema extends z.ZodType>(
  data: TSchema
) {
  return z.object({
    ok: z.literal(true),
    data
  })
}

export function apiResponseSchema<TSchema extends z.ZodType>(data: TSchema) {
  return z.union([apiSuccessResponseSchema(data), apiErrorResponseSchema])
}

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>
export type ApiSuccessResponse<TData> = {
  ok: true
  data: TData
}

export function apiSuccess<TData>(data: TData): ApiSuccessResponse<TData> {
  return {
    ok: true,
    data
  }
}

export function apiError(error: string, details?: unknown): ApiErrorResponse {
  return details === undefined
    ? { ok: false, error }
    : { ok: false, error, details }
}
