#!/usr/bin/env bash
# Release automation script for canvas-contracts
# Usage:
#   ./scripts/release.sh [prepare] [--with-changelog]
#   ./scripts/release.sh publish
#   ./scripts/release.sh retry-publish

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMMAND="prepare"
COMMAND_SET=0
WITH_CHANGELOG=0

show_usage() {
  echo "Usage:"
  echo "  ./scripts/release.sh [prepare] [--with-changelog]"
  echo "  ./scripts/release.sh publish"
  echo "  ./scripts/release.sh retry-publish"
  echo ""
  echo "Commands:"
  echo "  prepare        Bump version, run checks, commit, and create a local tag (default)"
  echo "  publish        Push the prepared release commit and tag to trigger GitHub Actions"
  echo "  retry-publish  Re-trigger publishing for the current package.json version without bumping"
  echo ""
  echo "Options:"
  echo "  --with-changelog  Open CHANGELOG.md and include it in the release commit"
  echo "  -h, --help        Show this help message"
}

for arg in "$@"; do
  case "$arg" in
    prepare|publish|retry-publish)
      if [[ "$COMMAND_SET" == "1" ]]; then
        echo -e "${RED}Error: Multiple commands provided${NC}"
        show_usage
        exit 1
      fi
      COMMAND="$arg"
      COMMAND_SET=1
      ;;
    --with-changelog)
      WITH_CHANGELOG=1
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option '${arg}'${NC}"
      show_usage
      exit 1
      ;;
  esac
done

if [[ "$COMMAND" != "prepare" && "$WITH_CHANGELOG" == "1" ]]; then
  echo -e "${RED}Error: --with-changelog can only be used with prepare${NC}"
  show_usage
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Canvas Contracts Release Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

require_git_repo() {
  if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not in a git repository${NC}"
    exit 1
  fi
}

require_node() {
  if ! command -v node > /dev/null 2>&1; then
    echo -e "${RED}Error: Node.js is required but not installed${NC}"
    exit 1
  fi
}

current_branch() {
  git branch --show-current
}

require_branch() {
  local branch
  branch=$(current_branch)
  if [[ -z "$branch" ]]; then
    echo -e "${RED}Error: Detached HEAD is not supported for releases${NC}"
    exit 1
  fi
  echo "$branch"
}

confirm_main_branch() {
  local branch="$1"
  if [[ "$branch" != "main" ]]; then
    echo -e "${YELLOW}Warning: You are on branch '${branch}', not 'main'${NC}"
    read -p "Continue anyway? [y/N]: " continue_branch
    if [[ ! "$continue_branch" =~ ^[Yy]$ ]]; then
      echo "Release cancelled."
      exit 0
    fi
  fi
}

ensure_clean_worktree() {
  if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: Working directory is not clean.${NC}"
    echo "Please commit or stash your changes first:"
    git status -s
    exit 1
  fi
}

fetch_origin() {
  echo -e "${GREEN}Fetching latest changes and tags...${NC}"
  git fetch origin --tags
}

origin_branch_exists() {
  local branch="$1"
  git rev-parse --verify "origin/${branch}" > /dev/null 2>&1
}

maybe_pull_latest() {
  local branch="$1"

  if ! origin_branch_exists "$branch"; then
    echo -e "${YELLOW}Warning: origin/${branch} does not exist; skipping behind check${NC}"
    return
  fi

  local behind
  behind=$(git rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "0")
  if [[ "$behind" != "0" ]]; then
    echo -e "${YELLOW}Warning: Your branch is ${behind} commits behind origin/${branch}${NC}"
    read -p "Pull latest changes? [Y/n]: " pull_confirm
    if [[ ! "$pull_confirm" =~ ^[Nn]$ ]]; then
      git pull origin "$branch"
    fi
  fi
}

current_version() {
  node -p "require('./package.json').version"
}

release_tag_for_version() {
  local version="$1"
  echo "v${version}"
}

local_tag_target() {
  local tag="$1"
  git rev-list -n 1 "$tag" 2>/dev/null || true
}

remote_tag_target() {
  local tag="$1"
  local peeled
  local direct

  peeled=$(git ls-remote origin "refs/tags/${tag}^{}" | awk '{print $1}')
  if [[ -n "$peeled" ]]; then
    echo "$peeled"
    return
  fi

  direct=$(git ls-remote origin "refs/tags/${tag}" | awk '{print $1}')
  echo "$direct"
}

tag_points_to_head() {
  local target="$1"
  local head
  head=$(git rev-parse HEAD)
  [[ -n "$target" && "$target" == "$head" ]]
}

assert_valid_semver() {
  local version="$1"
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: package.json version '${version}' is not a plain semver X.Y.Z version${NC}"
    exit 1
  fi
}

print_commit_history_since_last_tag() {
  local last_tag
  local commit_count

  last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [[ -z "$last_tag" ]]; then
    last_tag=$(git rev-list --max-parents=0 HEAD)
    echo -e "${YELLOW}No previous tag found, showing all commits${NC}"
  else
    echo -e "${GREEN}Changes since ${last_tag}:${NC}"
  fi

  echo ""
  git log -20 "${last_tag}..HEAD" --oneline --pretty=format:"  ${YELLOW}%h${NC} %s"
  commit_count=$(git rev-list --count "${last_tag}..HEAD")
  if [[ "$commit_count" -gt 20 ]]; then
    echo ""
    echo -e "  ${YELLOW}... and $((commit_count - 20)) more commits${NC}"
  fi
  echo ""
  echo ""
}

detect_prepared_current_release() {
  local version="$1"
  local tag
  local local_target
  local remote_target

  tag=$(release_tag_for_version "$version")
  local_target=$(local_tag_target "$tag")
  remote_target=$(remote_tag_target "$tag")

  if tag_points_to_head "$local_target" || tag_points_to_head "$remote_target"; then
    echo ""
    echo -e "${YELLOW}Current HEAD is already prepared as ${tag}.${NC}"
    echo "No version bump was performed."
    echo ""
    if [[ -n "$remote_target" ]]; then
      echo "The tag already exists on origin. If the publish Action failed, use:"
      echo ""
      echo "  ./scripts/release.sh retry-publish"
    else
      echo "The tag exists locally but has not been pushed. To trigger publishing, use:"
      echo ""
      echo "  ./scripts/release.sh publish"
    fi
    echo ""
    exit 0
  fi
}

ensure_prepared_release() {
  local version="$1"
  local tag
  local local_target
  local head

  tag=$(release_tag_for_version "$version")
  local_target=$(local_tag_target "$tag")
  head=$(git rev-parse HEAD)

  if [[ -z "$local_target" ]]; then
    echo -e "${RED}Error: Local tag ${tag} does not exist.${NC}"
    echo "Run './scripts/release.sh prepare' first, or fetch tags if another machine prepared the release."
    exit 1
  fi

  if [[ "$local_target" != "$head" ]]; then
    echo -e "${RED}Error: Local tag ${tag} points to ${local_target}, not current HEAD ${head}.${NC}"
    echo "Checkout the release commit before publishing, or fix the tag manually."
    exit 1
  fi
}

warn_if_branch_behind_for_publish() {
  local branch="$1"

  if ! origin_branch_exists "$branch"; then
    return
  fi

  local behind
  behind=$(git rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "0")
  if [[ "$behind" != "0" ]]; then
    echo -e "${RED}Error: Your branch is ${behind} commits behind origin/${branch}.${NC}"
    echo "Resolve that first before publishing this release commit."
    exit 1
  fi
}

print_publish_success() {
  local version="$1"

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ Publish triggered for v${version}${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Next steps:"
  echo "  • Monitor GitHub Actions: ${BLUE}https://github.com/yqwd-dimleap/canvas-contracts/actions${NC}"
  echo "  • Verify package published: ${BLUE}https://github.com/orgs/yqwd-dimleap/packages${NC}"
  echo "  • Update dependent projects to v${version}"
  echo ""
}

prepare_release() {
  local branch
  local current
  local major
  local minor
  local patch
  local bump_type
  local choice
  local new_version
  local tag

  branch=$(require_branch)
  confirm_main_branch "$branch"
  ensure_clean_worktree
  fetch_origin
  maybe_pull_latest "$branch"
  require_node

  current=$(current_version)
  assert_valid_semver "$current"
  detect_prepared_current_release "$current"

  echo ""
  echo -e "${GREEN}Current version: ${current}${NC}"

  IFS='.' read -r major minor patch <<< "$current"

  echo ""
  echo "Select version bump type:"
  echo "  ${GREEN}1)${NC} patch   - Bug fixes, docs, non-behavioral changes (${current} → ${major}.${minor}.$((patch + 1)))"
  echo "  ${GREEN}2)${NC} minor   - New features, backward compatible (${current} → ${major}.$((minor + 1)).0)"
  echo "  ${GREEN}3)${NC} major   - Breaking changes (${current} → $((major + 1)).0.0)"
  echo ""
  read -p "Enter choice [1-3]: " choice

  case "$choice" in
    1) bump_type="patch" ;;
    2) bump_type="minor" ;;
    3) bump_type="major" ;;
    *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
  esac

  case "$bump_type" in
    patch) patch=$((patch + 1)) ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    major) major=$((major + 1)); minor=0; patch=0 ;;
  esac

  new_version="${major}.${minor}.${patch}"
  tag=$(release_tag_for_version "$new_version")

  echo ""
  echo -e "${GREEN}New version will be: ${YELLOW}${tag}${NC}"

  if [[ -n $(local_tag_target "$tag") || -n $(remote_tag_target "$tag") ]]; then
    echo -e "${RED}Error: Tag ${tag} already exists locally or on origin.${NC}"
    echo "Choose a different version or resolve the existing tag first."
    exit 1
  fi

  print_commit_history_since_last_tag

  read -p "Proceed with release ${tag}? [y/N]: " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Release cancelled."
    exit 0
  fi

  echo ""
  echo -e "${GREEN}Updating package.json version to ${new_version}...${NC}"
  if command -v bun > /dev/null 2>&1; then
    # 使用 sed 直接更新，避免 bun/npm version 的副作用
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"${new_version}\"/" package.json
    rm package.json.bak
  else
    npm version "$new_version" --no-git-tag-version
  fi

  if [[ "$WITH_CHANGELOG" == "1" ]]; then
    # 按需打开编辑器更新 CHANGELOG，默认发布流程不再强制写文档。
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  Update CHANGELOG.md${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
    echo ""
    echo "Add a new section for [${new_version}] with:"
    echo "  - Date: $(date +%Y-%m-%d)"
    echo "  - Added/Changed/Fixed/Breaking Changes sections"
    echo "  - Migration guide if needed"
    echo ""

    if [[ -n "${EDITOR:-}" ]]; then
      $EDITOR CHANGELOG.md
    elif command -v code > /dev/null 2>&1; then
      code --wait CHANGELOG.md
    elif command -v vim > /dev/null 2>&1; then
      vim CHANGELOG.md
    elif command -v nano > /dev/null 2>&1; then
      nano CHANGELOG.md
    else
      echo -e "${YELLOW}Please open CHANGELOG.md manually and update it${NC}"
    fi

    echo ""
    read -p "CHANGELOG updated? Press Enter to continue..."
  else
    echo ""
    echo -e "${GREEN}Skipping CHANGELOG.md update. Use --with-changelog to include release notes.${NC}"
  fi

  echo ""
  echo -e "${GREEN}Running checks (lint + typecheck + build)...${NC}"
  if ! bun run check; then
    echo ""
    echo -e "${RED}✗ Checks failed!${NC}"
    echo "Please fix the errors and try again."
    git checkout -- package.json
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
    git checkout -- package.json
    exit 1
  fi

  echo ""
  echo -e "${GREEN}✓ Package contents verified${NC}"

  echo ""
  echo -e "${GREEN}Committing version bump...${NC}"
  local release_files=(package.json)
  if [[ "$WITH_CHANGELOG" == "1" ]]; then
    release_files+=(CHANGELOG.md)
  fi
  git add "${release_files[@]}"
  git commit -m "chore(release): ${tag}"

  echo -e "${GREEN}Creating annotated tag ${tag}...${NC}"
  git tag -a "$tag" -m "Release ${tag}"

  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Release prepared${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo ""
  echo "The release commit and tag were created locally."
  echo "No remote publish was triggered."
  echo ""
  echo "To publish:"
  echo ""
  echo "  ./scripts/release.sh publish"
  echo ""
  echo "If GitHub Actions publishing fails after the tag is pushed:"
  echo ""
  echo "  ./scripts/release.sh retry-publish"
  echo ""
}

publish_release() {
  local branch
  local version
  local tag
  local remote_target
  local head

  branch=$(require_branch)
  confirm_main_branch "$branch"
  ensure_clean_worktree
  fetch_origin
  warn_if_branch_behind_for_publish "$branch"
  require_node

  version=$(current_version)
  assert_valid_semver "$version"
  tag=$(release_tag_for_version "$version")
  ensure_prepared_release "$version"

  remote_target=$(remote_tag_target "$tag")
  head=$(git rev-parse HEAD)
  if [[ -n "$remote_target" ]]; then
    if [[ "$remote_target" == "$head" ]]; then
      echo -e "${RED}Error: ${tag} already exists on origin and points to current HEAD.${NC}"
      echo "A normal push will not trigger GitHub Actions again."
      echo "Use './scripts/release.sh retry-publish' if the publish Action failed."
      exit 1
    fi

    echo -e "${RED}Error: ${tag} already exists on origin but points to ${remote_target}.${NC}"
    echo "Refusing to publish a different commit under the same version."
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Ready to publish ${tag}${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo ""
  echo "This will:"
  echo "  1. Push current HEAD to origin/${branch}"
  echo "  2. Push tag ${tag}"
  echo "  3. Trigger GitHub Actions to publish to GitHub Packages"
  echo ""
  read -p "Push and publish? [y/N]: " push_confirm

  if [[ ! "$push_confirm" =~ ^[Yy]$ ]]; then
    echo "Publish cancelled."
    exit 0
  fi

  echo ""
  echo -e "${GREEN}Pushing release commit to origin/${branch}...${NC}"
  git push origin "$branch"

  echo -e "${GREEN}Pushing ${tag} to trigger publish...${NC}"
  git push origin "$tag"

  print_publish_success "$version"
}

retry_publish() {
  local branch
  local version
  local tag
  local remote_target
  local head

  branch=$(require_branch)
  confirm_main_branch "$branch"
  ensure_clean_worktree
  fetch_origin
  warn_if_branch_behind_for_publish "$branch"
  require_node

  version=$(current_version)
  assert_valid_semver "$version"
  tag=$(release_tag_for_version "$version")
  ensure_prepared_release "$version"

  remote_target=$(remote_tag_target "$tag")
  head=$(git rev-parse HEAD)

  if [[ -z "$remote_target" ]]; then
    echo -e "${YELLOW}${tag} does not exist on origin yet.${NC}"
    echo "This will use the normal publish flow and push the prepared tag."
    echo ""
    read -p "Push and publish ${tag}? [y/N]: " publish_confirm

    if [[ ! "$publish_confirm" =~ ^[Yy]$ ]]; then
      echo "Publish cancelled."
      exit 0
    fi

    echo ""
    echo -e "${GREEN}Pushing release commit to origin/${branch}...${NC}"
    git push origin "$branch"
    echo -e "${GREEN}Pushing ${tag} to trigger publish...${NC}"
    git push origin "$tag"
    print_publish_success "$version"
    return
  fi

  if [[ "$remote_target" != "$head" ]]; then
    echo -e "${RED}Error: Origin tag ${tag} points to ${remote_target}, not current HEAD ${head}.${NC}"
    echo "Refusing to retry publishing a mismatched version tag."
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Retry publish ${tag}${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo ""
  echo "This will not bump the version or create a new commit."
  echo "It will push origin/${branch}, then delete and recreate origin tag ${tag}"
  echo "at the same commit to trigger GitHub Actions again."
  echo ""
  read -p "Re-trigger publish for ${tag}? [y/N]: " retry_confirm

  if [[ ! "$retry_confirm" =~ ^[Yy]$ ]]; then
    echo "Retry cancelled."
    exit 0
  fi

  echo ""
  echo -e "${GREEN}Pushing release commit to origin/${branch}...${NC}"
  git push origin "$branch"

  echo -e "${GREEN}Recreating origin tag ${tag} at current HEAD...${NC}"
  git push origin ":refs/tags/${tag}"
  git push origin "$tag"

  print_publish_success "$version"
}

require_git_repo

case "$COMMAND" in
  prepare)
    prepare_release
    ;;
  publish)
    publish_release
    ;;
  retry-publish)
    retry_publish
    ;;
  *)
    echo -e "${RED}Error: Unknown command '${COMMAND}'${NC}"
    show_usage
    exit 1
    ;;
esac
