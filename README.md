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
bun add @yqwd-dimleap/canvas-contracts
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
import { canvasRunRequestSchema } from "@yqwd-dimleap/canvas-contracts/workflow"

const parsed = canvasRunRequestSchema.safeParse(body)
```

Frontend response validation:

```ts
import { listAgentProfilesResponseSchema } from "@yqwd-dimleap/canvas-contracts/agent"

const json = await res.json()
const parsed = listAgentProfilesResponseSchema.parse(json)
```

## Package Layout

Each domain is a separate subpath export (e.g.
`@yqwd-dimleap/canvas-contracts/agent`). Importers should pull from the specific
domain, not the package root.

```txt
src/
  admin/       admin console responses
  agent/       agent profile, model-preference, and route contracts
  api/          shared API response envelopes
  auth/         auth/session and user contracts
  billing/      billing and credit schemas
  canvas/       resource and canvas context contracts
  events/       agent runtime event contracts
  generation/   image/video generation contracts
  models/       model catalog and registry contracts
  rag/          RAG search request/response contracts
  storage/      storage/asset contracts
  team/         team membership schemas
  workflow/     workflow and storyboard contracts
  shared/       internal-only helpers (not re-exported)
```

## Release

This package is published to GitHub Packages as a private organization package.
Use the automated release script (see `scripts/README.md` for full details):

```sh
./scripts/release.sh
# or, to also edit CHANGELOG.md:
./scripts/release.sh --with-changelog
```

The script checks the working tree is clean and on `main`, prompts for the bump
type (patch/minor/major), updates `package.json`, runs `bun run check`
(lint + typecheck + build), commits, creates an annotated `v*` tag, and pushes —
which triggers the `Publish` GitHub Action. The Action publishes only on `v*`
tags; normal pushes and pull requests only run CI checks.

To release manually instead, bump `version` in `package.json`, run
`bun run check`, commit to `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
