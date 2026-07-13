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
 * The panel intentionally consumes backend-projected `values` as the single UI
 * state source, plus `custom` for canvas side effects. This is not a LangGraph
 * protocol limitation.
 */
export const CANVAS_AGENT_LANGGRAPH_UI_CHANNELS = ['values', 'custom'] as const

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
