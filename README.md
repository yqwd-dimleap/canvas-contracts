# Canvas Contracts

`@yqwd-dimleap/canvas-contracts` 是 Canvas frontend 与 agent 的共享
TypeScript/Zod 契约包。它是独立仓库和独立发布物；消费方依赖 registry 版本，
本地联调使用父目录 `link-contracts.sh`，不直接跨仓导入源码。

## Commands

```bash
bun install
bun run typecheck
bun run build
bun run test
bun run check
bun run pack:verify
```

修改 `src/` 后先 build，再重新链接并检查两个消费方：

```bash
cd canvas-contracts && bun run build
cd .. && ./link-contracts.sh
cd canvas-frontend && bun run typecheck
cd ../canvas-agent && bun run typecheck
```

## Import boundaries

优先使用具体 subpath，不从消费方复制 schema：

```ts
import {
  type CanvasDocument,
  type CanvasOperation,
  canvasRunRequestSchema,
} from '@yqwd-dimleap/canvas-contracts/canvas'

import {
  CANVAS_AGENT_LANGGRAPH_ROUTE_PREFIX,
  agentRuntimeConfigViewSchema,
} from '@yqwd-dimleap/canvas-contracts/agent'

import {
  type SystemEvent,
  systemEventSchema,
} from '@yqwd-dimleap/canvas-contracts/events'
```

## Package layout

```txt
src/
  admin/       admin console request/response contracts
  agent/       LangGraph wire protocol, model/runtime config, skills,
               suggestions, web search
  api/         HTTP success/error envelopes
  artifacts/   artifact schemas
  auth/        session, permission, user contracts
  billing/     billing and credit schemas
  canvas/
    core/      CanvasDocument, CanvasOperation, run context
    resources/ CanvasResource and media metadata
    agent/     actions, capabilities, prompt, interrupt, run/UI state
    events/    Canvas operation/runtime events
    snapshot/  snapshot compression
    view/      Canvas2D viewport/runtime view
    workspace/ project and brand-kit schemas
  events/      SystemEvent, CanvasEvent, Redis/webhook/notification events
  generation/  image/video payload and generation task contracts
  models/      model catalog and endpoint contracts
  rag/         RAG request/response contracts
  storage/     object storage and imgproxy contracts
  team/        team membership contracts
  workspace/   app config, featured work, public work
```

`src/canvas/events/operations.ts` is re-exported by `./events`; there is no
separate `./canvas/events` package subpath.

## Runtime invariants

- `CanvasRunRequest` is the cross-service run input.
- `CanvasDocument`, `CanvasResource` and `CanvasOperation` are the only
  persisted/cross-service canvas shapes.
- Canvas Agent action/capability/run/UI contracts are exported by `./canvas`.
- LangGraph wire shapes are defined once in
  `agent/langgraph-protocol.ts`; frontend and agent consume them.
- `SystemEvent` is the Agent run event union.
- `CanvasEvent` is the outer Redis/SSE/webhook product-event envelope, not a
  second Agent runtime protocol.
- `agent.interrupt` pauses a run; `agent.suggestions` does not.
- Runtime tool events are `tool.start`, `tool.progress`, `tool.result`
  and `tool.error`.
- UI positions, Pixi objects, DOM state and renderer internals do not belong in
  contracts.

Do not add React Flow shapes, client-owned message reducers, custom
`agent.event` envelopes, retired control events, or fields that duplicate
LangGraph/Deep Agents state.

## Versioning and release

- Patch: documentation, comments and non-behavioral refinements.
- Minor: additive backward-compatible schemas or fields.
- Major: removed/renamed fields, changed requiredness or changed semantics.

Any API-shape change must be checked against both consumers. Releases use:

```bash
./scripts/release.sh
./scripts/release.sh publish
./scripts/release.sh retry-publish
```

See `scripts/README.md` and `CHANGELOG.md`.
