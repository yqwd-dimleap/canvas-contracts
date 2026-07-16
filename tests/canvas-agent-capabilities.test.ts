import { describe, expect, test } from 'bun:test'
import { canvasGenerationUseCaseSchema } from '../src/agent/model-preferences.js'
import { creditOperationIdSchema } from '../src/billing/schema.js'
import {
  canvasAgentCommandKindSchema,
  canvasIntentKindSchema
} from '../src/canvas/agent/actions.js'
import {
  CANVAS_AGENT_TOOL_NAMES,
  canvasAgentActionAllowed,
  canvasAgentToolIdentifierSchema,
  createDefaultCanvasAgentCapabilityManifest
} from '../src/canvas/agent/capabilities.js'

describe('default Canvas2D agent capabilities', () => {
  test('does not expose element types without an implemented Canvas2D renderer', () => {
    const manifest = createDefaultCanvasAgentCapabilityManifest()
    const unavailable = manifest.elements.filter(
      (element) =>
        element.elementType === 'group' ||
        element.elementType === 'mask' ||
        element.elementType === 'adjustment'
    )

    expect(unavailable).toHaveLength(3)
    expect(
      unavailable.every((element) => !element.enabled && !element.visible)
    ).toBe(true)
    expect(
      canvasAgentActionAllowed(manifest, {
        type: 'element.add',
        elementType: 'mask'
      })
    ).toBe(false)
    expect(
      canvasAgentActionAllowed(manifest, {
        type: 'element.add',
        elementType: 'raster'
      })
    ).toBe(true)
  })

  test('keeps unsupported element types out of the execution tool manifest', () => {
    const manifest = createDefaultCanvasAgentCapabilityManifest()
    const executeActions = manifest.tools.find(
      (tool) => tool.name === CANVAS_AGENT_TOOL_NAMES.executeActions
    )

    expect(executeActions?.elementTypes).not.toContain('group')
    expect(executeActions?.elementTypes).not.toContain('mask')
    expect(executeActions?.elementTypes).not.toContain('adjustment')
  })

  test('uses provider-safe identifiers for every model tool', () => {
    expect(
      Object.values(CANVAS_AGENT_TOOL_NAMES).every(
        (name) => canvasAgentToolIdentifierSchema.safeParse(name).success
      )
    ).toBe(true)
    expect(
      canvasAgentToolIdentifierSchema.safeParse('canvas.inspect').success
    ).toBe(false)
  })

  test('rejects the retired storyboard and script-split capabilities', () => {
    expect(canvasAgentCommandKindSchema.safeParse('storyboard').success).toBe(
      false
    )
    expect(canvasIntentKindSchema.safeParse('storyboard').success).toBe(false)
    expect(canvasGenerationUseCaseSchema.safeParse('storyboard').success).toBe(
      false
    )
    expect(
      creditOperationIdSchema.safeParse('prompt.script_split').success
    ).toBe(false)
  })
})
