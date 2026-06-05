# Changelog

All notable changes to this project will be documented in this file.

## [0.5.1] - 2026-06-05
- **增加模型列表枚举类型，增强渠道返回模型列表的可读性

## [0.4.0] - 2026-06-04

### Added

- **Complete RBAC authorization system** (`auth/`): Full-featured role-based access control with business rule layer
  - `client-capabilities.ts`: AuthzContext type and ClientCapabilities serialization
  - `admin-config.ts`: Admin API authorization configuration
  - `path-sanitizer.ts`: Generic path security validation
  - `role-checks.ts`: Role checking business logic
  - `guard-checks.ts`: Permission checking logic (returns error objects)
  - `build-context.ts`: AuthzContext builder (dependency injection)
  - `server-authz.ts`: Server-side authorization entry point (generic)
  - `roles.ts`: Role definitions including new `root` role
  - `permissions.ts`: Comprehensive permission system
  - `guards.ts`: Authorization guard implementations
  - `errors.ts`: Authorization error types
  - `session.ts`: Session management types
  - `user-context.ts`: User context with role and capabilities

### Changed

- **Architecture improvements**:
  - Business rules fully decoupled from framework
  - Dependency injection for data source decoupling
  - Cross-service authorization logic reuse
  - All business logic independently testable

### Breaking Changes

- Major version bump to 0.3.1 due to extensive new `auth` module exports
- Projects consuming this package should review and adopt the new authorization system

### Migration Guide

#### For Backend Services (canvas-agent, etc.)

1. Update dependency:
   ```bash
   bun add @yqwd-dimleap/canvas-contracts@0.4.0
   ```

2. Import new authorization modules:
   ```typescript
   import { 
     buildAuthzContext, 
     checkServerAuthz,
     type UserContext,
     type AuthzContext 
   } from '@yqwd-dimleap/canvas-contracts/auth'
   ```

3. Replace legacy authorization logic with the new RBAC system

## [0.3.1] - 2026-06-03

### Added

- Exported `NodeResourceArrays` and `CanvasResourceMetadata` types for better resource type management

### Fixed

- Updated README package name path from old to new location

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
