# Canvas Contracts

Shared TypeScript and Zod contracts for Canvas frontend and agent services.

This package is an independent repository/package. Frontend and backend should depend on a versioned release from the registry, not import source from each other.

## Technology

- TypeScript for static types
- Zod as runtime schema source
- ESM subpath exports
- No framework, database, or UI dependency

## Install

```bash
bun add @yqwd-dimleap/canvas-contracts
```

In the parent `canvas-dev` workspace, use `link-contracts.sh` for local integration. Do not change consumer `package.json` to `link:` or workspace references.

## Scripts

```bash
bun install
bun run typecheck
bun run build
bun run test
bun run check
```

## Usage

Backend request validation:

```ts
import { canvasRunRequestSchema } from '@yqwd-dimleap/canvas-contracts/canvas'

const parsed = canvasRunRequestSchema.safeParse(body)
```

Frontend response validation:

```ts
import { agentRuntimeConfigViewSchema } from '@yqwd-dimleap/canvas-contracts/agent'

const json = await res.json()
const parsed = agentRuntimeConfigViewSchema.parse(json.data)
```

Runtime constants:

```ts
import { CANVAS_AGENT_LANGGRAPH_ROUTE_PREFIX } from '@yqwd-dimleap/canvas-contracts/agent'
import { CANVAS_AGENT_TOOL_NAMES } from '@yqwd-dimleap/canvas-contracts/canvas'
```

## Agent Runtime Boundaries

The Canvas Agent contracts intentionally keep one source of truth per runtime
concern:

- `CanvasRunRequest` is the only cross-service run input shape.
- `SystemEvent` / `SequencedSystemEvent` is the single runtime event vocabulary.
- `CanvasAgentUiState` is the backend-projected `values` state consumed by the
  Canvas Agent panel.
- LangGraph channel constants describe bridge capability. The panel subscribes
  to `values` and `custom`, but the bridge still supports `messages`, `tools`,
  `updates`, `lifecycle`, and `input`.
- `CanvasEvent` is the outer Redis/SSE/webhook event-bus envelope for async
  product notifications; it is not a second Agent runtime stream.

Do not add client-owned Agent message reducers, custom `agent.event` websocket
envelopes, or request fields that duplicate LangGraph/Deep Agents state.

## Package Layout

Each domain has a dedicated subpath export. Importers should prefer specific subpaths over the package root.

```txt
src/
  admin/       admin console response contracts
  agent/       LangGraph runtime, model catalog/admin runtime contracts, routes,
               skills, and suggestions
  api/         shared API response envelopes
  artifacts/   artifact contracts
  auth/        auth/session/permission/user contracts
  billing/     billing and credit schemas
  canvas/      Canvas v2 核心类型系统
    core/      核心类型：document, operations, context
    view/      视图相关：viewport
    resources/ 资源管理：types, storage
    agent/     Agent 相关类型：actions, capabilities, prompt, run-state, ui-state
    events/    Canvas 事件：operations (CanvasOperationEvent, CanvasRuntimeEvent)
    snapshot/  快照类型
    workspace/ 工作区项目类型
  events/      SystemEvent, CanvasEvent, webhook, notification, Redis helpers
               (re-exports canvas/events/operations for CanvasOperationEvent, CanvasRuntimeEvent)
  generation/  image/video generation request contracts
  models/      model registry and endpoint contracts
  rag/         RAG search request/response contracts
  storage/     workspace asset and imgproxy contracts
  team/        team membership schemas
  shared/      internal helpers, not exported as a subpath
  utils/       shared utility helpers
```

### Canvas 类型系统重构（2026-07-09）

Canvas v2 类型已从平铺结构重组为模块化架构：

**已删除的旧文件：**
- `canvas/canvas2d.ts` - 移至 `canvas/core/document.ts`
- `canvas/media.ts` - `CanvasMediaEntry` 已删除（包含 UI state），保留 `CanvasMediaKind`
- `canvas/compression.ts` - 已删除
- `canvas/workspace-project.ts` - 移至 `canvas/workspace/`
- `agent/canvas-*.ts` - 移至 `canvas/agent/`
- `events/canvas.ts` - 移至 `canvas/events/operations.ts`

**导入边界：**
- Canvas Agent run/action/UI/capability contracts 统一从 `@yqwd-dimleap/canvas-contracts/canvas` 导入。
- 通用 Agent runtime/model/admin contracts 从 `@yqwd-dimleap/canvas-contracts/agent` 导入。
- Canvas operation events 仍由 `@yqwd-dimleap/canvas-contracts/events` 暴露给事件总线消费。

**前端迁移注意：**
- `CanvasMediaEntry` 已从 contracts 删除（包含 UI position），前端需自行定义
- `CanvasMediaKind` 保留在 `canvas/resources/types`
- React Flow 相关代码已清理，Canvas2D 为唯一画布实现

## Versioning

Use semver:

- Patch: docs, comments, non-behavioral type refinements.
- Minor: additive and backward-compatible fields, routes, or schemas.
- Major: removed fields, renamed fields, changed requiredness, or changed semantics.

Any API-shape change must be checked against both `canvas-frontend` and `canvas-agent`.

## Release

This package publishes to GitHub Packages. Use the release script:

```bash
./scripts/release.sh
./scripts/release.sh publish
./scripts/release.sh retry-publish
./scripts/release.sh --with-changelog
```

The script prepares a local version commit and tag, runs `bun run check`, and leaves publishing as an explicit step. See `scripts/README.md` for details.
