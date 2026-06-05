#!/usr/bin/env bash
# Release automation script for canvas-contracts
# Usage: ./scripts/release.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Canvas Contracts Release Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查是否在 git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}Error: Not in a git repository${NC}"
  exit 1
fi

# 检查是否在 main 分支
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo -e "${YELLOW}Warning: You are on branch '${CURRENT_BRANCH}', not 'main'${NC}"
  read -p "Continue anyway? [y/N]: " continue_branch
  if [[ ! "$continue_branch" =~ ^[Yy]$ ]]; then
    echo "Release cancelled."
    exit 0
  fi
fi

# 检查是否有未提交的改动
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}Error: Working directory is not clean.${NC}"
  echo "Please commit or stash your changes first:"
  git status -s
  exit 1
fi

# 确保代码是最新的
echo -e "${GREEN}Fetching latest changes...${NC}"
git fetch origin

BEHIND=$(git rev-list --count HEAD..origin/${CURRENT_BRANCH} 2>/dev/null || echo "0")
if [[ "$BEHIND" != "0" ]]; then
  echo -e "${YELLOW}Warning: Your branch is ${BEHIND} commits behind origin/${CURRENT_BRANCH}${NC}"
  read -p "Pull latest changes? [Y/n]: " pull_confirm
  if [[ ! "$pull_confirm" =~ ^[Nn]$ ]]; then
    git pull origin ${CURRENT_BRANCH}
  fi
fi

# 获取当前版本
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is required but not installed${NC}"
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo ""
echo -e "${GREEN}Current version: ${CURRENT_VERSION}${NC}"

# 询问新版本类型
echo ""
echo "Select version bump type:"
echo "  ${GREEN}1)${NC} patch   - Bug fixes, docs, non-behavioral changes (${CURRENT_VERSION} → X.X.$(echo $CURRENT_VERSION | cut -d. -f3 | awk '{print $1+1}'))"
echo "  ${GREEN}2)${NC} minor   - New features, backward compatible (${CURRENT_VERSION} → X.$(echo $CURRENT_VERSION | cut -d. -f2 | awk '{print $1+1}').0)"
echo "  ${GREEN}3)${NC} major   - Breaking changes (${CURRENT_VERSION} → $(echo $CURRENT_VERSION | cut -d. -f1 | awk '{print $1+1}').0.0)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
  1) BUMP_TYPE="patch" ;;
  2) BUMP_TYPE="minor" ;;
  3) BUMP_TYPE="major" ;;
  *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
esac

# 计算新版本号
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $BUMP_TYPE in
  patch) PATCH=$((PATCH + 1)) ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo ""
echo -e "${GREEN}New version will be: ${YELLOW}v${NEW_VERSION}${NC}"

# 获取上一个 tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -z "$LAST_TAG" ]]; then
  LAST_TAG=$(git rev-list --max-parents=0 HEAD)
  echo -e "${YELLOW}No previous tag found, showing all commits${NC}"
else
  echo -e "${GREEN}Changes since ${LAST_TAG}:${NC}"
fi

# 显示自上次发布以来的 commits
echo ""
git log ${LAST_TAG}..HEAD --oneline --pretty=format:"  ${YELLOW}%h${NC} %s" | head -20
COMMIT_COUNT=$(git rev-list --count ${LAST_TAG}..HEAD)
if [[ "$COMMIT_COUNT" -gt 20 ]]; then
  echo ""
  echo -e "  ${YELLOW}... and $((COMMIT_COUNT - 20)) more commits${NC}"
fi
echo ""
echo ""

# 确认发布
read -p "Proceed with release v${NEW_VERSION}? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Release cancelled."
  exit 0
fi

# 更新 package.json 版本
echo ""
echo -e "${GREEN}Updating package.json version to ${NEW_VERSION}...${NC}"
if command -v bun &> /dev/null; then
  # 使用 sed 直接更新，避免 bun/npm version 的副作用
  sed -i.bak "s/\"version\": \".*\"/\"version\": \"${NEW_VERSION}\"/" package.json
  rm package.json.bak
else
  npm version ${NEW_VERSION} --no-git-tag-version
fi

# 打开编辑器更新 CHANGELOG
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Please update CHANGELOG.md${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "Add a new section for [${NEW_VERSION}] with:"
echo "  - Date: $(date +%Y-%m-%d)"
echo "  - Added/Changed/Fixed/Breaking Changes sections"
echo "  - Migration guide if needed"
echo ""

# 尝试打开编辑器
if [[ -n "$EDITOR" ]]; then
  $EDITOR CHANGELOG.md
elif command -v code &> /dev/null; then
  code --wait CHANGELOG.md
elif command -v vim &> /dev/null; then
  vim CHANGELOG.md
elif command -v nano &> /dev/null; then
  nano CHANGELOG.md
else
  echo -e "${YELLOW}Please open CHANGELOG.md manually and update it${NC}"
fi

echo ""
read -p "CHANGELOG updated? Press Enter to continue..."

# 运行检查
echo ""
echo -e "${GREEN}Running checks (lint + typecheck + build)...${NC}"
if ! bun run check; then
  echo ""
  echo -e "${RED}✗ Checks failed!${NC}"
  echo "Please fix the errors and try again."
  # 恢复 package.json
  git checkout package.json
  exit 1
fi

echo ""
echo -e "${GREEN}✓ All checks passed${NC}"

echo ""
echo -e "${GREEN}Verifying package tarball contents...${NC}"
if ! bun run pack:verify; then
  echo ""
  echo -e "${RED}✗ Package verification failed!${NC}"
  echo "Please fix the package exports or build output and try again."
  git checkout package.json
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Package contents verified${NC}"

# 提交版本变更
echo ""
echo -e "${GREEN}Committing version bump and changelog...${NC}"
git add package.json CHANGELOG.md
git commit -m "chore(release): v${NEW_VERSION}"

# 创建 annotated tag
echo -e "${GREEN}Creating annotated tag v${NEW_VERSION}...${NC}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}

See CHANGELOG.md for details."

# 显示即将推送的内容
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Ready to publish${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "This will:"
echo "  1. Push commit to origin/${CURRENT_BRANCH}"
echo "  2. Push tag v${NEW_VERSION}"
echo "  3. Trigger GitHub Actions to publish to GitHub Packages"
echo ""
read -p "Push and publish? [y/N]: " push_confirm

if [[ "$push_confirm" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${GREEN}Pushing to origin...${NC}"
  git push origin ${CURRENT_BRANCH}
  git push origin "v${NEW_VERSION}"

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ Successfully released v${NEW_VERSION}${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Next steps:"
  echo "  • Monitor GitHub Actions: ${BLUE}https://github.com/yqwd-dimleap/canvas-contracts/actions${NC}"
  echo "  • Verify package published: ${BLUE}https://github.com/orgs/yqwd-dimleap/packages${NC}"
  echo "  • Update dependent projects to v${NEW_VERSION}"
  echo ""
else
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Release prepared but not pushed${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "The commit and tag have been created locally."
  echo "To push manually later:"
  echo ""
  echo "  git push origin ${CURRENT_BRANCH}"
  echo "  git push origin v${NEW_VERSION}"
  echo ""
  echo "To undo this release:"
  echo ""
  echo "  git tag -d v${NEW_VERSION}"
  echo "  git reset --hard HEAD~1"
  echo ""
fi
