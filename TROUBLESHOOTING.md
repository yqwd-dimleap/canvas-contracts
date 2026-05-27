# Canvas Contracts 发布问题排查

## 问题：401 Unauthorized

### 当前状态
- ✅ Token 有效（可以访问 GitHub API）
- ✅ 用户是组织成员（active）
- ✅ Dry-run 成功
- ❌ 实际发布失败：401 Unauthorized

### 可能原因

#### 1. Token 缺少 `write:packages` 权限

**检查方法**：
```bash
# 访问 https://github.com/settings/tokens
# 找到你的 token，检查是否勾选了：
# ✅ write:packages
# ✅ read:packages
# ✅ repo (如果是私有仓库)
```

**解决方案**：
1. 访问 https://github.com/settings/tokens
2. 点击你的 token
3. 勾选 `write:packages` 权限
4. 点击 "Update token"
5. 更新 `.env.local` 中的 token

#### 2. Token 过期

**检查方法**：
```bash
source .env.local && curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

如果返回 401，说明 token 已过期。

**解决方案**：
1. 重新生成 token
2. 更新 `.env.local`

#### 3. 组织权限设置

**检查方法**：
访问 https://github.com/orgs/yqwd-dimleap/settings/packages

**解决方案**：
1. 确保组织允许成员发布包
2. 确保你的账号有发布权限

### 推荐方案：使用 GitHub Actions

由于本地发布需要配置复杂的权限，建议使用 GitHub Actions 自动发布。

#### 优势
- ✅ 使用 GitHub 内置的 `GITHUB_TOKEN`
- ✅ 自动拥有正确的权限
- ✅ 无需本地配置
- ✅ 更安全

#### 实施步骤

1. **创建 GitHub Actions 工作流**

```yaml
# .github/workflows/publish.yml
name: Publish Package

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run checks
        run: bun run check
      
      - name: Setup .npmrc
        run: |
          echo "@yqwd-dimleap:registry=https://npm.pkg.github.com" > .npmrc
          echo "//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}" >> .npmrc
      
      - name: Publish to GitHub Packages
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

2. **推送代码并打 tag**

```bash
# 提交当前更改
git add .
git commit -m "chore: setup GitHub Actions for publishing"
git push origin feat/add-rag-generation-contracts

# 合并到 main
git checkout main
git merge feat/add-rag-generation-contracts
git push origin main

# 打 tag（触发自动发布）
git tag v0.2.0
git push origin v0.2.0
```

3. **查看发布结果**

访问：https://github.com/yqwd-dimleap/canvas-contracts/actions

### 临时解决方案：重新生成 Token

如果你想继续本地发布：

1. **访问** https://github.com/settings/tokens/new
2. **设置**：
   - Note: `canvas-contracts-publish`
   - Expiration: `90 days`
   - 勾选权限：
     - ✅ `repo` (Full control of private repositories)
     - ✅ `write:packages` (Upload packages to GitHub Package Registry)
     - ✅ `read:packages` (Download packages from GitHub Package Registry)
3. **生成并复制** token
4. **更新** `.env.local`:
   ```bash
   GITHUB_TOKEN=ghp_新的token
   ```
5. **重新发布**:
   ```bash
   source .env.local && export NODE_AUTH_TOKEN=$GITHUB_TOKEN && npm publish
   ```

## 下一步

你想：
1. **使用 GitHub Actions 自动发布**（推荐）✅
2. **重新生成 token 并本地发布**
3. **检查现有 token 的权限**

我建议选择方案 1，更安全、更方便。
