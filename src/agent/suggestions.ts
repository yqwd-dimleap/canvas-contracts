import { z } from 'zod'

export const canvasAgentSuggestionKindSchema = z.enum([
  'run',
  'inspect',
  'generate_image',
  'generate_video',
  'edit',
  'select',
  'ask'
])

export const canvasAgentSuggestionPrioritySchema = z.enum([
  'low',
  'normal',
  'high'
])

export const canvasAgentSuggestionSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(180).optional(),
  intent: z.string().trim().min(1).max(500),
  kind: canvasAgentSuggestionKindSchema.default('run'),
  priority: canvasAgentSuggestionPrioritySchema.default('normal'),
  targetNodeIds: z.array(z.string().trim().min(1)).max(12).default([]),
  targetDocumentId: z.string().trim().min(1).optional(),
  targetElementIds: z.array(z.string().trim().min(1)).max(12).default([]),
  confidence: z.number().min(0).max(1).optional(),
  estimatedCost: z.number().nonnegative().optional()
})

export const canvasAgentSuggestionsSchema = z
  .array(canvasAgentSuggestionSchema)
  .max(6)

export type CanvasAgentSuggestion = z.infer<typeof canvasAgentSuggestionSchema>

export type CanvasAgentSuggestionKind = z.infer<
  typeof canvasAgentSuggestionKindSchema
>

export type CanvasAgentSuggestionPriority = z.infer<
  typeof canvasAgentSuggestionPrioritySchema
>

export type CanvasAgentSuggestionChoice = CanvasAgentSuggestion & {
  value: string
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function suggestionId(input: {
  id?: string
  label: string
  intent: string
  index: number
}) {
  const source = input.id || input.intent || input.label || `suggestion`
  return `${source
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)}-${input.index + 1}`
}

export function normalizeCanvasAgentSuggestions(
  value: unknown,
  options?: { limit?: number }
): CanvasAgentSuggestion[] {
  if (!Array.isArray(value)) return []
  const limit = options?.limit ?? 6
  const suggestions: CanvasAgentSuggestion[] = []
  const seenIntents = new Set<string>()

  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    const label = stringValue(record.label)
    const intent = stringValue(record.intent) || stringValue(record.value)
    if (!label || !intent) continue
    const key = intent.toLowerCase()
    if (seenIntents.has(key)) continue
    seenIntents.add(key)

    const parsed = canvasAgentSuggestionSchema.safeParse({
      id: suggestionId({
        id: stringValue(record.id),
        label,
        intent,
        index
      }),
      label,
      description: stringValue(record.description) || undefined,
      intent,
      kind: record.kind,
      priority: record.priority,
      targetNodeIds: Array.isArray(record.targetNodeIds)
        ? record.targetNodeIds
        : Array.isArray(record.nodeIds)
          ? record.nodeIds
          : undefined,
      targetDocumentId: stringValue(record.targetDocumentId) || undefined,
      targetElementIds: Array.isArray(record.targetElementIds)
        ? record.targetElementIds
        : Array.isArray(record.layerIds)
          ? record.layerIds
          : undefined,
      confidence: record.confidence,
      estimatedCost: record.estimatedCost
    })
    if (!parsed.success) continue
    suggestions.push(parsed.data)
    if (suggestions.length >= limit) break
  }

  return suggestions
}

export function canvasAgentSuggestionChoices(
  value: unknown,
  options?: { limit?: number }
): CanvasAgentSuggestionChoice[] {
  return normalizeCanvasAgentSuggestions(value, options).map((suggestion) => ({
    ...suggestion,
    value: suggestion.intent
  }))
}
