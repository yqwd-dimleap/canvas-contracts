# Canvas Contracts

Shared TypeScript and Zod contracts for Deep CX canvas frontend and agent services.

This package is intentionally an independent repository/package. Frontend and backend should depend on a versioned release instead of importing source from each other.

## Technology Choice

- TypeScript for static types.
- Zod as the single runtime schema source.
- ESM package exports.
- No framework dependency.
- No database or UI dependency.

## Install

```sh
bun add @deep-cx/canvas-contracts
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
import { canvasPlanRequestSchema } from "@deep-cx/canvas-contracts/agent"

const parsed = canvasPlanRequestSchema.safeParse(body)
```

Frontend response validation:

```ts
import { listAgentProfilesResponseSchema } from "@deep-cx/canvas-contracts/agent"

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

## Release

This package is published to GitHub Packages as a private organization package.

1. Update `version` in `package.json`.
2. Run checks locally:

```sh
bun run check
```

3. Commit and push to `main`.
4. Create and push a version tag:

```sh
git tag v0.1.1
git push origin v0.1.1
```

The `Publish` GitHub Action publishes only on `v*` tags. Normal pushes and pull
requests only run CI checks.
