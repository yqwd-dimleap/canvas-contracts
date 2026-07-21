# Scripts

## release.sh

自动化发布脚本，用于规范版本发布流程。

脚本把“准备 release”和“触发 publish”拆成两个显式阶段。这样 GitHub
Actions 发布失败后，可以针对同一个 `package.json` 版本和同一个 tag 重试，
不会因为再次执行脚本而误 bump 到下一个 patch 版本。

> **关键设计：tag 在 `publish` 阶段才创建**（按当前 HEAD 现打），`prepare`
> 只做「bump 版本 + 提交」不打 tag。这样即使 prepare 之后又改了代码，也不会出现
> 「tag 指向过时 commit / 版本已 bump 却卡住无法发布」的死结——随时可以用
> `status` 看状态、用 `abort` 干净回退。

### 功能

- ✅ 自动检查工作目录状态（未提交的文件会阻止发布）
- ✅ 自动计算新版本号（patch/minor/major）
- ✅ 显示自上次发布以来的 commit 历史
- ✅ 自动更新 `package.json` 版本号
- ✅ 默认跳过文档更新，需要时可用 `--with-changelog` 打开 `CHANGELOG.md`
- ✅ 运行完整检查（lint + typecheck + build）
- ✅ `prepare` 只创建本地版本提交；tag 延后到 `publish` 时按 HEAD 现打
- ✅ 用显式 `publish` 命令推送远程并触发 GitHub Actions 发布
- ✅ 用显式 `retry-publish` 命令复用当前版本/tag 重试失败的发布
- ✅ 用 `status` 一眼看清当前发布状态与推荐的下一步
- ✅ 用 `abort` 安全回退「本地已 prepare 但未推送」的发布，保留无关改动

### 使用方法

```bash
# 准备 release：bump 版本、检查、创建本地 release commit（不打 tag）
./scripts/release.sh

# 需要同步维护发布说明时
./scripts/release.sh --with-changelog

# 查看当前发布状态和推荐的下一步
./scripts/release.sh status

# 撤销本地已 prepare 但还没推送的发布（版本号回退，保留其它改动）
./scripts/release.sh abort

# 触发发布：推送已准备好的 release commit 和 tag
./scripts/release.sh publish

# 发布 Action 失败后的重试：不 bump 版本，不创建新 commit
./scripts/release.sh retry-publish
```

### 发布流程

1. **准备 release**
   - 确保在 git 仓库中
   - 检查是否在 `main` 分支
   - 检查工作目录是否干净
   - 拉取最新代码
   - `patch` (0.6.0 → 0.6.1): bug 修复、文档更新、非功能性改动
   - `minor` (0.6.0 → 0.7.0): 新功能、向后兼容的改动
   - `major` (0.6.0 → 1.0.0): 破坏性变更
   - 显示自上次 tag 以来的所有 commits
   - 帮助你确认版本类型是否正确
   - 自动更新 `package.json` 中的版本号
   - 默认不更新 `CHANGELOG.md`
   - 传入 `--with-changelog` 时会打开编辑器并提示添加日期和变更内容
   - 执行 `bun run check`（lint + typecheck + build）
   - 如果失败会自动回滚 `package.json` 的修改
   - 提交格式：`chore(release): vX.Y.Z`
   - **不创建 tag**（tag 延后到 `publish` 阶段按 HEAD 现打）
   - 如果检测到已经 prepare 过（未发布），不会重复 bump，而是提示用
     `publish` / `abort` / `status`

2. **触发发布**
   - 运行 `./scripts/release.sh publish`
   - 确认当前 HEAD 就是本次版本的 `chore(release): vX.Y.Z` 提交
   - 推送 commit 到 `origin/main`
   - 在 HEAD 上创建 annotated tag `vX.Y.Z` 并推送，触发 GitHub Actions
   - GitHub Actions 自动发布到 GitHub Packages

3. **发布失败后重试**
   - 修复 GitHub Actions、registry token、权限或网络问题
   - 运行 `./scripts/release.sh retry-publish`
   - 脚本会确认当前 HEAD 是对应版本的 release 提交
   - 如果远端 tag 已存在且指向当前 HEAD，脚本会删除并重新推送同一个远端 tag 以重新触发 Actions
   - 如果远端 tag 还不存在，则等同于正常 `publish`
   - 整个过程不会修改 `package.json`，也不会 bump 到下一个版本

如果已经 prepare 过（HEAD 是 `chore(release): vX.Y.Z` 且未发布），
再次运行默认的 `./scripts/release.sh` 会直接提示使用 `publish` /
`abort`，不会进入版本选择、也不会重复 bump。

### 查看状态

任何时候都可以运行 `./scripts/release.sh status`，它会打印：分支、当前
`package.json` 版本、工作区是否干净、相对 origin 领先/落后多少、本地与远端
tag 情况，以及一个明确的推荐下一步。它把内部状态归为：

- `FRESH` — 没有待发布内容，可以 `prepare`
- `PREPARED_CLEAN` — 已 prepare 未发布，直接 `publish` 或 `abort`
- `PREPARED_DIRTY` — 已 prepare 但又有新改动，`abort` 折叠进下次发布，或提交后 `publish`
- `STACKED` — 版本已 bump 但 release 提交上又叠了新提交，用 `abort` 回退
- `PUBLISHED` — 当前版本已发布，`prepare` 开始下一个版本

### 如果中途想取消

`prepare` 只准备本地 release，不会推送远端。想撤销时**不要手动删 tag / reset**，
直接用内置命令（会保留你无关的工作区改动，已推送到远端的会拒绝）：

```bash
./scripts/release.sh abort
```

- 若 release 提交就是 HEAD：软回退该提交、还原 `package.json` 版本，保留其它改动
- 若 release 提交上又叠了新提交：把这些新提交 replay 到 release 提交的父提交上
- 若该版本 tag 已在远端存在：拒绝 abort（不能回退已发布的历史）

### 发布后验证

1. 查看 GitHub Actions 状态：
   https://github.com/yqwd-dimleap/canvas-contracts/actions

2. 验证包已发布：
   https://github.com/orgs/yqwd-dimleap/packages

3. 在依赖项目中更新版本：
   ```bash
   bun add @yqwd-dimleap/canvas-contracts@X.Y.Z
   ```

### 最佳实践

- **发布前**：确保所有功能已开发完成、测试通过
- **版本号**：严格遵循 semver 规范
- **CHANGELOG**：默认不是必填；面向用户的重要变更或破坏性变更再用 `--with-changelog` 记录
- **破坏性变更**：建议在 CHANGELOG 中添加 Migration Guide
- **频率**：小改动可以积累后一起发布，重要功能立即发布

### 故障排除

**问题：工作目录不干净**
```bash
# 查看未提交的文件
git status

# 提交或暂存改动
git add .
git commit -m "fix: ..."

# 或者暂存改动
git stash
```

**问题：检查失败**
```bash
# 手动运行检查看详细错误
bun run check

# 修复后重新运行发布脚本
./scripts/release.sh
```

**问题：发布 Action 失败，重新运行默认脚本会想 bump 到下一个版本**
```bash
# 不要重新选择 patch/minor/major
./scripts/release.sh retry-publish
```

脚本会复用当前 `package.json` 中的版本，例如 `2.0.0` 对应 `v2.0.0`，
并重新触发同一个 tag 的发布流程。

**问题：推送失败**
```bash
# 检查远程仓库连接
git remote -v

# 检查是否有权限
git push origin main --dry-run

# 如果需要，重新配置认证
```
