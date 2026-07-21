#!/usr/bin/env bash
# Release automation script for canvas-contracts
#
# Two-phase, recoverable release flow:
#   ./scripts/release.sh [prepare] [--with-changelog]   # bump version + commit (NO tag yet)
#   ./scripts/release.sh publish                        # tag current HEAD + push -> triggers Actions
#   ./scripts/release.sh retry-publish                  # re-trigger publish for the current version
#   ./scripts/release.sh status                         # show where the release currently stands
#   ./scripts/release.sh abort                          # safely undo a local, unpushed prepared release
#
# Design notes:
#   - The git tag is created at PUBLISH time against the current HEAD, never at prepare time.
#     This removes the classic dead-end where a tag baked in during prepare points at a stale
#     commit after more work lands on top.
#   - `prepare` detects an already-prepared / stuck release instead of blindly bumping again.
#   - `abort` gives a supported way back out of a prepared-but-unpushed release, preserving any
#     unrelated working-tree changes.

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
  echo "  ./scripts/release.sh status"
  echo "  ./scripts/release.sh abort"
  echo ""
  echo "Commands:"
  echo "  prepare        Bump version, run checks, and create a local release commit (default)"
  echo "  publish        Tag current HEAD and push to trigger GitHub Actions publishing"
  echo "  retry-publish  Re-trigger publishing for the current package.json version without bumping"
  echo "  status         Print the current release state and the recommended next step"
  echo "  abort          Undo a local, unpushed prepared release (keeps unrelated changes)"
  echo ""
  echo "Options:"
  echo "  --with-changelog  Open CHANGELOG.md and include it in the release commit (prepare only)"
  echo "  -h, --help        Show this help message"
}

for arg in "$@"; do
  case "$arg" in
    prepare|publish|retry-publish|status|abort)
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

# ───────────────────────────── generic guards ─────────────────────────────

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

worktree_dirty() {
  [[ -n $(git status --porcelain) ]]
}

ensure_clean_worktree() {
  if worktree_dirty; then
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

fetch_origin_soft() {
  echo -e "${GREEN}Fetching latest changes and tags...${NC}"
  if ! git fetch origin --tags 2>/dev/null; then
    echo -e "${YELLOW}Warning: could not reach origin; showing local state only${NC}"
  fi
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

# ───────────────────────────── version / tag helpers ─────────────────────────────

current_version() {
  node -p "require('./package.json').version"
}

release_tag_for_version() {
  local version="$1"
  echo "v${version}"
}

release_commit_subject() {
  local version="$1"
  echo "chore(release): v${version}"
}

local_tag_target() {
  local tag="$1"
  git rev-list -n 1 "$tag" 2>/dev/null || true
}

remote_tag_target() {
  local tag="$1"
  local peeled
  local direct

  peeled=$(git ls-remote origin "refs/tags/${tag}^{}" 2>/dev/null | awk '{print $1}')
  if [[ -n "$peeled" ]]; then
    echo "$peeled"
    return
  fi

  direct=$(git ls-remote origin "refs/tags/${tag}" 2>/dev/null | awk '{print $1}')
  echo "$direct"
}

assert_valid_semver() {
  local version="$1"
  if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: package.json version '${version}' is not a plain semver X.Y.Z version${NC}"
    exit 1
  fi
}

# Subject of HEAD equals the release marker for the given version.
head_is_release_commit() {
  local version="$1"
  [[ "$(git log -1 --format='%s' 2>/dev/null)" == "$(release_commit_subject "$version")" ]]
}

# First commit (from HEAD downward) whose subject is the release marker for the version.
find_release_commit() {
  local version="$1"
  git log --format='%H|%s' 2>/dev/null \
    | awk -F'|' -v s="$(release_commit_subject "$version")" '$2==s{print $1; exit}' || true
}

commit_is_pushed() {
  local sha="$1"
  local branch="$2"
  origin_branch_exists "$branch" || return 1
  git merge-base --is-ancestor "$sha" "origin/${branch}" 2>/dev/null
}

# Classify the current release situation for `status` and the self-heal logic in `prepare`.
# Echoes one of: PUBLISHED | PREPARED_CLEAN | PREPARED_DIRTY | STACKED | FRESH
release_state() {
  local version tag remote_tag rel_sha
  version=$(current_version)
  tag=$(release_tag_for_version "$version")
  remote_tag=$(remote_tag_target "$tag")

  if [[ -n "$remote_tag" ]]; then
    echo "PUBLISHED"
    return
  fi

  if head_is_release_commit "$version"; then
    if worktree_dirty; then
      echo "PREPARED_DIRTY"
    else
      echo "PREPARED_CLEAN"
    fi
    return
  fi

  rel_sha=$(find_release_commit "$version")
  if [[ -n "$rel_sha" ]]; then
    echo "STACKED"
    return
  fi

  echo "FRESH"
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

# ───────────────────────────── status ─────────────────────────────

show_status() {
  local branch version tag local_tag remote_tag state
  local ahead="0" behind="0"

  require_node
  branch=$(current_branch)
  [[ -z "$branch" ]] && branch="(detached HEAD)"
  fetch_origin_soft

  version=$(current_version)
  tag=$(release_tag_for_version "$version")
  local_tag=$(local_tag_target "$tag")
  remote_tag=$(remote_tag_target "$tag")
  state=$(release_state)

  if origin_branch_exists "$branch"; then
    ahead=$(git rev-list --count "origin/${branch}..HEAD" 2>/dev/null || echo "0")
    behind=$(git rev-list --count "HEAD..origin/${branch}" 2>/dev/null || echo "0")
  fi

  echo -e "${BLUE}Release status${NC}"
  echo -e "  Branch          : ${branch}"
  echo -e "  package.json    : ${version}  (tag ${tag})"
  if worktree_dirty; then
    echo -e "  Working tree    : ${YELLOW}dirty (uncommitted changes)${NC}"
  else
    echo -e "  Working tree    : ${GREEN}clean${NC}"
  fi
  echo -e "  vs origin       : ${ahead} ahead, ${behind} behind"
  if [[ -n "$local_tag" ]]; then
    echo -e "  Local tag ${tag} : ${local_tag:0:9}"
  else
    echo -e "  Local tag ${tag} : (none)"
  fi
  if [[ -n "$remote_tag" ]]; then
    echo -e "  Origin tag ${tag}: ${remote_tag:0:9}"
  else
    echo -e "  Origin tag ${tag}: (none)"
  fi
  echo ""

  case "$state" in
    PUBLISHED)
      echo -e "${GREEN}State: v${version} is already published on origin.${NC}"
      echo "Next: run './scripts/release.sh prepare' to start the next version."
      ;;
    PREPARED_CLEAN)
      echo -e "${YELLOW}State: v${version} is prepared locally but not published.${NC}"
      echo "Next: './scripts/release.sh publish'  (or 'abort' to undo the bump)."
      ;;
    PREPARED_DIRTY)
      echo -e "${YELLOW}State: v${version} is prepared, but you have new uncommitted changes.${NC}"
      echo "Pick one:"
      echo "  • './scripts/release.sh abort'   → undo the bump, fold these changes into the next release"
      echo "  • commit/stash the changes, then './scripts/release.sh publish' to ship v${version} as-is"
      ;;
    STACKED)
      echo -e "${YELLOW}State: v${version} was bumped, but new commits landed on top of its release commit.${NC}"
      echo "The release commit is buried and cannot be published cleanly."
      echo "Next: './scripts/release.sh abort'  (rewinds the version bump, keeps the commits on top)."
      ;;
    FRESH)
      echo -e "${GREEN}State: no pending release. package.json is v${version}.${NC}"
      echo "Next: './scripts/release.sh prepare' to bump and prepare a release."
      ;;
  esac
  echo ""
}

# ───────────────────────────── prepare ─────────────────────────────

prepare_release() {
  local branch
  local current
  local state
  local major minor patch
  local bump_type choice new_version new_tag

  branch=$(require_branch)
  confirm_main_branch "$branch"
  require_node
  fetch_origin

  current=$(current_version)
  assert_valid_semver "$current"

  # Self-heal: detect an already-prepared / stuck release before touching anything.
  state=$(release_state)
  case "$state" in
    PREPARED_CLEAN)
      echo -e "${YELLOW}v${current} is already prepared locally and not yet published.${NC}"
      echo "No version bump was performed."
      echo ""
      echo "To ship it:      ./scripts/release.sh publish"
      echo "To undo it:      ./scripts/release.sh abort"
      exit 0
      ;;
    PREPARED_DIRTY)
      echo -e "${YELLOW}v${current} is already prepared, but the working tree has new changes.${NC}"
      echo "Preparing again would double-bump. Choose one instead:"
      echo ""
      echo "  • ./scripts/release.sh abort   → rewind the bump, then re-run prepare to fold everything in"
      echo "  • commit/stash the changes, then ./scripts/release.sh publish to ship v${current} as-is"
      exit 1
      ;;
    STACKED)
      echo -e "${YELLOW}v${current} was bumped, but commits landed on top of its release commit.${NC}"
      echo "Run './scripts/release.sh abort' first (it keeps the commits on top), then prepare again."
      exit 1
      ;;
    PUBLISHED|FRESH)
      : # normal path — proceed to bump
      ;;
  esac

  ensure_clean_worktree
  maybe_pull_latest "$branch"

  # current version may have changed after a pull.
  current=$(current_version)
  assert_valid_semver "$current"

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
  new_tag=$(release_tag_for_version "$new_version")

  echo ""
  echo -e "${GREEN}New version will be: ${YELLOW}${new_tag}${NC}"

  if [[ -n $(local_tag_target "$new_tag") || -n $(remote_tag_target "$new_tag") ]]; then
    echo -e "${RED}Error: Tag ${new_tag} already exists locally or on origin.${NC}"
    echo "That version was already released or half-released. Pick a different bump, or resolve the tag first."
    exit 1
  fi

  print_commit_history_since_last_tag

  read -p "Proceed with release ${new_tag}? [y/N]: " confirm
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
  git commit -m "$(release_commit_subject "$new_version")"

  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Release prepared${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo ""
  echo "The release commit was created locally. No tag was created and nothing was pushed."
  echo "The tag ${new_tag} will be created against this commit when you publish."
  echo ""
  echo "To publish:            ./scripts/release.sh publish"
  echo "Changed your mind:     ./scripts/release.sh abort"
  echo "If Actions fails later: ./scripts/release.sh retry-publish"
  echo ""
}

# ───────────────────────────── publish ─────────────────────────────

# Shared push path: ensure a local tag at HEAD, push branch, then push the tag.
push_release() {
  local branch="$1"
  local version="$2"
  local tag
  local local_tag head
  tag=$(release_tag_for_version "$version")
  head=$(git rev-parse HEAD)
  local_tag=$(local_tag_target "$tag")

  if [[ -n "$local_tag" && "$local_tag" != "$head" ]]; then
    echo -e "${RED}Error: Local tag ${tag} already exists but points to ${local_tag:0:9}, not HEAD.${NC}"
    echo "Remove it ('git tag -d ${tag}') or run './scripts/release.sh abort', then retry."
    exit 1
  fi

  echo ""
  echo -e "${GREEN}Pushing release commit to origin/${branch}...${NC}"
  git push origin "$branch"

  if [[ -z "$local_tag" ]]; then
    echo -e "${GREEN}Creating annotated tag ${tag} at HEAD...${NC}"
    git tag -a "$tag" -m "Release ${tag}"
  fi

  echo -e "${GREEN}Pushing ${tag} to trigger publish...${NC}"
  git push origin "$tag"

  print_publish_success "$version"
}

publish_release() {
  local branch version tag remote_target rel_sha

  branch=$(require_branch)
  confirm_main_branch "$branch"
  ensure_clean_worktree
  fetch_origin
  warn_if_branch_behind_for_publish "$branch"
  require_node

  version=$(current_version)
  assert_valid_semver "$version"
  tag=$(release_tag_for_version "$version")

  remote_target=$(remote_tag_target "$tag")
  if [[ -n "$remote_target" ]]; then
    echo -e "${RED}Error: ${tag} already exists on origin.${NC}"
    echo "That version is already published (or its tag was pushed)."
    echo "  • If the publish Action failed:  ./scripts/release.sh retry-publish"
    echo "  • To ship a new version:         ./scripts/release.sh prepare"
    exit 1
  fi

  if ! head_is_release_commit "$version"; then
    echo -e "${RED}Error: HEAD is not the release commit for v${version}.${NC}"
    rel_sha=$(find_release_commit "$version")
    if [[ -n "$rel_sha" ]]; then
      echo "The v${version} release commit (${rel_sha:0:9}) is buried under later commits."
      echo "Run './scripts/release.sh abort' to rewind the bump, then prepare again."
    else
      echo "Run './scripts/release.sh prepare' first, or check './scripts/release.sh status'."
    fi
    exit 1
  fi

  echo ""
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Ready to publish ${tag}${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
  echo ""
  echo "This will:"
  echo "  1. Push current HEAD to origin/${branch}"
  echo "  2. Create tag ${tag} at HEAD and push it"
  echo "  3. Trigger GitHub Actions to publish to GitHub Packages"
  echo ""
  read -p "Push and publish? [y/N]: " push_confirm
  if [[ ! "$push_confirm" =~ ^[Yy]$ ]]; then
    echo "Publish cancelled."
    exit 0
  fi

  push_release "$branch" "$version"
}

retry_publish() {
  local branch version tag remote_target head

  branch=$(require_branch)
  confirm_main_branch "$branch"
  ensure_clean_worktree
  fetch_origin
  warn_if_branch_behind_for_publish "$branch"
  require_node

  version=$(current_version)
  assert_valid_semver "$version"
  tag=$(release_tag_for_version "$version")

  if ! head_is_release_commit "$version"; then
    echo -e "${RED}Error: HEAD is not the release commit for v${version}.${NC}"
    echo "retry-publish re-triggers the CURRENT prepared version; run './scripts/release.sh status'."
    exit 1
  fi

  remote_target=$(remote_tag_target "$tag")
  head=$(git rev-parse HEAD)

  # Not pushed yet -> this is really a first publish.
  if [[ -z "$remote_target" ]]; then
    echo -e "${YELLOW}${tag} does not exist on origin yet; using the normal publish flow.${NC}"
    echo ""
    read -p "Push and publish ${tag}? [y/N]: " publish_confirm
    if [[ ! "$publish_confirm" =~ ^[Yy]$ ]]; then
      echo "Publish cancelled."
      exit 0
    fi
    push_release "$branch" "$version"
    return
  fi

  if [[ "$remote_target" != "$head" ]]; then
    echo -e "${RED}Error: Origin tag ${tag} points to ${remote_target:0:9}, not current HEAD ${head:0:9}.${NC}"
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
  git tag -f -a "$tag" -m "Release ${tag}" > /dev/null
  git push origin ":refs/tags/${tag}"
  git push origin "$tag"

  print_publish_success "$version"
}

# ───────────────────────────── abort ─────────────────────────────

abort_release() {
  local branch version tag rel_sha head local_tag remote_tag

  branch=$(require_branch)
  require_node
  fetch_origin

  version=$(current_version)
  assert_valid_semver "$version"
  tag=$(release_tag_for_version "$version")

  remote_tag=$(remote_tag_target "$tag")
  if [[ -n "$remote_tag" ]]; then
    echo -e "${RED}Error: ${tag} already exists on origin — v${version} is (being) published.${NC}"
    echo "You cannot abort a published release. To supersede it, prepare a new version instead."
    exit 1
  fi

  rel_sha=$(find_release_commit "$version")
  if [[ -z "$rel_sha" ]]; then
    echo -e "${YELLOW}No local 'chore(release): v${version}' commit found — nothing to abort.${NC}"
    echo "Run './scripts/release.sh status' to see the current state."
    exit 0
  fi

  if commit_is_pushed "$rel_sha" "$branch"; then
    echo -e "${RED}Error: the v${version} release commit is already on origin/${branch}.${NC}"
    echo "Aborting would rewrite pushed history. Prepare a new version instead."
    exit 1
  fi

  head=$(git rev-parse HEAD)
  local_tag=$(local_tag_target "$tag")

  echo -e "${YELLOW}About to abort the prepared release v${version}:${NC}"
  echo "  • release commit : ${rel_sha:0:9}  ($(release_commit_subject "$version"))"
  if [[ "$rel_sha" != "$head" ]]; then
    local stacked
    stacked=$(git rev-list --count "${rel_sha}..HEAD")
    echo "  • ${stacked} commit(s) sit on top of it and will be replayed onto the parent"
  fi
  if [[ -n "$local_tag" ]]; then
    echo "  • local tag ${tag} (${local_tag:0:9}) will be deleted"
  fi
  echo "  • the version bump is undone; every other change is kept, staged or in the worktree"
  echo ""
  read -p "Proceed with abort? [y/N]: " abort_confirm
  if [[ ! "$abort_confirm" =~ ^[Yy]$ ]]; then
    echo "Abort cancelled."
    exit 0
  fi

  # Drop the local tag first so it can never dangle onto the wrong commit.
  if [[ -n "$local_tag" ]]; then
    git tag -d "$tag" > /dev/null
  fi

  if [[ "$rel_sha" == "$head" ]]; then
    # The release commit is HEAD. Un-commit it, then undo ONLY the version bump.
    #
    # IMPORTANT: never run 'git restore --worktree' across the whole commit — a release commit
    # that was amended with real code changes would then have those changes wiped from the
    # working tree (uncommitted edits on those files are unrecoverable). Instead we revert just
    # package.json and merely UNSTAGE everything else, leaving the working tree untouched so no
    # work can be lost.
    git reset --soft "HEAD~1"
    git restore --source=HEAD --staged --worktree -- package.json
    git restore --staged -- . > /dev/null 2>&1 || true
  else
    # Stacked case: drop the release commit from the middle, replaying later commits.
    # Everything from rel_sha up is unpushed (verified above), so this rewrite is local-only,
    # and the dropped commit stays reachable via reflog if you need it back.
    if worktree_dirty; then
      echo -e "${RED}Error: working tree must be clean to rewind commits stacked on the release.${NC}"
      echo "Commit or stash your changes, then run abort again."
      # Re-create the tag we optimistically deleted so state is unchanged on this failure path.
      if [[ -n "$local_tag" ]]; then
        git tag -a "$tag" -m "Release ${tag}" "$local_tag" > /dev/null
      fi
      exit 1
    fi
    if ! git rebase --onto "${rel_sha}^" "$rel_sha"; then
      echo -e "${RED}✗ Rebase hit a conflict.${NC}"
      echo "Resolve it and run 'git rebase --continue', or 'git rebase --abort' to bail out."
      exit 1
    fi
  fi

  echo ""
  echo -e "${GREEN}✓ Aborted. package.json is back to $(current_version).${NC}"
  echo "Your other changes are preserved. Re-run './scripts/release.sh prepare' when ready."
}

# ───────────────────────────── dispatch ─────────────────────────────

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
  status)
    show_status
    ;;
  abort)
    abort_release
    ;;
  *)
    echo -e "${RED}Error: Unknown command '${COMMAND}'${NC}"
    show_usage
    exit 1
    ;;
esac
