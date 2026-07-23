# Changelog

Current published package version: `2.0.11`.

The previous hand-maintained file stopped before the 2.x contract surface and
contained removed Canvas graph examples, so it is not retained as API
documentation. Annotated git tags and GitHub release/package history are the
source of truth for published releases.

## Unreleased

### Breaking publication model changes

- Replaced the legacy top-level project publication fields with one strict
  `publication` object containing an immutable submission snapshot and review
  decisions.
- Reduced workspace project summaries to schema version 2 (`schemaVersion` and
  backend-owned `media` only).
- Removed duplicate featured-work identity, publication, description, and
  generation fields. Cover generation now lives on `cover`, and `media`
  contains only additional items.
- Removed the admin publication `reset` action and redundant queue projection
  fields.

Migration: before releasing and deploying these contract changes, run the
Agent `migrate-publication-model` data migration. It converts legacy project
publication/summary documents and canonicalizes featured works. Choose the
package release version separately through the normal release workflow.

When a release needs human-facing migration notes, run
`./scripts/release.sh --with-changelog` and add only the new version section
above this note. Current schema and import guidance belongs in `README.md`,
not in historical release entries.
