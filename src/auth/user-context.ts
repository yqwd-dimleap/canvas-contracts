import { z } from 'zod'
import { roleSchema } from './roles.js'

/**
 * 用户权限上下文 schema
 * 用于应用层传递用户身份和权限信息
 */
export const userPermissionContextSchema = z.object({
  userId: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  roles: z.array(roleSchema),
  permissions: z.array(z.string()),
  isAdmin: z.boolean()
})

export type UserPermissionContext = z.infer<typeof userPermissionContextSchema>
