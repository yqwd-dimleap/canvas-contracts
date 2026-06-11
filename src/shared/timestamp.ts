import { z } from 'zod'

/**
 * 时间戳：统一以 epoch 毫秒（number）表示。
 * 兼容历史/跨服务写入的 BSON Date（前端 Mongo repo 曾写 Date）与 ISO 字符串，
 * 读取时归一为 number，避免 `expected number, received Date`。
 *
 * 单一真相源：auth / agent / billing 等域共用，禁止再各自定义。
 */
const toEpochMillis = (value: unknown): unknown => {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : value
  }
  return value
}

export const timestampSchema = z.preprocess(toEpochMillis, z.number())

export const nullableTimestampSchema = z.preprocess(
  toEpochMillis,
  z.number().nullable()
)
