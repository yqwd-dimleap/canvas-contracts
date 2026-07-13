# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-06-11

首个正式版本。冻结跨服务 API 契约表面，作为 canvas-frontend / canvas-agent
共享的单一真相源。自此遵循语义化版本：新增取值用 minor，移除/收紧用 major。

### Added

- **模型分类归一化工具（`agent/model-category`）**：把"网关模型 id + 元数据 →
  modelCategory（image/video/chat/embedding/audio/other）"的启发式上移至 `agent`
  子路径，作为前后端单一真相源（原先前端 `helpers/models` 与 canvas-agent
  `routes/user` 各维护一份且已漂移）。导出 `categorizeGatewayModel`、
  `categorizeModelId`、`getEffectiveModelCategory`（metadata.modelKind 覆盖优先）、
  `isImageGenerationModelId` / `isVideoGenerationModelId` / `isImageToVideoModelId` /
  `isVideoEditModelId`、`MODEL_CATEGORY_ORDER` 及相关 metadata 键常量。

### Breaking

- **删除未使用的"直接生成"死合约（`generation`）**：移除前后端均零引用、且约束与
  实际链路冲突的 `imageGenerationRequest/Result/Response`、
  `videoGenerationRequest/Result/Response`、`generationStatusRequest/Response`
  及其类型。这些 schema 的 size/quality/resolution 取值与实际在用的 `canvas` 域
  （`presetSizeOptionSchema` 8 值、`imageQualitySchema`、`videoResolution` 自由值）
  矛盾，保留会误导。**实际在用的 `generationTask*` 体系与统一状态枚举
  `generationTaskStatusSchema`（`pending|polling|completed|failed`）保留不变。**
- **`agentChatResponseSchema` 类型化（`agent`）**：`content` 由 `z.unknown()` 收紧为
  `chatMessageContentSchema`（`string | 多模态片段数组`）；`messages` 由
  `z.array(z.unknown())` 收紧为 `z.array(agentChatMessageSchema)`（`{ role?, content }`，
  `.loose()` 以容纳底层 LangChain `BaseMessage` 的额外字段）。新增导出
  `AgentChatMessage` 类型。

### Changed

- **时间戳 schema 去重**：原先 `auth` / `agent` / `billing` 各自定义的
  `timestampSchema`（Date→epoch ms 预处理）统一收敛到内部 `shared/timestamp`，
  新增 `nullableTimestampSchema`（用于 `userBilling.renewsAt` 等可空时间戳）。
  行为等价（取最健壮的 Date+ISO 字符串 → number 归一），非破坏性。
- **视频分辨率大小写统一**：修正旧视频模板中分辨率默认值大小写不一致的问题，
  统一为大写 `'720P'`。

### Stability

- 导出表面：`.`、`./admin`、`./agent`、`./api`、`./auth`、`./billing`、
  `./canvas`、`./generation`、`./models`、`./rag`、`./workflow` 共 11 个子路径，
  类型与运行时 schema 均可解析。
- 模型 id 枚举与默认模型常量视为 v1 基线快照：新增模型走 minor，
  弃用先标注、移除走 major。

## [0.5.2] - 2026-06-05
- **删除bun.lock文件，使用bun.lockb二进制，并解决每次提交依赖变更导致的lockfile is frozen错误

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
- **Generation config fields**: Added `videoAspectRatio` to `CanvasNodeGenerationConfig`
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
