# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-06-03

### Added

- **Edge schema** (`canvas/edge.ts`): Complete `ProjectCanvasEdge` type with `variant`, `dependencyType`, and `resourceFilter` support
- **Generation config fields**: Added `videoAspectRatio`, `promptExtend`, and `watermark` to `CanvasNodeGenerationConfig`
- **Resource node fields**: Added `assetId` and `modelUrl` to `NormalResourceNodeData` for asset management

### Changed

- Moved `ProjectCanvasEdgeVariant` from `workflow.ts` to dedicated `edge.ts` module
- Enhanced `CanvasNodeGenerationConfig` to match frontend requirements

### Migration Guide

#### For Agent (canvas-agent)

Already migrated in 0.2.0. No breaking changes.

#### For Frontend (canvas-frontend)

1. Update dependency:
   ```bash
   bun add @yqwd-dimleap/canvas-contracts@0.3.0
   ```

2. Replace local types:
   ```typescript
   // Before
   import type { Resource } from '@/components/canvas/types/canvas-resource-types'
   
   // After
   import type { CanvasResource } from '@yqwd-dimleap/canvas-contracts/canvas'
   ```

3. Use new edge types:
   ```typescript
   import type { ProjectCanvasEdge } from '@yqwd-dimleap/canvas-contracts/canvas'
   ```

## [0.2.0] - 2026-06-02

### Added

- Initial canvas workflow schemas
- Agent API contracts
- Resource and generation types

## [0.1.0] - 2026-05-30

### Added

- Initial project setup
- Basic canvas context types
