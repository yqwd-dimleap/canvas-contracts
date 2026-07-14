import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'

/**
 * 应用公开运行时配置 DTO。
 *
 * canvas-agent 的 GET /api/app/public-config（无鉴权）输出：探测 AI 网关是否由
 * 服务端托管、应用基础信息、OAuth 提供商是否已配置。均为布尔/主机名等非敏感信息，
 * 供前端登录/设置界面按能力渲染。目前无前端消费方，schema 先行收敛协议。
 */
export const appPublicConfigSchema = z.object({
  aiGateway: z.object({
    serverManaged: z.boolean(),
    hasBaseUrl: z.boolean(),
    hasApiKey: z.boolean(),
    gatewayHost: z.string().nullable()
  }),
  app: z.object({
    publicUrl: z.string().nullable(),
    betterAuthSecretConfigured: z.boolean()
  }),
  oauthServer: z.object({
    github: z.boolean(),
    google: z.boolean(),
    wechat: z.boolean()
  })
})

export type AppPublicConfig = z.infer<typeof appPublicConfigSchema>

/** GET /api/app/public-config 响应（标准 { ok, data } 信封）。 */
export const appPublicConfigApiResponseSchema = apiSuccessResponseSchema(
  z.object({ config: appPublicConfigSchema })
)

export type AppPublicConfigResponse = z.infer<
  typeof appPublicConfigApiResponseSchema
>['data']
