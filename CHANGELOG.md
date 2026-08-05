# Changelog

Latest immutable release tag present in this checkout: `v2.3.4`.

`package.json` may be ahead while a release is prepared. Use
`./scripts/release.sh status` plus the remote tag/package registry to determine
whether that prepared version has actually been published.

Annotated git tags and GitHub release/package history are the source of truth
for published releases. This file intentionally does not duplicate historical
schema examples or completed migration instructions.

## Unreleased

No hand-maintained release notes are pending. Current schema, import, test, and
migration guidance belongs in `README.md` and the owning service docs.

When a release needs human-facing notes, run
`./scripts/release.sh --with-changelog` and add only that version's changes.
Package version changes remain part of the explicit release workflow; ordinary
feature, fix, test, or documentation work must not bump the version.
