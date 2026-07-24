import { z } from 'zod'

/**
 * Stable UI meaning for a runtime activity title. The Agent may still persist
 * a human-readable title for logs and compatibility, while consumers use this
 * code to render the activity in their current locale.
 */
export const canvasAgentActivityTitleCodeSchema = z.enum([
  'stage.inspect_current_content',
  'stage.plan_image_creation',
  'stage.plan_video_creation',
  'stage.analyze_selected_content',
  'stage.choose_approach',
  'stage.understand_request',
  'stage.apply_canvas_changes',
  'stage.review_results',
  'tool.inspect_current_canvas',
  'tool.inspect_assets',
  'tool.read_canvas_structure',
  'tool.inspect_canvas_elements',
  'tool.inspect_selected_content',
  'tool.find_similar_canvas_approaches',
  'tool.find_prompt_references',
  'tool.search_web_sources',
  'tool.find_web_media',
  'tool.submit_canvas_plan',
  'tool.wait_for_response',
  'tool.apply_canvas_changes',
  'tool.generate_media'
])

export const canvasAgentActivityDetailCodeSchema = z.enum([
  'references',
  'query',
  'completed_items',
  'generating_media',
  'applied_with_failures',
  'applied_changes',
  'found_sources',
  'read_selected_elements',
  'read_canvas_elements',
  'read_assets',
  'step_incomplete'
])

export const canvasAgentActivityMessageValueSchema = z.union([
  z.string().max(500),
  z.number().finite(),
  z.array(z.string().trim().min(1).max(120)).max(20)
])

export const canvasAgentActivityTitleMessageSchema = z
  .object({
    code: canvasAgentActivityTitleCodeSchema,
    values: z
      .record(z.string(), canvasAgentActivityMessageValueSchema)
      .optional()
  })
  .strict()

export const canvasAgentActivityDetailMessageSchema = z
  .object({
    code: canvasAgentActivityDetailCodeSchema,
    values: z
      .record(z.string(), canvasAgentActivityMessageValueSchema)
      .optional()
  })
  .strict()

export type CanvasAgentActivityTitleCode = z.infer<
  typeof canvasAgentActivityTitleCodeSchema
>
export type CanvasAgentActivityDetailCode = z.infer<
  typeof canvasAgentActivityDetailCodeSchema
>
