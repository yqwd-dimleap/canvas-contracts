import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { CANVAS_AGENT_PROTOCOL_VERSION } from '../src/agent/langgraph-protocol.js'
import { CANVAS_DOCUMENT_SCHEMA_VERSION } from '../src/canvas/core/document.js'
import { WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION } from '../src/canvas/workspace/project.js'

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string }

describe('version baselines', () => {
  test('keeps package releases on the established 2.0 line', () => {
    expect(packageJson.version).toMatch(/^2\.0\.\d+$/)
  })

  test('keeps package, persisted schema and wire versions independent', () => {
    expect(CANVAS_AGENT_PROTOCOL_VERSION).toBe('v2')
    expect(CANVAS_DOCUMENT_SCHEMA_VERSION).toBe(1)
    expect(WORKSPACE_PROJECT_CANVAS_SCHEMA_VERSION).toBe(2)
  })
})
