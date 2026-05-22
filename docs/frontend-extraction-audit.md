# Frontend Contract Extraction Audit

Source project:

```txt
/Users/xuan/workspace/organization/canvas-frontend
```

## Extracted In This Package

These definitions are cross-service or persisted data contracts and now live in
`@dimleap/canvas-contracts`.

### Canvas Resources

Frontend source:

```txt
lib/projects/canvas-resource-types.ts
```

Contracts:

```txt
src/canvas/resources.ts
```

Extracted:

- `CanvasResourceType`
- `CanvasResource`
- `EdgeDependencyType`
- `ResourceFilter`

### Canvas Media Snapshot

Frontend source:

```txt
lib/projects/canvas-media-types.ts
```

Contracts:

```txt
src/canvas/media.ts
```

Extracted:

- `XYPositionContract`
- `CanvasMediaKind`
- `CanvasMediaEntry`

Not extracted:

- Drag-and-drop MIME constants and `DataTransfer` helpers. These are browser/UI implementation details.

### Generation Config And Payloads

Frontend sources:

```txt
lib/ai-image/types.ts
lib/ai-video/types.ts
lib/projects/canvas-node-generation-config.ts
```

Contracts:

```txt
src/canvas/generation.ts
```

Extracted:

- image generation model ids
- image quality/background/output format
- image reference source shapes
- `CanvasNodeGenerationConfig`
- `ImageGenerationRequestPayload`
- `VideoGenerationRequestPayload`

Not extracted:

- UI-only state such as active tabs, progress display, preview fallback text, and local task status.

### Workflow Node Data

Frontend sources:

```txt
components/canvas/normal-resource-node.tsx
components/canvas/ai-prompt-node.tsx
components/canvas/ai-image-node.tsx
components/canvas/ai-video-node.tsx
components/canvas/ai-write-node.tsx
components/canvas/ai-write-shot-node.tsx
lib/projects/storyboard-workflow-types.ts
lib/projects/canvas-flow.ts
lib/projects/canvas-persist.ts
```

Contracts:

```txt
src/canvas/workflow.ts
```

Extracted:

- `ProjectCanvasNodeType`
- `NormalResourceNodeData`
- `AiPromptNodeData`
- `AiImageNodeData`
- `AiVideoNodeData`
- `AiWriteNodeData`
- `AiWriteShotNodeData`
- `StoryboardTableRow`
- `StoryboardTableNodeData`
- `ImageGridNodeData`
- `ProjectCanvasFlowNode`
- `PersistedProjectCanvas`

Not extracted:

- React Flow `Node<T>` wrappers.
- layout helpers and edge styling rules.
- component props.

## Recommended Next Extraction

These are good candidates once the first contracts package is adopted by both frontend and agent.

### Workspace Project Sync

Frontend sources:

```txt
lib/workspace-sync/schema.ts
lib/workspace-sync/api.ts
lib/projects/project-document.ts
store/project-store/types.ts
```

Why:

- Shared server/client persistence payloads.
- Useful for agent reading project snapshots.

Risk:

- Contains app-specific project state and publication fields. Extract gradually.

### Model Registry

Frontend sources:

```txt
lib/models/types.ts
lib/system/node-type-models-schema.ts
lib/ai-image/model-category.ts
lib/ai-video/model-config.ts
```

Why:

- Agent and frontend both need model capability knowledge.

Risk:

- Some fields are admin/backend implementation details; split public model catalog from admin rows.

### Publication / Works

Frontend sources:

```txt
lib/projects/publication.ts
lib/works/types.ts
lib/works/featured-work-schema.ts
```

Why:

- Public gallery and publish review are API contracts.

Risk:

- Not needed by the current agent flow yet.

## Keep In Frontend

Do not move these into contracts:

- Zustand store state and actions.
- React component props.
- drag/drop browser helpers.
- layout algorithms.
- toasts/dialogs/theme/auth UI types.
- billing UI form state.
- local-only history panels and transient generation progress UI.

Contracts should describe data that crosses process, service, package, or persistence boundaries.
