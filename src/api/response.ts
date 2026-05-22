import { z } from 'zod'

export const apiErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional()
})

export function apiSuccessResponseSchema<TSchema extends z.ZodType>(data: TSchema) {
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
export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse
