import { describe, expect, test } from 'bun:test'
import {
  canvasStoryboardArtifactContentSchema,
  canvasStoryboardSceneSchema,
  canvasStoryboardVisualBibleSchema
} from '../src/agent/storyboard.js'
import { storyboardGenerationResultSchema } from '../src/generation/index.js'

const visualBible = {
  subject: 'An orange cat with green eyes and a red collar',
  setting: 'A rainy neon street at blue hour',
  style: 'Cinematic realism with a cyan and amber palette'
}

const scene = {
  title: 'Alley entrance',
  imagePrompt: 'The orange cat waits at the rain-soaked alley entrance',
  shot: 'Track right as the cat enters the alley',
  startState: 'The cat faces screen right at the alley entrance',
  endState: 'The cat disappears around the right-hand corner',
  continuity: 'Keep the red collar, wet orange fur and rightward direction',
  duration: 5
}

describe('storyboard continuity contracts', () => {
  test('accepts a shared visual bible and per-shot handoff states', () => {
    expect(canvasStoryboardVisualBibleSchema.parse(visualBible)).toEqual(
      visualBible
    )
    expect(canvasStoryboardSceneSchema.parse(scene)).toEqual(scene)
    expect(
      storyboardGenerationResultSchema.parse({
        theme: 'A cat explores a neon city',
        visualBible,
        scenes: [scene]
      })
    ).toMatchObject({ visualBible, scenes: [scene] })
  })

  test('keeps continuity fields optional for existing storyboard artifacts', () => {
    expect(
      canvasStoryboardArtifactContentSchema.safeParse({
        kind: 'storyboard',
        scenes: [{ title: 'Legacy shot', shot: 'Slow push in' }]
      }).success
    ).toBe(true)
  })
})
