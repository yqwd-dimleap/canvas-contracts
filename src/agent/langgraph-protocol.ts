export const CANVAS_AGENT_PROTOCOL_VERSION = 'v2' as const

export const CANVAS_AGENT_ASSISTANT_ID = 'canvas-agent' as const

export const CANVAS_AGENT_GRAPH_NAME = 'canvas-agent' as const

export const CANVAS_AGENT_LANGGRAPH_ROUTE_PREFIX =
  '/api/agent/canvas/v2' as const

export const CANVAS_AGENT_LANGGRAPH_STREAM_PROTOCOL = 'v2-websocket' as const

export const CANVAS_AGENT_LANGGRAPH_DEFAULT_CHANNELS = [
  'lifecycle',
  'messages',
  'tools',
  'updates',
  'custom',
  'values',
  'input'
] as const

export const CANVAS_AGENT_LANGGRAPH_CUSTOM_CHANNELS = [
  'custom:canvas',
  'custom:artifact'
] as const

export const CANVAS_AGENT_LANGGRAPH_REPLAY_CHANNELS = ['values'] as const

export type CanvasAgentLangGraphDefaultChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_DEFAULT_CHANNELS)[number]

export type CanvasAgentLangGraphCustomChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_CUSTOM_CHANNELS)[number]

export type CanvasAgentLangGraphReplayChannel =
  (typeof CANVAS_AGENT_LANGGRAPH_REPLAY_CHANNELS)[number]
