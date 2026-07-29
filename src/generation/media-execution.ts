import { z } from 'zod'
import { apiSuccessResponseSchema } from '../api/response.js'
import {
  generationParamsSchema,
  generationReferencesSchema
} from '../models/params.js'
import { timestampSchema } from '../shared/timestamp.js'

export const MEDIA_EXECUTION_SCHEMA_VERSION = 1 as const
export const MEDIA_EXECUTION_MAX_PROJECTIONS = 4 as const
export const MEDIA_EXECUTION_MAX_ATTEMPTS = 5 as const

/** Product intent, independent of provider endpoint and UI surface. */
export const mediaExecutionUseCaseSchema = z.enum([
  'text-to-image',
  'image-to-image',
  'image-edit',
  'text-to-video',
  'image-to-video',
  'video-edit',
  'video-merge',
  'text-to-speech',
  'voice-clone'
])

/** Compatibility subset used by the current Canvas model preferences. */
export const visualMediaExecutionUseCaseSchema =
  mediaExecutionUseCaseSchema.extract([
    'text-to-image',
    'image-to-image',
    'image-edit',
    'text-to-video',
    'image-to-video',
    'video-edit',
    'video-merge'
  ])

export const mediaExecutionAssetTypeSchema = z.enum(['image', 'video', 'audio'])
export const mediaExecutionOutputKindSchema = z.enum([
  'image',
  'video',
  'audio',
  'voice-profile'
])

export const MEDIA_EXECUTION_OUTPUT_KIND_BY_USE_CASE = {
  'text-to-image': 'image',
  'image-to-image': 'image',
  'image-edit': 'image',
  'text-to-video': 'video',
  'image-to-video': 'video',
  'video-edit': 'video',
  'video-merge': 'video',
  'text-to-speech': 'audio',
  'voice-clone': 'voice-profile'
} as const satisfies Record<MediaExecutionUseCase, MediaExecutionOutputKind>

export const mediaExecutionSourceKindSchema = z.enum([
  'canvas',
  'studio',
  'agent',
  'api'
])

export const mediaExecutionSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('canvas'),
      projectId: z.string().trim().min(1).max(128),
      actionId: z.string().trim().min(1).max(128).optional()
    })
    .strict(),
  z
    .object({
      kind: z.literal('studio'),
      projectId: z.string().trim().min(1).max(128).nullable().optional(),
      sessionId: z.string().trim().min(1).max(128).optional()
    })
    .strict(),
  z
    .object({
      kind: z.literal('agent'),
      projectId: z.string().trim().min(1).max(128).nullable().optional(),
      threadId: z.string().trim().min(1).max(128),
      runId: z.string().trim().min(1).max(128),
      toolCallId: z.string().trim().min(1).max(128).optional()
    })
    .strict(),
  z
    .object({
      kind: z.literal('api'),
      projectId: z.string().trim().min(1).max(128).nullable().optional(),
      clientId: z.string().trim().min(1).max(128).optional()
    })
    .strict()
])

/**
 * Optional presentation destinations applied after canonical output
 * persistence. Source and projection are deliberately independent.
 */
export const mediaExecutionProjectionTargetSchema = z.discriminatedUnion(
  'kind',
  [
    z
      .object({
        kind: z.literal('canvas-element'),
        projectId: z.string().trim().min(1).max(128),
        documentId: z.string().trim().min(1).max(128),
        elementId: z.string().trim().min(1).max(128),
        actionId: z.string().trim().min(1).max(128).optional()
      })
      .strict(),
    z
      .object({
        kind: z.literal('agent-artifact'),
        threadId: z.string().trim().min(1).max(128),
        runId: z.string().trim().min(1).max(128),
        artifactId: z.string().trim().min(1).max(128).optional()
      })
      .strict()
  ]
)

export const mediaExecutionModelSelectionSchema = z.discriminatedUnion(
  'strategy',
  [
    z
      .object({
        strategy: z.literal('explicit'),
        modelId: z.string().trim().min(1).max(256)
      })
      .strict(),
    z.object({ strategy: z.literal('user-preference') }).strict(),
    z.object({ strategy: z.literal('system-default') }).strict()
  ]
)

export const mediaExecutionPolicySchema = z
  .object({
    mode: z.enum(['auto', 'foreground', 'background']).default('auto'),
    timeoutMs: z.number().int().positive().max(1_800_000).optional(),
    priority: z.enum(['interactive', 'normal', 'batch']).default('normal')
  })
  .strict()

export const mediaExecutionInputSchema = z
  .object({
    /** Visual/video generation or editing instruction. */
    instruction: z.string().trim().min(1).max(48_000).optional(),
    /** Text content spoken by text-to-speech. */
    text: z.string().trim().min(1).max(48_000).optional(),
    params: generationParamsSchema.default({}),
    references: generationReferencesSchema.default({ items: [] })
  })
  .strict()

function projectionIdentity(target: MediaExecutionProjectionTarget) {
  if (target.kind === 'canvas-element') {
    return [
      target.kind,
      target.projectId,
      target.documentId,
      target.elementId
    ].join(':')
  }
  return [
    target.kind,
    target.threadId,
    target.runId,
    target.artifactId ?? 'new'
  ].join(':')
}

function hasReference(
  request: Pick<MediaExecutionRequest, 'input'>,
  mediaType: 'image' | 'video' | 'audio',
  roles?: ReadonlySet<string>
) {
  return request.input.references.items.some(
    (reference) =>
      reference.mediaType === mediaType && (!roles || roles.has(reference.role))
  )
}

function countReferences(
  request: Pick<MediaExecutionRequest, 'input'>,
  mediaType: 'image' | 'video' | 'audio',
  roles?: ReadonlySet<string>
) {
  return request.input.references.items.filter(
    (reference) =>
      reference.mediaType === mediaType && (!roles || roles.has(reference.role))
  ).length
}

function validateMediaExecutionRequest(
  request: MediaExecutionRequest,
  context: z.RefinementCtx
) {
  const visualUseCase = visualMediaExecutionUseCaseSchema.safeParse(
    request.useCase
  ).success
  if (visualUseCase && !request.input.instruction) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'instruction'],
      message: 'MEDIA_EXECUTION_INSTRUCTION_REQUIRED'
    })
  }

  if (request.useCase === 'text-to-speech' && !request.input.text) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'text'],
      message: 'MEDIA_EXECUTION_TEXT_REQUIRED'
    })
  }

  const imageInputRoles = new Set(['reference', 'source', 'style'])
  if (
    (request.useCase === 'image-to-image' ||
      request.useCase === 'image-edit') &&
    !hasReference(request, 'image', imageInputRoles)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'references'],
      message: 'MEDIA_EXECUTION_IMAGE_REFERENCE_REQUIRED'
    })
  }

  if (
    request.useCase === 'image-to-video' &&
    !hasReference(
      request,
      'image',
      new Set(['reference', 'source', 'first_frame'])
    )
  ) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'references'],
      message: 'MEDIA_EXECUTION_VIDEO_FRAME_REQUIRED'
    })
  }

  if (
    request.useCase === 'video-edit' &&
    !hasReference(request, 'video', new Set(['reference', 'source', 'clip']))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'references'],
      message: 'MEDIA_EXECUTION_VIDEO_REFERENCE_REQUIRED'
    })
  }

  if (
    request.useCase === 'video-merge' &&
    countReferences(request, 'video', new Set(['source', 'clip'])) < 2
  ) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'references'],
      message: 'MEDIA_EXECUTION_VIDEO_MERGE_INPUTS_REQUIRED'
    })
  }

  if (
    request.useCase === 'voice-clone' &&
    !hasReference(request, 'audio', new Set(['reference_voice']))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['input', 'references'],
      message: 'MEDIA_EXECUTION_REFERENCE_VOICE_REQUIRED'
    })
  }

  const projectionIdentities = request.projections.map(projectionIdentity)
  if (new Set(projectionIdentities).size !== projectionIdentities.length) {
    context.addIssue({
      code: 'custom',
      path: ['projections'],
      message: 'MEDIA_EXECUTION_PROJECTIONS_MUST_BE_UNIQUE'
    })
  }

  if (
    request.source.kind === 'canvas' &&
    !request.projections.some((target) => target.kind === 'canvas-element')
  ) {
    context.addIssue({
      code: 'custom',
      path: ['projections'],
      message: 'MEDIA_EXECUTION_CANVAS_PROJECTION_REQUIRED'
    })
  }

  for (const [index, target] of request.projections.entries()) {
    if (
      target.kind === 'canvas-element' &&
      request.source.projectId &&
      target.projectId !== request.source.projectId
    ) {
      context.addIssue({
        code: 'custom',
        path: ['projections', index, 'projectId'],
        message: 'MEDIA_EXECUTION_PROJECT_MISMATCH'
      })
    }
    if (
      target.kind === 'agent-artifact' &&
      request.source.kind === 'agent' &&
      (target.threadId !== request.source.threadId ||
        target.runId !== request.source.runId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['projections', index],
        message: 'MEDIA_EXECUTION_AGENT_RUN_MISMATCH'
      })
    }
  }
}

const mediaExecutionRequestBaseSchema = z
  .object({
    schemaVersion: z.literal(MEDIA_EXECUTION_SCHEMA_VERSION),
    idempotencyKey: z.string().trim().min(8).max(200),
    useCase: mediaExecutionUseCaseSchema,
    input: mediaExecutionInputSchema,
    model: mediaExecutionModelSelectionSchema,
    source: mediaExecutionSourceSchema,
    projections: z
      .array(mediaExecutionProjectionTargetSchema)
      .max(MEDIA_EXECUTION_MAX_PROJECTIONS)
      .default([]),
    policy: mediaExecutionPolicySchema.default({
      mode: 'auto',
      priority: 'normal'
    }),
    locale: z.string().trim().min(2).max(16).optional()
  })
  .strict()

export const mediaExecutionRequestSchema =
  mediaExecutionRequestBaseSchema.superRefine(validateMediaExecutionRequest)

export const createMediaExecutionRequestSchema = mediaExecutionRequestSchema

export const mediaExecutionStatusSchema = z.enum([
  'queued',
  'running',
  'waiting-provider',
  'projecting',
  'completed',
  'failed',
  'cancelled'
])

export const mediaExecutionStageSchema = z.enum([
  'queued',
  'validating',
  'resolving-inputs',
  'reserving-usage',
  'submitting-provider',
  'waiting-provider',
  'persisting-output',
  'projecting-output',
  'completed',
  'failed',
  'cancelled'
])

const MEDIA_EXECUTION_STAGES_BY_STATUS = {
  queued: new Set(['queued']),
  running: new Set([
    'validating',
    'resolving-inputs',
    'reserving-usage',
    'submitting-provider',
    'persisting-output'
  ]),
  'waiting-provider': new Set(['waiting-provider']),
  projecting: new Set(['projecting-output']),
  completed: new Set(['completed']),
  failed: new Set(['failed']),
  cancelled: new Set(['cancelled'])
} as const satisfies Record<MediaExecutionStatus, ReadonlySet<string>>

export const mediaExecutionErrorSchema = z
  .object({
    code: z.string().trim().min(1).max(128),
    message: z.string().trim().min(1).max(4000),
    retryable: z.boolean().default(false),
    details: z.unknown().optional()
  })
  .strict()

export const mediaExecutionAssetSchema = z
  .object({
    assetId: z.string().trim().min(1).max(128),
    type: mediaExecutionAssetTypeSchema,
    url: z.string().trim().min(1).max(16_000).optional(),
    posterUrl: z.string().trim().min(1).max(16_000).optional(),
    previewUrl: z.string().trim().min(1).max(16_000).optional(),
    mimeType: z.string().trim().min(1).max(256).optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    durationMs: z.number().nonnegative().optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

export const mediaExecutionVoiceProfileSchema = z
  .object({
    voiceProfileId: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(200).optional(),
    previewAssetId: z.string().trim().min(1).max(128).optional(),
    metadata: z.record(z.string(), z.unknown()).default({})
  })
  .strict()

function validateProjectionResult(
  result: MediaExecutionProjectionResult,
  context: z.RefinementCtx
) {
  if (result.status === 'failed' && !result.error) {
    context.addIssue({
      code: 'custom',
      path: ['error'],
      message: 'MEDIA_EXECUTION_PROJECTION_ERROR_REQUIRED'
    })
  }
  if (result.status !== 'failed' && result.error) {
    context.addIssue({
      code: 'custom',
      path: ['error'],
      message: 'MEDIA_EXECUTION_PROJECTION_ERROR_NOT_ALLOWED'
    })
  }
  if (
    result.status === 'completed' &&
    result.target.kind === 'canvas-element' &&
    result.committedRevision === undefined
  ) {
    context.addIssue({
      code: 'custom',
      path: ['committedRevision'],
      message: 'MEDIA_EXECUTION_COMMITTED_REVISION_REQUIRED'
    })
  }
  if (
    result.status === 'completed' &&
    result.target.kind === 'agent-artifact' &&
    !result.artifactId
  ) {
    context.addIssue({
      code: 'custom',
      path: ['artifactId'],
      message: 'MEDIA_EXECUTION_ARTIFACT_ID_REQUIRED'
    })
  }
}

const mediaExecutionProjectionResultBaseSchema = z
  .object({
    target: mediaExecutionProjectionTargetSchema,
    status: z.enum(['completed', 'failed', 'skipped']),
    artifactId: z.string().trim().min(1).max(128).optional(),
    committedRevision: z.number().int().nonnegative().optional(),
    error: mediaExecutionErrorSchema.optional()
  })
  .strict()

export const mediaExecutionProjectionResultSchema =
  mediaExecutionProjectionResultBaseSchema.superRefine(validateProjectionResult)

export const mediaExecutionResultSchema = z
  .object({
    assets: z.array(mediaExecutionAssetSchema).max(32).default([]),
    voiceProfiles: z.array(mediaExecutionVoiceProfileSchema).max(8).default([]),
    projections: z
      .array(mediaExecutionProjectionResultSchema)
      .max(MEDIA_EXECUTION_MAX_PROJECTIONS)
      .default([]),
    provider: z.string().trim().min(1).max(128).optional(),
    model: z.string().trim().min(1).max(256).optional()
  })
  .strict()
  .refine(
    (result) => result.assets.length > 0 || result.voiceProfiles.length > 0,
    { message: 'MEDIA_EXECUTION_OUTPUT_REQUIRED' }
  )

const mediaExecutionTaskBaseSchema = z
  .object({
    schemaVersion: z.literal(MEDIA_EXECUTION_SCHEMA_VERSION),
    id: z.string().trim().min(1).max(128),
    revision: z.number().int().nonnegative(),
    userId: z.string().trim().min(1).max(128),
    projectId: z.string().trim().min(1).max(128).nullable().default(null),
    idempotencyKey: z.string().trim().min(8).max(200),
    useCase: mediaExecutionUseCaseSchema,
    outputKind: mediaExecutionOutputKindSchema,
    source: mediaExecutionSourceSchema,
    projectionTargets: z
      .array(mediaExecutionProjectionTargetSchema)
      .max(MEDIA_EXECUTION_MAX_PROJECTIONS)
      .default([]),
    status: mediaExecutionStatusSchema,
    stage: mediaExecutionStageSchema,
    progress: z.number().min(0).max(100).default(0),
    attempt: z.number().int().nonnegative().default(0),
    maxAttempts: z
      .number()
      .int()
      .positive()
      .max(MEDIA_EXECUTION_MAX_ATTEMPTS)
      .default(3),
    providerTaskId: z.string().trim().min(1).max(256).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    result: mediaExecutionResultSchema.optional(),
    error: mediaExecutionErrorSchema.optional()
  })
  .strict()

const TERMINAL_MEDIA_EXECUTION_STATUSES = new Set<MediaExecutionStatus>([
  'completed',
  'failed',
  'cancelled'
])

function validateMediaExecutionTask(
  task: Pick<
    MediaExecutionTask,
    | 'useCase'
    | 'outputKind'
    | 'projectionTargets'
    | 'status'
    | 'stage'
    | 'progress'
    | 'attempt'
    | 'maxAttempts'
    | 'result'
    | 'error'
  > & {
    startedAt?: unknown
    completedAt?: unknown
  },
  context: z.RefinementCtx
) {
  const expectedOutputKind =
    MEDIA_EXECUTION_OUTPUT_KIND_BY_USE_CASE[task.useCase]
  if (task.outputKind !== expectedOutputKind) {
    context.addIssue({
      code: 'custom',
      path: ['outputKind'],
      message: 'MEDIA_EXECUTION_OUTPUT_KIND_MISMATCH'
    })
  }

  if (!MEDIA_EXECUTION_STAGES_BY_STATUS[task.status].has(task.stage)) {
    context.addIssue({
      code: 'custom',
      path: ['stage'],
      message: 'MEDIA_EXECUTION_STAGE_STATUS_MISMATCH'
    })
  }

  if (task.attempt > task.maxAttempts) {
    context.addIssue({
      code: 'custom',
      path: ['attempt'],
      message: 'MEDIA_EXECUTION_ATTEMPT_LIMIT_EXCEEDED'
    })
  }

  const terminal = TERMINAL_MEDIA_EXECUTION_STATUSES.has(task.status)
  if (terminal && !task.completedAt) {
    context.addIssue({
      code: 'custom',
      path: ['completedAt'],
      message: 'MEDIA_EXECUTION_COMPLETED_AT_REQUIRED'
    })
  }
  if (!terminal && task.completedAt) {
    context.addIssue({
      code: 'custom',
      path: ['completedAt'],
      message: 'MEDIA_EXECUTION_COMPLETED_AT_NOT_ALLOWED'
    })
  }
  if (task.status === 'completed') {
    if (!task.result) {
      context.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'MEDIA_EXECUTION_RESULT_REQUIRED'
      })
    }
    if (task.progress !== 100) {
      context.addIssue({
        code: 'custom',
        path: ['progress'],
        message: 'MEDIA_EXECUTION_COMPLETED_PROGRESS_INVALID'
      })
    }
  }
  if (task.status === 'projecting' && !task.result) {
    context.addIssue({
      code: 'custom',
      path: ['result'],
      message: 'MEDIA_EXECUTION_RESULT_REQUIRED_FOR_PROJECTION'
    })
  }
  if (task.status === 'failed' && !task.error) {
    context.addIssue({
      code: 'custom',
      path: ['error'],
      message: 'MEDIA_EXECUTION_ERROR_REQUIRED'
    })
  }
  if (task.status !== 'failed' && task.error) {
    context.addIssue({
      code: 'custom',
      path: ['error'],
      message: 'MEDIA_EXECUTION_ERROR_NOT_ALLOWED'
    })
  }

  if (task.result) {
    const hasExpectedOutput =
      task.outputKind === 'voice-profile'
        ? task.result.voiceProfiles.length > 0
        : task.result.assets.some((asset) => asset.type === task.outputKind)
    if (!hasExpectedOutput) {
      context.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'MEDIA_EXECUTION_EXPECTED_OUTPUT_REQUIRED'
      })
    }

    const targetIdentities = new Set(
      task.projectionTargets.map(projectionIdentity)
    )
    const resultIdentities = task.result.projections.map((projection) =>
      projectionIdentity(projection.target)
    )
    if (new Set(resultIdentities).size !== resultIdentities.length) {
      context.addIssue({
        code: 'custom',
        path: ['result', 'projections'],
        message: 'MEDIA_EXECUTION_PROJECTION_RESULTS_MUST_BE_UNIQUE'
      })
    }
    for (const [index, identity] of resultIdentities.entries()) {
      if (!targetIdentities.has(identity)) {
        context.addIssue({
          code: 'custom',
          path: ['result', 'projections', index, 'target'],
          message: 'MEDIA_EXECUTION_PROJECTION_TARGET_UNKNOWN'
        })
      }
    }
    if (
      task.status === 'completed' &&
      resultIdentities.length !== targetIdentities.size
    ) {
      context.addIssue({
        code: 'custom',
        path: ['result', 'projections'],
        message: 'MEDIA_EXECUTION_PROJECTION_RESULTS_INCOMPLETE'
      })
    }
  }
}

export const mediaExecutionTaskSchema =
  mediaExecutionTaskBaseSchema.superRefine(validateMediaExecutionTask)

/** Mongo/repository shape. Public task timestamps remain ISO strings. */
export const mediaExecutionTaskDocumentSchema = mediaExecutionTaskBaseSchema
  .omit({
    createdAt: true,
    updatedAt: true,
    startedAt: true,
    completedAt: true
  })
  .extend({
    request: mediaExecutionRequestSchema,
    requestHash: z.string().trim().min(1).max(256),
    retryOf: z.string().trim().min(1).max(128).optional(),
    leaseUntil: timestampSchema.nullable().optional(),
    workerId: z.string().trim().min(1).max(256).optional(),
    cancelRequestedAt: timestampSchema.nullable().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    startedAt: timestampSchema.optional(),
    completedAt: timestampSchema.optional()
  })
  .strict()
  .superRefine(validateMediaExecutionTask)
  .superRefine((document, context) => {
    if (document.idempotencyKey !== document.request.idempotencyKey) {
      context.addIssue({
        code: 'custom',
        path: ['request', 'idempotencyKey'],
        message: 'MEDIA_EXECUTION_REQUEST_IDEMPOTENCY_KEY_MISMATCH'
      })
    }
    if (document.useCase !== document.request.useCase) {
      context.addIssue({
        code: 'custom',
        path: ['request', 'useCase'],
        message: 'MEDIA_EXECUTION_REQUEST_USE_CASE_MISMATCH'
      })
    }
    if (
      JSON.stringify(document.source) !==
      JSON.stringify(document.request.source)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['request', 'source'],
        message: 'MEDIA_EXECUTION_REQUEST_SOURCE_MISMATCH'
      })
    }
    if (
      JSON.stringify(document.projectionTargets) !==
      JSON.stringify(document.request.projections)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['request', 'projections'],
        message: 'MEDIA_EXECUTION_REQUEST_PROJECTIONS_MISMATCH'
      })
    }
  })

export const mediaExecutionUpdateSchema = z
  .object({
    task: mediaExecutionTaskSchema
  })
  .strict()

export const mediaExecutionOutcomeSchema = z
  .object({
    kind: z.enum(['accepted', 'settled']),
    task: mediaExecutionTaskSchema
  })
  .strict()
  .superRefine((outcome, context) => {
    const terminal = TERMINAL_MEDIA_EXECUTION_STATUSES.has(outcome.task.status)
    if (outcome.kind === 'accepted' && terminal) {
      context.addIssue({
        code: 'custom',
        path: ['task', 'status'],
        message: 'MEDIA_EXECUTION_ACCEPTED_TASK_MUST_BE_ACTIVE'
      })
    }
    if (outcome.kind === 'settled' && !terminal) {
      context.addIssue({
        code: 'custom',
        path: ['task', 'status'],
        message: 'MEDIA_EXECUTION_SETTLED_TASK_MUST_BE_TERMINAL'
      })
    }
  })

export const cancelMediaExecutionRequestSchema = z
  .object({
    reason: z.string().trim().min(1).max(500).optional()
  })
  .strict()

export const listMediaExecutionsQuerySchema = z
  .object({
    projectId: z.string().trim().min(1).max(128).optional(),
    threadId: z.string().trim().min(1).max(128).optional(),
    runId: z.string().trim().min(1).max(128).optional(),
    sourceKind: mediaExecutionSourceKindSchema.optional(),
    useCase: mediaExecutionUseCaseSchema.optional(),
    statuses: z.array(mediaExecutionStatusSchema).max(7).optional(),
    updatedAfter: z.string().datetime().optional(),
    cursor: z.string().datetime().optional(),
    limit: z.number().int().positive().max(200).default(50)
  })
  .strict()

export const mediaExecutionSubmissionSchema = z
  .object({
    outcome: mediaExecutionOutcomeSchema,
    reused: z.boolean().default(false)
  })
  .strict()

export const mediaExecutionTaskResponseSchema = z
  .object({ task: mediaExecutionTaskSchema })
  .strict()

export const listMediaExecutionsResponseSchema = z
  .object({
    tasks: z.array(mediaExecutionTaskSchema),
    nextCursor: z.string().datetime().nullable()
  })
  .strict()

export const mediaExecutionSubmissionApiResponseSchema =
  apiSuccessResponseSchema(mediaExecutionSubmissionSchema)
export const mediaExecutionTaskApiResponseSchema = apiSuccessResponseSchema(
  mediaExecutionTaskResponseSchema
)
export const cancelMediaExecutionApiResponseSchema =
  mediaExecutionTaskApiResponseSchema
export const listMediaExecutionsApiResponseSchema = apiSuccessResponseSchema(
  listMediaExecutionsResponseSchema
)

export type MediaExecutionUseCase = z.infer<typeof mediaExecutionUseCaseSchema>
export type VisualMediaExecutionUseCase = z.infer<
  typeof visualMediaExecutionUseCaseSchema
>
export type MediaExecutionAssetType = z.infer<
  typeof mediaExecutionAssetTypeSchema
>
export type MediaExecutionOutputKind = z.infer<
  typeof mediaExecutionOutputKindSchema
>
export type MediaExecutionSourceKind = z.infer<
  typeof mediaExecutionSourceKindSchema
>
export type MediaExecutionSource = z.infer<typeof mediaExecutionSourceSchema>
export type MediaExecutionProjectionTarget = z.infer<
  typeof mediaExecutionProjectionTargetSchema
>
export type MediaExecutionModelSelection = z.infer<
  typeof mediaExecutionModelSelectionSchema
>
export type MediaExecutionPolicy = z.infer<typeof mediaExecutionPolicySchema>
export type MediaExecutionInput = z.infer<typeof mediaExecutionInputSchema>
export type MediaExecutionRequest = z.infer<typeof mediaExecutionRequestSchema>
export type CreateMediaExecutionRequest = z.infer<
  typeof createMediaExecutionRequestSchema
>
export type MediaExecutionStatus = z.infer<typeof mediaExecutionStatusSchema>
export type MediaExecutionStage = z.infer<typeof mediaExecutionStageSchema>
export type MediaExecutionError = z.infer<typeof mediaExecutionErrorSchema>
export type MediaExecutionAsset = z.infer<typeof mediaExecutionAssetSchema>
export type MediaExecutionVoiceProfile = z.infer<
  typeof mediaExecutionVoiceProfileSchema
>
export type MediaExecutionProjectionResult = z.infer<
  typeof mediaExecutionProjectionResultSchema
>
export type MediaExecutionResult = z.infer<typeof mediaExecutionResultSchema>
export type MediaExecutionTask = z.infer<typeof mediaExecutionTaskBaseSchema>
export type MediaExecutionTaskDocument = z.infer<
  typeof mediaExecutionTaskDocumentSchema
>
export type MediaExecutionUpdate = z.infer<typeof mediaExecutionUpdateSchema>
export type MediaExecutionOutcome = z.infer<typeof mediaExecutionOutcomeSchema>
export type CancelMediaExecutionRequest = z.infer<
  typeof cancelMediaExecutionRequestSchema
>
export type ListMediaExecutionsQuery = z.infer<
  typeof listMediaExecutionsQuerySchema
>
export type MediaExecutionSubmission = z.infer<
  typeof mediaExecutionSubmissionSchema
>
export type ListMediaExecutionsResponse = z.infer<
  typeof listMediaExecutionsResponseSchema
>

export type MediaExecutionSourceOf<TKind extends MediaExecutionSource['kind']> =
  Extract<MediaExecutionSource, { kind: TKind }>

export type MediaExecutionProjectionTargetOf<
  TKind extends MediaExecutionProjectionTarget['kind']
> = Extract<MediaExecutionProjectionTarget, { kind: TKind }>

export function mediaExecutionOutputKindForUseCase(
  useCase: MediaExecutionUseCase
): MediaExecutionOutputKind {
  return MEDIA_EXECUTION_OUTPUT_KIND_BY_USE_CASE[useCase]
}

export interface MediaExecutionCallOptions<
  TSignal = unknown,
  TUpdate = MediaExecutionUpdate
> {
  signal?: TSignal
  waitForCompletion?: boolean
  onUpdate?: (update: TUpdate) => void | Promise<void>
}

/** Shared application port used by HTTP, Canvas execution and Agent tools. */
export interface MediaExecutionPort<
  TContext,
  TSignal = unknown,
  TRequest extends MediaExecutionRequest = MediaExecutionRequest,
  TOutcome extends MediaExecutionOutcome = MediaExecutionOutcome,
  TUpdate = MediaExecutionUpdate
> {
  execute(
    request: TRequest,
    context: TContext,
    options?: MediaExecutionCallOptions<TSignal, TUpdate>
  ): Promise<TOutcome>
  get(taskId: string, context: TContext): Promise<MediaExecutionTask | null>
  list(
    query: ListMediaExecutionsQuery,
    context: TContext
  ): Promise<ListMediaExecutionsResponse>
  cancel(
    taskId: string,
    request: CancelMediaExecutionRequest,
    context: TContext
  ): Promise<MediaExecutionTask | null>
}

export interface MediaExecutionProjectionInput<
  TTarget extends
    MediaExecutionProjectionTarget = MediaExecutionProjectionTarget,
  TContext = unknown
> {
  task: MediaExecutionTask
  target: TTarget
  result: MediaExecutionResult
  context: TContext
}

/** A projection adapter never calls a provider or charges generation usage. */
export interface MediaExecutionProjector<
  TKind extends MediaExecutionProjectionTarget['kind'],
  TContext = unknown
> {
  readonly kind: TKind
  project(
    input: MediaExecutionProjectionInput<
      MediaExecutionProjectionTargetOf<TKind>,
      TContext
    >
  ): Promise<MediaExecutionProjectionResult>
}
