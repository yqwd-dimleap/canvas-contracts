# RFC: Media Execution Runtime

> Status: Proposed
>
> Scope: `canvas-contracts`, `canvas-agent`, `canvas-frontend`
>
> Contract draft: `src/generation/media-execution.ts`

## 1. Decision

Canvas editing, Media Studio, and Agent tasks must share one media execution
application service. They may have different interaction shells and different
result projections, but they must not implement separate generation, billing,
provider polling, asset persistence, or retry paths.

Two independent dimensions replace the current Canvas-first coupling:

1. **Execution source**: who requested the work (`canvas`, `studio`, `agent`,
   or `api`).
2. **Projection target**: where the persisted result is presented
   (`canvas-element`, `agent-artifact`, or no additional projection).

The source does not decide the output location. For example, an Agent run can
generate directly into a Canvas element or return the same asset as an Agent
artifact.

```txt
Canvas UI -----------+
Media Studio --------+--> MediaExecutionPort --> provider/model adapter
Agent tool ----------+          |               --> billing
Public API ----------+          |               --> task + asset persistence
                                |
                                +--> CanvasElementProjector
                                +--> AgentArtifactProjector
                                +--> no projection (Studio/API reads task asset)
```

## 2. Current state and extraction seam

The system already has most of the provider-neutral input vocabulary:

- model controls live in `generationParams`;
- media references use typed media/role/source records;
- provider payload rendering happens on the server;
- billing and generated asset persistence happen in the generation module;
- generation tasks already survive browser navigation;
- Canvas Agent already delegates image/video calls to the generation module.

The remaining coupling is concentrated in four places:

1. `generationSystem.canvasTarget` mixes invocation context with Canvas output.
2. `generation_tasks` stores `documentId`, `elementId`, and `actionId` as
   first-class task identity.
3. Canvas progress/status emission wraps generation rather than observing a
   general task.
4. `element.generate` both requests generation and defines how the result is
   committed to Canvas.

The new runtime extracts these responsibilities without replacing provider
adapters, billing, model catalogs, or workspace asset persistence.

## 3. Invariants

### 3.0 Relationship to deterministic media jobs

`./media` remains the domain for deterministic processing of owned files, such
as PSD inspection and layer extraction. It must not be merged into generation
contracts: AI generation has model selection, provider polling, usage billing,
and generated-output persistence semantics that deterministic file processing
does not share.

The two domains may reuse infrastructure primitives such as leases, worker
heartbeats, idempotent repositories, cancellation, and queue consumers. They
do not share operation unions, result schemas, or billing policy.

### 3.1 Generate once, project many

A task calls a provider, charges usage, and persists its output exactly once.
Projection adapters consume the persisted result. A retry of a failed Canvas
commit must not call the provider or charge again.

### 3.2 Assets are canonical media results

Image, video, and audio generation outputs are registered as workspace assets
before a projection runs. Canvas elements and Agent artifacts reference those
assets. They do not own duplicate provider URLs.

Voice cloning is different: its canonical output is a voice profile and may
also include a preview audio asset. The result contract therefore carries
`assets` and `voiceProfiles` separately.

### 3.3 Source and projection remain orthogonal

Valid combinations include:

| Source | Projection | Example |
| --- | --- | --- |
| `studio` | none | Text-to-image page shows a persisted asset result |
| `canvas` | `canvas-element` | Element menu generates into its placeholder |
| `agent` | `canvas-element` | Complex Canvas command generates and commits |
| `agent` | `agent-artifact` | Agent task returns media without opening Canvas |
| `agent` | both | Agent task reports an artifact and places it on Canvas |
| `api` | none | API caller polls the canonical task |

### 3.4 Server-owned authority

`userId`, email verification, permissions, billing identity, provider secrets,
and execution fences are application context, never request fields. Every ID
inside `source` or `projections` must be ownership-checked by the server.

### 3.5 One transport vocabulary

Media execution does not introduce another Agent event envelope.

- Agent runs continue to use LangGraph SDK v2 and current `SystemEvent` types.
- Agent media progress is projected to existing semantic tool activity.
- Agent results use existing `artifact.*` events.
- Canvas changes use committed Canvas transaction events.
- Product/background task delivery uses the canonical
  `generation.execution.updated` CanvasEvent carrying the complete task.
  Existing `generation.progress|completed|failed` events remain temporary
  compatibility adapters derived from that task; they are not parallel source
  events for new implementations.

## 4. Contract model

The executable definitions live in
`src/generation/media-execution.ts` and are exported from `./generation`.

### 4.1 Use case

`MediaExecutionUseCase` is product intent rather than a provider endpoint:

```ts
type MediaExecutionUseCase =
  | 'text-to-image'
  | 'image-to-image'
  | 'image-edit'
  | 'text-to-video'
  | 'image-to-video'
  | 'video-edit'
  | 'video-merge'
  | 'text-to-speech'
  | 'voice-clone'
```

The existing `CanvasGenerationUseCase` remains a compatibility alias during
migration. New code imports `MediaExecutionUseCase` from `./generation`.

### 4.2 Request

```ts
type MediaExecutionRequest = {
  schemaVersion: 1
  idempotencyKey: string
  useCase: MediaExecutionUseCase
  input: {
    instruction?: string
    text?: string
    params: Record<string, unknown>
    references: GenerationReferences
  }
  model:
    | { strategy: 'explicit'; modelId: string }
    | { strategy: 'user-preference' }
    | { strategy: 'system-default' }
  source: MediaExecutionSource
  projections: MediaExecutionProjectionTarget[]
  policy: {
    mode: 'auto' | 'foreground' | 'background'
    timeoutMs?: number
    priority: 'interactive' | 'normal' | 'batch'
  }
  locale?: string
}
```

The Zod schema enforces:

- image/video operations require `input.instruction`;
- text-to-speech requires `input.text`;
- voice cloning requires an audio `reference_voice`;
- `explicit` model selection requires a model ID;
- preference/default selection must not smuggle a client model ID.

### 4.3 Sources

```ts
type MediaExecutionSource =
  | {
      kind: 'canvas'
      projectId: string
      actionId?: string
    }
  | {
      kind: 'studio'
      projectId?: string | null
      sessionId?: string
    }
  | {
      kind: 'agent'
      projectId?: string | null
      threadId: string
      runId: string
      toolCallId?: string
    }
  | {
      kind: 'api'
      projectId?: string | null
      clientId?: string
    }
```

Source metadata is for authorization, auditing, billing attribution, and
observability. Provider payload builders must not receive it.

### 4.4 Projection targets

```ts
type MediaExecutionProjectionTarget =
  | {
      kind: 'canvas-element'
      projectId: string
      documentId: string
      elementId: string
      actionId?: string
    }
  | {
      kind: 'agent-artifact'
      threadId: string
      runId: string
      artifactId?: string
    }
```

No projection is required for Media Studio and direct API calls. They consume
the task result and asset IDs directly.

Canvas layout does not belong in this generation contract. The Canvas planner
or UI creates the placeholder element first; the projector only patches the
existing element with the completed asset. This makes projection retryable and
keeps Canvas mutation semantics under `./canvas`.

### 4.5 Task lifecycle

```ts
type MediaExecutionStatus =
  | 'queued'
  | 'running'
  | 'waiting-provider'
  | 'projecting'
  | 'completed'
  | 'failed'
  | 'cancelled'
```

`MediaExecutionTask` is the Mongo/Redis/API recovery view. It records source,
projection targets, progress, provider task ID, assets, voice profiles,
projection results, and a stable error. Its monotonic `revision` lets SSE,
Redis, and polling consumers reject stale out-of-order updates; its
`schemaVersion` makes the persisted and wire task self-describing.

`MediaExecutionUpdate` contains the complete canonical task rather than a
second partial status shape. Application callbacks and
`generation.execution.updated` therefore share the same data contract.

The old status mapping during migration is:

| Existing | New |
| --- | --- |
| `pending` | `queued` |
| `polling` | `waiting-provider` |
| `completed` | `completed` |
| `failed` | `failed` |

The canonical task is the only persisted execution view. During the
compatibility window, adapters derive legacy responses and
`generation.progress|completed|failed` events for old readers; writers do not
persist a second execution state.

## 5. Shared application port

REST handlers, Canvas execution, and Agent tools call the same port:

```ts
interface MediaExecutionPort<
  TContext,
  TSignal = unknown,
  TRequest extends MediaExecutionRequest = MediaExecutionRequest,
  TOutcome extends MediaExecutionOutcome = MediaExecutionOutcome,
  TUpdate = MediaExecutionUpdate
> {
  execute(
    request: TRequest,
    context: TContext,
    options?: {
      signal?: TSignal
      waitForCompletion?: boolean
      onUpdate?: (update: TUpdate) => void | Promise<void>
    }
  ): Promise<TOutcome>

  get(taskId: string, context: TContext): Promise<MediaExecutionTask | null>
  list(
    query: ListMediaExecutionsQuery,
    context: TContext
  ): Promise<ListMediaExecutionsResponse>
  cancel(
    taskId: string,
    request: CancelMediaExecutionRequest,
    context: TContext
  ): Promise<MediaExecutionTask | null>
}
```

The server context is injected after authentication:

```ts
type ServerMediaExecutionContext = {
  user: {
    userId: string
    emailVerified: boolean
  }
  request: {
    ip?: string | null
    userAgent?: string | null
  }
  executionFence?: {
    assertSideEffectAllowed(): Promise<void>
  }
}
```

`waitForCompletion` is an adapter preference, not a provider mode:

- Studio/API normally accepts a task and observes it asynchronously.
- Canvas direct generation may wait while keeping a placeholder visible.
- Agent execution waits when later actions depend on the asset.
- An Agent task may accept background work and attach the artifact when the
  task completes.

## 6. Projection ports

Projection implementations are selected by `target.kind`:

```ts
interface MediaExecutionProjector<
  TKind extends MediaExecutionProjectionTarget['kind'],
  TContext = unknown
> {
  readonly kind: TKind
  project(input: {
    task: MediaExecutionTask
    target: MediaExecutionProjectionTargetOf<TKind>
    result: MediaExecutionResult
    context: TContext
  }): Promise<MediaExecutionProjectionResult>
}
```

Projectors have strict limits:

- they never call a model/provider;
- they never charge generation usage;
- they only reference already persisted outputs;
- they are idempotent for `(taskId, target)`;
- a failed projector can be retried independently.

### CanvasElementProjector

1. Verify project/document/element ownership.
2. Load the current Canvas revision.
3. Patch the existing placeholder with `assetId` and canonical media metadata.
4. Commit through `CanvasTransactionCoordinator`.
5. Return `committedRevision`.

If the placeholder was deleted, return a projection failure while preserving
the generated asset. Do not generate again and do not silently recreate the
element.

### AgentArtifactProjector

1. Verify thread/run ownership.
2. Upsert an image/video/audio Artifact referencing the asset.
3. Emit existing `artifact.*` events through the run recorder.
4. Return the artifact ID.

## 7. Call examples

### 7.1 Media Studio text-to-image

```ts
await mediaExecution.execute(
  {
    schemaVersion: 1,
    idempotencyKey: crypto.randomUUID(),
    useCase: 'text-to-image',
    input: {
      instruction: prompt,
      params,
      references: { items: [] }
    },
    model: { strategy: 'explicit', modelId },
    source: { kind: 'studio' },
    projections: [],
    policy: { mode: 'auto', priority: 'interactive' },
    locale
  },
  serverContext
)
```

The Studio page renders the returned task and its asset. It does not create a
project or load Canvas/Pixi.

### 7.2 Canvas element generation

```ts
await mediaExecution.execute(
  {
    schemaVersion: 1,
    idempotencyKey: `${runId}:${actionId}`,
    useCase: 'image-to-video',
    input: { instruction: prompt, params, references },
    model: { strategy: 'user-preference' },
    source: { kind: 'canvas', projectId, actionId },
    projections: [
      {
        kind: 'canvas-element',
        projectId,
        documentId,
        elementId,
        actionId
      }
    ],
    policy: { mode: 'foreground', priority: 'interactive' },
    locale
  },
  serverContext,
  { waitForCompletion: true, signal }
)
```

### 7.3 Agent task returning media

```ts
await mediaExecution.execute(
  {
    schemaVersion: 1,
    idempotencyKey: `${runId}:${toolCallId}`,
    useCase: 'text-to-video',
    input: { instruction: prompt, params, references: { items: [] } },
    model: { strategy: 'system-default' },
    source: { kind: 'agent', threadId, runId, toolCallId },
    projections: [{ kind: 'agent-artifact', threadId, runId }],
    policy: { mode: 'background', priority: 'normal' },
    locale
  },
  serverContext
)
```

### 7.4 Agent complex command writing to Canvas

The planner still emits renderer-agnostic Canvas actions. It first creates or
identifies a placeholder, then the `element.generate` compatibility adapter
maps the action to `MediaExecutionRequest` with an Agent source and a Canvas
projection. The media runtime does not parse Canvas actions itself.

## 8. HTTP API

The target public surface is media-neutral:

```txt
POST   /api/generation/executions
GET    /api/generation/executions/:taskId
POST   /api/generation/executions/:taskId/cancel
GET    /api/generation/executions?projectId=&statuses=&sourceKind=&limit=
```

`POST` accepts `MediaExecutionRequest` and returns
`MediaExecutionOutcome`. The server ignores or rejects authority that does not
belong to the authenticated user.

Compatibility routes remain temporarily:

```txt
POST /api/agent/images/generations
POST /api/agent/videos/generations
POST /api/agent/videos/retrieve
GET  /api/generation/tasks
```

Their handlers become thin adapters to `MediaExecutionPort`; they must not keep
separate orchestration branches.

Agent tools call the application port directly inside `canvas-agent`. They do
not call the service's own HTTP route.

## 9. Agent and workspace modes

Workspace mode controls the UI shell and allowed projections, not the media
implementation:

```ts
type WorkspaceMode = 'canvas' | 'agent'
```

- Canvas mode loads Canvas2D and permits Canvas projections.
- Agent mode loads the Agent workspace and defaults to artifact projection.
- An explicit, authorized “send to Canvas” command may add a Canvas projection
  from Agent mode.
- Media Studio does not require either workspace mode.

Capability resolution is server-owned. Agent mode does not receive Canvas
inspection/mutation tools unless the selected task explicitly targets an
authorized project Canvas.

## 10. Frontend boundaries

Introduce a surface-neutral client and runtime:

```txt
services/api/clients/media-execution-client.ts
hooks/generation/use-media-execution-task.ts
components/studio/creation-studio.tsx
components/agent/*
components/canvas2d/* adapters
```

Rules:

- `CreationStudio` must not import Canvas2D generation config components.
  Shared model controls move under `components/generation/`.
- `services/image-generation.ts` and `services/video-generation.ts` become
  compatibility wrappers over `media-execution-client`.
- task caching moves from `services/projects/persistence/` to a generation
  persistence boundary because Studio tasks may have no project.
- Canvas task observers translate generic task updates into element render
  state; Studio and Agent observers render their own presentation.
- all new visible labels, errors, empty states, and accessibility text use
  synchronized `en-US` and `zh-CN` keys.

## 11. Agent service boundaries

Target module layout:

```txt
src/modules/generation/
  application/
    media-execution.ts          orchestrator
    media-execution-worker.ts   durable execution
    media-projection.ts         projector registry
  domain/
    media-execution-policy.ts
    model-resolution.ts
  infrastructure/
    provider-gateway.ts
    media-execution.repository.ts
    canvas-element-projector.ts
    agent-artifact-projector.ts
  transport/
    media-execution-routes.ts
```

The existing `generate-media.ts` remains the provider/billing/asset core and is
called by the worker. `generation-with-progress.ts` is reduced to a Canvas/Agent
observer adapter, then removed after all callers consume task updates.

## 12. Migration route

### Phase 0 — contract and tests

- Add the new schemas/types and application/projector ports.
- Add contract tests for every source, use case, projection, and invalid
  cross-field combination.
- Do not change existing package or protocol versions.

### Phase 1 — canonical execution service

- Implement `MediaExecutionPort` around existing generation application code.
- Add a task repository with idempotent create-by `(userId, idempotencyKey)`.
- Persist canonical outputs before projection.
- Implement model and reference resolution once.
- Keep existing REST routes as adapters.

Acceptance: the same request produces the same task/asset through the old image
route and the new execution service, with one billing record.

### Phase 2 — Canvas adapter

- Implement `CanvasElementProjector`.
- Map `element.generate` to a media execution request.
- Move placeholder progress rendering to a generic task observer.
- Remove provider calls and asset parsing from Canvas execution.

Acceptance: Canvas undo/history, revision conflict handling, incremental media
commits, and existing generation UI behavior remain unchanged.

### Phase 3 — Media Studio

- Add `media-execution-client` and task hook.
- Move shared model control UI out of Canvas2D.
- Enable image and video Studio routes against the canonical API.
- Add result history backed by canonical tasks/assets.
- Add TTS and voice profile adapters only after their provider contracts are
  configured.

Acceptance: Studio generation works without creating a project or importing a
Canvas store.

### Phase 4 — Agent task mode

- Add workspace/project mode with old records defaulting to `canvas`.
- Extract the generic thread/run UI from `use-canvas2d-agent`.
- Add Agent media tools that call `MediaExecutionPort` directly.
- Implement `AgentArtifactProjector`.
- Resolve capabilities by workspace mode and explicit target.

Acceptance: a user can run a long Agent task, navigate away, return to its
thread, and see task progress and persisted artifacts without loading Pixi.

### Phase 5 — durable recovery and cleanup

- Make execution stages resumable from persisted task state.
- Reclaim expired running tasks only at safe stage boundaries.
- Add cancellation propagation to providers where supported.
- Remove Canvas-specific task fields and legacy orchestration wrappers after
  telemetry shows no remaining callers.

Acceptance: service restart during provider wait or projection does not charge
twice, lose the asset, or duplicate a Canvas mutation/artifact.

## 13. Failure and retry matrix

| Failure | Retry behavior |
| --- | --- |
| model/reference validation | fail before task/provider call |
| billing reservation | fail before provider call |
| provider request | retry only according to provider policy and same task |
| provider polling | resume polling from `providerTaskId` |
| asset persistence | retry persistence; do not re-call provider if output is recoverable |
| Canvas projection conflict | retry projection against current revision |
| placeholder deleted | projection fails; asset remains available |
| Artifact projection failure | retry artifact upsert only |
| worker lease loss | next worker resumes from persisted stage/fence |
| client disconnect | task continues according to execution policy |

## 14. Observability and billing

Every log, trace, usage record, task, and projection carries:

```txt
taskId, idempotencyKey, source.kind, useCase,
projectId?, threadId?, runId?, actionId?, providerTaskId?
```

Billing is attached to provider execution, not projection. Projection retries
must produce no generation usage record. Metrics should separate:

- queue latency;
- provider latency;
- provider polling duration;
- asset persistence duration;
- projection duration and retry count;
- end-to-end task duration.

## 15. Security

- Verify every referenced asset belongs to the authenticated user.
- Verify project/document/element ownership before Canvas projection.
- Verify thread/run ownership before Artifact projection.
- Resolve model availability and preferences server-side.
- Never accept `userId`, billing price, provider name, provider payload fields,
  storage keys, or execution fence tokens from clients.
- Redact signed/private media URLs from logs and long-lived task payloads.

## 16. Test strategy

### Contracts

- cross-field request validation;
- source/projection discriminated unions;
- visual, video, TTS, and voice-clone cases;
- task/result recovery serialization.

### Agent service

- idempotent submit and duplicate delivery;
- one charge and one asset for multiple projections;
- provider polling restart recovery;
- projection retry without provider replay;
- lease loss at provider, persistence, and projection boundaries;
- ownership checks for every target/reference.

### Frontend

- Studio submits without Canvas/project state;
- Canvas observer updates the correct placeholder;
- Agent artifact survives reload;
- task cache identity isolation;
- route navigation does not cancel background work unless requested.

### Cross-service acceptance

Run one configured model through all four sources and assert the same canonical
asset metadata, billing rule, task lifecycle, and error vocabulary.

## 17. Explicit non-goals

- Do not add a second Agent transport or custom Agent event envelope.
- Do not expose provider-specific request bodies to frontend or model tools.
- Do not move Canvas mutations into the generation module.
- Do not make Pixi/display objects part of a media request or result.
- Do not restore task-specific Agent profiles or multiple runtime model configs.
- Do not silently fall back from a failed projection to another destination.
