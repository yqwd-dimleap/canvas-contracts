# Scripts

## release.sh

自动化发布脚本，用于规范版本发布流程。

### 功能

- ✅ 自动检查工作目录状态（未提交的文件会阻止发布）
- ✅ 自动计算新版本号（patch/minor/major）
- ✅ 显示自上次发布以来的 commit 历史
- ✅ 自动更新 `package.json` 版本号
- ✅ 提示更新 `CHANGELOG.md`（自动打开编辑器）
- ✅ 运行完整检查（lint + typecheck + build）
- ✅ 创建版本提交和 annotated tag
- ✅ 推送到远程仓库触发 GitHub Actions 发布

### 使用方法

```bash
# 在项目根目录运行
./scripts/release.sh
```

### 发布流程

1. **检查环境**
   - 确保在 git 仓库中
   - 检查是否在 `main` 分支
   - 检查工作目录是否干净
   - 拉取最新代码

2. **选择版本类型**
   - `patch` (0.6.0 → 0.6.1): bug 修复、文档更新、非功能性改动
   - `minor` (0.6.0 → 0.7.0): 新功能、向后兼容的改动
   - `major` (0.6.0 → 1.0.0): 破坏性变更

3. **查看变更历史**
   - 显示自上次 tag 以来的所有 commits
   - 帮助你确认版本类型是否正确

4. **更新文件**
   - 自动更新 `package.json` 中的版本号
   - 打开编辑器让你更新 `CHANGELOG.md`
   - 提示添加日期和变更内容

5. **运行检查**
   - 执行 `bun run check`（lint + typecheck + build）
   - 如果失败会自动回滚 `package.json` 的修改

6. **创建 commit 和 tag**
   - 提交格式：`chore(release): vX.Y.Z`
   - 创建 annotated tag：`vX.Y.Z`

7. **推送并发布**
   - 推送 commit 到 `origin/main`
   - 推送 tag 触发 GitHub Actions
   - GitHub Actions 自动发布到 GitHub Packages

### 如果中途想取消

在最后推送前取消（选择 N），可以手动撤销：

```bash
# 删除本地 tag
git tag -d vX.Y.Z

# 回滚到上一个 commit
git reset --hard HEAD~1
```

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
- **CHANGELOG**：详细记录所有用户可见的变更
- **破坏性变更**：在 CHANGELOG 中添加 Migration Guide
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

**问题：推送失败**
```bash
# 检查远程仓库连接
git remote -v

# 检查是否有权限
git push origin main --dry-run

# 如果需要，重新配置认证
```
