import { z } from 'zod'

export const authUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.url().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export const authSessionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export const authSessionPayloadSchema = z.object({
  user: authUserSchema,
  session: authSessionSchema
})

export const setPasswordRequestSchema = z
  .object({
    newPassword: z.string().min(8)
  })
  .strict()

export type AuthSession = z.infer<typeof authSessionSchema>
export type AuthSessionPayload = z.infer<typeof authSessionPayloadSchema>
