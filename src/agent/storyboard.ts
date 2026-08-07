import { z } from 'zod'

/**
 * Video storyboard artifact content.
 *
 * Emitted as a single `document` artifact (content.kind === 'storyboard') when
 * the agent composes a shot-by-shot plan for a video. The Video Script studio
 * reads it back to populate its editable scene list, which then drives the
 * per-shot still frame, the image-to-video clip and the final stitch.
 *
 * Shared by canvas-agent (run-recorder emit) and canvas-frontend (scene
 * hydration). Do not hand-write a copy on either side.
 */

/**
 * Project-level visual anchors inherited by every shot.
 *
 * Keeping these outside the scene prompts gives the editor one stable place
 * to lock character appearance, world details and photographic language.
 */
export const canvasStoryboardVisualBibleSchema = z
  .object({
    /** Recurring characters, subjects, wardrobe and identity-defining props. */
    subject: z.string().trim().min(1).optional(),
    /** Persistent location, time of day and environmental details. */
    setting: z.string().trim().min(1).optional(),
    /** Medium, lens language, lighting, palette and texture. */
    style: z.string().trim().min(1).optional()
  })
  .strict()
  .refine((value) => Boolean(value.subject || value.setting || value.style), {
    message: 'At least one visual bible field is required.'
  })

/** One shot in the storyboard. */
export const canvasStoryboardSceneSchema = z.object({
  /** Short scene name shown as the card heading. */
  title: z.string().default(''),
  /**
   * Still-frame composition prompt fed to a text-to-image model: subject,
   * setting, lighting, framing, style. Describes what the frame *looks* like,
   * never how the camera moves — motion belongs in `shot`.
   *
   * Optional because storyboards produced before this field existed (and by
   * older agent builds) only carry `shot`; consumers fall back to it.
   */
  imagePrompt: z.string().min(1).optional(),
  /**
   * A vivid, self-contained visual prompt fed directly to a video model.
   * Paired with the shot's still frame it drives image-to-video, so it should
   * describe camera movement, pacing and action. Must not reference other
   * scenes, since each shot is generated independently.
   */
  shot: z.string().min(1),
  /** Observable state at the first frame; should inherit the prior end state. */
  startState: z.string().trim().min(1).optional(),
  /** Observable state handed to the next shot. */
  endState: z.string().trim().min(1).optional(),
  /** Identity, prop, lighting or screen-direction details that must not drift. */
  continuity: z.string().trim().min(1).optional(),
  /** Optional voiceover or subtitle text. */
  narration: z.string().optional(),
  /** Target shot length in seconds. */
  duration: z.number().int().min(3).max(8).optional()
})

export const CANVAS_STORYBOARD_ARTIFACT_KIND = 'storyboard' as const

export const canvasStoryboardArtifactContentSchema = z.object({
  kind: z.literal(CANVAS_STORYBOARD_ARTIFACT_KIND),
  /** Creative theme the storyboard was derived from, usually the user intent. */
  theme: z.string().optional(),
  /** Shared visual anchors inherited by every scene. */
  visualBible: canvasStoryboardVisualBibleSchema.optional(),
  scenes: z.array(canvasStoryboardSceneSchema).min(1)
})

/** Tool-facing payload: the agent supplies everything except the kind tag. */
export const canvasStoryboardSubmissionSchema =
  canvasStoryboardArtifactContentSchema.omit({ kind: true })

export type CanvasStoryboardScene = z.infer<typeof canvasStoryboardSceneSchema>
export type CanvasStoryboardVisualBible = z.infer<
  typeof canvasStoryboardVisualBibleSchema
>
export type CanvasStoryboardArtifactContent = z.infer<
  typeof canvasStoryboardArtifactContentSchema
>
export type CanvasStoryboardSubmission = z.infer<
  typeof canvasStoryboardSubmissionSchema
>
