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
import { canvasRunRequestSchema } from '@yqwd-dimleap/canvas-contracts/agent'

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

## Package Layout

Each domain has a dedicated subpath export. Importers should prefer specific subpaths over the package root.

```txt
src/
  admin/       admin console response contracts
  agent/       Canvas Agent run/action, LangGraph runtime, model/node contracts
  api/         shared API response envelopes
  artifacts/   artifact contracts
  auth/        auth/session/permission/user contracts
  billing/     billing and credit schemas
  canvas/      Canvas context, graph nodes, Canvas2D, operations, capabilities
  events/      SystemEvent, CanvasEvent, webhook, notification, Redis helpers
  generation/  image/video generation request contracts
  models/      model registry and endpoint contracts
  rag/         RAG search request/response contracts
  storage/     workspace asset and imgproxy contracts
  team/        team membership schemas
  shared/      internal helpers, not exported as a subpath
  utils/       shared utility helpers
```

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
