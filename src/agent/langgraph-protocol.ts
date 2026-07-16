export const CANVAS_AGENT_PROTOCOL_VERSION = 'v2' as const

export const CANVAS_AGENT_ASSISTANT_ID = 'canvas-agent' as const

export const CANVAS_AGENT_GRAPH_NAME = 'canvas-agent' as const

export const CANVAS_AGENT_LANGGRAPH_ROUTE_PREFIX =
  '/api/agent/canvas/v2' as const

export const CANVAS_AGENT_LANGGRAPH_STREAM_PROTOCOL = 'v2-websocket' as const

/**
 * Channels supported by the Canvas LangGraph bridge.
 *
 * This is the protocol capability surface exposed to LangGraph SDK clients.
 * Do not shrink this list to the Canvas panel subscription surface: messages,
 * tools, updates, lifecycle, input, custom, and values are all bridge-level
 * capabilities.
 */
export const CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS = [
  'lifecycle',
  'messages',
  'tools',
  'updates',
  'custom',
  'values',
  'input'
] as const

/**
 * Channels consumed by the Canvas Agent panel.
 *
 * `values` carries backend-projected UI state snapshots as sync anchors —
 * emitted on subscribe and on non-token events only. Token streaming rides the
 * incremental `messages` channel (message-start / content-block-delta /
 * content-block-finish), so a long reply never re-serializes the full state
 * per token. `custom` carries canvas side effects (canvas.operation).
 */
export const CANVAS_AGENT_LANGGRAPH_UI_CHANNELS = [
  'values',
  'messages',
  'custom'
] as const

export const CANVAS_AGENT_LANGGRAPH_DEFAULT_CHANNELS =
  CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS

export const CANVAS_AGENT_LANGGRAPH_CUSTOM_CHANNELS = [
  'custom:canvas',
  'custom:artifact'
] as const

export const CANVAS_AGENT_LANGGRAPH_REPLAY_CHANNELS = ['values'] as const

export type CanvasAgentLangGraphDefaultChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_DEFAULT_CHANNELS)[number]

export type CanvasAgentLangGraphSupportedChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_SUPPORTED_CHANNELS)[number]

export type CanvasAgentLangGraphUiChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_UI_CHANNELS)[number]

export type CanvasAgentLangGraphCustomChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_CUSTOM_CHANNELS)[number]

export type CanvasAgentLangGraphReplayChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_REPLAY_CHANNELS)[number]

/**
 * LangGraph 协议桥的线格式事件（server → client）。
 *
 * 单一真相源：前端订阅循环与后端桥都以此为准，
 * 不要在消费方各自手写宽松类型。
 */
export type CanvasAgentLangGraphProtocolEvent = {
  type: 'event'
  event_id?: string
  seq?: number
  method: string
  params: {
    namespace?: string[]
    timestamp?: number
    data?: unknown
    [key: string]: unknown
  }
}

/** messages 通道的消息流事件（message-start / delta / finish）。 */
export type CanvasAgentLangGraphMessageStreamData = {
  event?: string
  id?: string
  role?: string
  index?: number
  delta?: { type?: string; text?: string }
  content?: { type?: string; text?: string }
}

/** state.get / GET thread state 响应中前端消费的最小形状。 */
export type CanvasAgentLangGraphThreadStateResponse = {
  values?: unknown
}
