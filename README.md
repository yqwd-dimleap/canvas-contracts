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
  type CanvasMutationTransaction,
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
    core/      CanvasDocument, mutation transactions, receipts and effects
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
- `CanvasDocument`, `CanvasMutationTransaction`, receipts and transient effects
  are the cross-service Canvas shapes.
- `WorkspaceProjectCanvas` contains only revisioned Canvas content. Editor view
  state is frontend-local and active thread state belongs to the Agent domain.
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

- Package versions, persisted schema versions, and wire protocol versions are
  independent version spaces. Never copy a package major into a schema or
  protocol version.
- The current baselines are package `2.0.x`, CanvasDocument schema `1`,
  workspace Canvas schema `2`, and Canvas Agent application protocol `v2`.
- Schema and protocol versions advance only with an explicit migration plan;
  ordinary package releases must not change them.
- Do not change the package version while implementing a feature or fix. A
  version bump happens only when a release is explicitly being prepared.
- Patch (`2.0.11 -> 2.0.12`): small fixes, documentation, and routine
  compatible maintenance. Increment the last number by one.
- Minor (`2.0.x -> 2.1.0`): regular large releases, cross-module features, or
  coordinated contract/data migrations. Increment the middle number by one.
- Major (`2.x.x -> 3.0.0`): reserved for an explicitly approved,
  generation-scale architecture or product-platform upgrade.
- Removed or renamed fields, requiredness changes, and semantic changes do not
  by themselves authorize a major bump. Never jump from `2.0.0` to `3.0.0`
  for an ordinary change; document the migration and let the release owner
  choose the version using the scale rules above.

Any API-shape change must be checked against both consumers. Releases use:

```bash
./scripts/release.sh
./scripts/release.sh publish
./scripts/release.sh retry-publish
```

See `scripts/README.md` and `CHANGELOG.md`.
