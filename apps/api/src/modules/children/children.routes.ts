import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin, requireAdminOrLeader } from '../../lib/auth.js'
import {
  createChildAvatarUploadUrl,
  isAllowedAvatarType,
  isAvatarStorageConfigured,
} from '../../lib/r2-storage.js'
import {
  createChild,
  deleteChild,
  getChildBalance,
  getChildById,
  isLeaderOfSquad,
  listChildren,
  listChildrenForLeader,
  searchChildren,
  updateChild,
} from './children.service.js'

const createBody = z.object({
  campId: z.string().uuid(),
  squadId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  parentName: z.string().min(1).optional(),
  photoUrl: z.string().url().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  parentPhone: z.string().min(1).optional(),
  medicalNotes: z.string().optional(),
})

const updateBody = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  parentName: z.string().min(1).optional(),
  photoUrl: z.string().url().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female']).optional(),
  parentPhone: z.string().min(1).optional(),
  medicalNotes: z.string().optional(),
})

const avatarUploadBody = z.object({
  squadId: z.string().uuid(),
  campId: z.string().uuid().optional(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
})

function normalizeOptionalPhone(phone?: string) {
  if (!phone) return undefined

  const compact = phone.replace(/\s+/g, '')
  if (!compact) return undefined

  const hasLeadingPlus = compact.startsWith('+')
  const digits = compact.replace(/\D/g, '')
  if (!digits) return undefined

  if (hasLeadingPlus || digits.startsWith('380')) {
    return `+${digits}`
  }

  return digits
}

export async function registerChildrenRoutes(app: FastifyInstance) {
  // GET /children/search?q=&campId=  — публічний пошук (BR-036, BR-037)
  app.get('/search', async (request, reply) => {
    const { q, campId } = request.query as { q?: string; campId?: string }
    if (!q || !campId) return reply.code(400).send({ error: 'q and campId are required' })
    return searchChildren(app, campId, q)
  })

  // GET /children?campId=&squadId=
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const { campId, squadId } = request.query as { campId?: string; squadId?: string }
    const { role, userId, campId: userCampId } = request.user

    if (role === 'Leader') {
      return listChildrenForLeader(app, userId)
    }
    return listChildren(app, campId ?? userCampId, squadId)
  })

  // POST /children/avatar-upload-url  — presigned upload URL for child avatar
  app.post('/avatar-upload-url', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
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

    const { role, userId, campId: userCampId } = request.user
    if (role === 'Leader') {
      const allowed = await isLeaderOfSquad(app, userId, parsed.data.squadId)
      if (!allowed) {
        return reply.code(403).send({ error: 'You can upload avatars only for your squads' })
      }
    }

    const campId = role === 'Leader' ? userCampId : (parsed.data.campId ?? userCampId)
    const uploadTarget = await createChildAvatarUploadUrl({
      campId,
      squadId: parsed.data.squadId,
      contentType: parsed.data.contentType,
    })

    return uploadTarget
  })

  // POST /children  — Admin або Leader (лише в свій загін)
  app.post('/', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { role, userId } = request.user

    // Leader може додавати дітей лише до свого загону
    if (role === 'Leader') {
      const allowed = await isLeaderOfSquad(app, userId, parsed.data.squadId)
      if (!allowed) return reply.code(403).send({ error: 'You can only add children to your own squads' })
    }

    const child = await createChild(app, {
      ...parsed.data,
      parentPhone: normalizeOptionalPhone(parsed.data.parentPhone),
    })
    return reply.code(201).send(child)
  })

  // GET /children/:id
  app.get('/:id', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const child = await getChildById(app, id)
    if (!child) return reply.code(404).send({ error: 'Child not found' })
    return child
  })

  // GET /children/:id/public  — публічний профіль дитини (BR-038, BR-039)
  app.get('/:id/public', async (request, reply) => {
    const { id } = request.params as { id: string }
    const child = await getChildById(app, id)
    if (!child) return reply.code(404).send({ error: 'Child not found' })
    const balance = await getChildBalance(app, id)
    return {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      photoUrl: child.photoUrl,
      squadId: child.squadId,
      campId: child.campId,
      balance,
    }
  })

  // PATCH /children/:id  — редагування (Admin або Leader свого загону)
  app.patch('/:id', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    if (request.user.role === 'Leader') {
      const existing = await getChildById(app, id)
      if (!existing) return reply.code(404).send({ error: 'Child not found' })
      const allowed = await isLeaderOfSquad(app, request.user.userId, existing.squadId)
      if (!allowed) return reply.code(403).send({ error: 'You can only edit children in your squads' })
    }
    const child = await updateChild(app, id, {
      ...parsed.data,
      parentPhone: normalizeOptionalPhone(parsed.data.parentPhone),
    })
    if (!child) return reply.code(404).send({ error: 'Child not found' })
    return child
  })

  // PATCH /children/:id/squad  — перевести дитину між загонами (BR-019)
  app.patch('/:id/squad', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { squadId } = request.body as { squadId?: string }
    if (!squadId) return reply.code(400).send({ error: 'squadId is required' })
    const child = await updateChild(app, id, { squadId })
    if (!child) return reply.code(404).send({ error: 'Child not found' })
    return child
  })

  // DELETE /children/:id  — видалити дитину (Admin або Leader зі свого загону)
  app.delete('/:id', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    if (request.user.role === 'Leader') {
      const existing = await getChildById(app, id)
      if (!existing) return reply.code(404).send({ error: 'Child not found' })

      const allowed = await isLeaderOfSquad(app, request.user.userId, existing.squadId)
      if (!allowed) return reply.code(403).send({ error: 'You can only delete children in your squads' })
    }

    const child = await deleteChild(app, id)
    if (!child) return reply.code(404).send({ error: 'Child not found' })
    return { message: 'Child deleted' }
  })

  // GET /children/:id/balance  — баланс (ledger-модель, BR-032)
  app.get('/:id/balance', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const balance = await getChildBalance(app, id)
    return { childId: id, balance }
  })
}
