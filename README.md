# Canvas Contracts

Shared TypeScript and Zod contracts for Dimleap canvas frontend and agent services.

This package is intentionally an independent repository/package. Frontend and backend should depend on a versioned release instead of importing source from each other.

## Technology Choice

- TypeScript for static types.
- Zod as the single runtime schema source.
- ESM package exports.
- No framework dependency.
- No database or UI dependency.

## Install

```sh
bun add @dimleap/canvas-contracts
```

During local development, use a registry package, a git tag, or `bun link`.

## Scripts

```sh
bun install
bun run typecheck
bun run build
bun run check
```

## Versioning

Use semver.

- Patch: docs, comments, non-behavioral type refinements.
- Minor: additive and backward-compatible fields, routes, or schemas.
- Major: removed fields, renamed fields, changed requiredness, or changed semantics.

## Usage

Backend request validation:

```ts
import { canvasPlanRequestSchema } from "@dimleap/canvas-contracts/agent"

const parsed = canvasPlanRequestSchema.safeParse(body)
```

Frontend response validation:

```ts
import { listAgentProfilesResponseSchema } from "@dimleap/canvas-contracts/agent"

const json = await res.json()
const parsed = listAgentProfilesResponseSchema.parse(json)
```

## Package Layout

```txt
src/
  api/      shared API response envelopes
  agent/    agent profile and route contracts
  canvas/   resource and canvas context contracts
```
