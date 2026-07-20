import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin, requireAdminOrLeader } from '../../lib/auth.js'
import {
  createCoinRuleAvatarUploadUrl,
  isAllowedAvatarType,
  isAvatarStorageConfigured,
} from '../../lib/r2-storage.js'
import {
  createCoinRule,
  getCoinRuleById,
  listCoinRules,
  updateCoinRule,
} from './coin-rules.service.js'

const createBody = z.object({
  campId: z.string().uuid(),
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
  isAchievement: z.boolean().optional(),
  points: z.number().int(),
})

const updateBody = z.object({
  key: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  isAchievement: z.boolean().optional(),
  points: z.number().int().optional(),
})

const avatarUploadBody = z.object({
  contentType: z.string().min(1),
})

export async function registerCoinRulesRoutes(app: FastifyInstance) {
  // POST /coin-rules/avatar-upload-url  — presigned upload URL for rule image
  app.post('/avatar-upload-url', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!isAvatarStorageConfigured()) {
      return reply.code(503).send({ error: 'Avatar storage is not configured on server' })
    }

    const parsed = avatarUploadBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    if (!isAllowedAvatarType(parsed.data.contentType)) {
      return reply.code(400).send({ error: 'Unsupported image type. Use JPEG, PNG or WEBP.' })
    }

    return createCoinRuleAvatarUploadUrl({ campId: request.user.campId, contentType: parsed.data.contentType })
  })

  // GET /coin-rules?campId=  — Admin і Leader бачать правила (BR-025)
  app.get('/', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { campId } = request.query as { campId?: string }
    const effectiveCampId = campId ?? request.user.campId
    return listCoinRules(app, effectiveCampId)
  })

  // POST /coin-rules  — Admin створює правило (BR-025)
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const rule = await createCoinRule(app, parsed.data)
    return reply.code(201).send(rule)
  })

  // PATCH /coin-rules/:id  — Admin редагує (BR-025)
  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const rule = await updateCoinRule(app, id, parsed.data)
    if (!rule) return reply.code(404).send({ error: 'Rule not found' })
    return rule
  })

  // PATCH /coin-rules/:id/toggle  — вмикає/вимикає правило (BR-025)
  app.patch('/:id/toggle', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await getCoinRuleById(app, id)
    if (!existing) return reply.code(404).send({ error: 'Rule not found' })
    const rule = await updateCoinRule(app, id, { isActive: !existing.isActive })
    return rule
  })
}

