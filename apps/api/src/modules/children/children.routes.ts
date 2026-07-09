import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin, requireAdminOrLeader } from '../../lib/auth.js'
import {
  createChild,
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
  photoUrl: z.string().url().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  parentPhone: z.string().min(1),
  medicalNotes: z.string().optional(),
})

const updateBody = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  photoUrl: z.string().url().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female']).optional(),
  parentPhone: z.string().min(1).optional(),
  medicalNotes: z.string().optional(),
})

export async function registerChildrenRoutes(app: FastifyInstance) {
  // GET /children/search?q=&campId=  — публічний пошук (BR-036, BR-037)
  app.get('/search', async (request, reply) => {
    const { q, campId } = request.query as { q?: string; campId?: string }
    if (!q || !campId) return reply.code(400).send({ error: 'q and campId are required' })
    return searchChildren(app, campId, q)
  })

  // GET /children?campId=&squadId=
  app.get('/', { preHandler: [requireAdminOrLeader] }, async (request) => {
    const { campId, squadId } = request.query as { campId?: string; squadId?: string }
    const { role, userId, campId: userCampId } = request.user

    if (role === 'Leader') {
      return listChildrenForLeader(app, userId)
    }
    return listChildren(app, campId ?? userCampId, squadId)
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

    const child = await createChild(app, parsed.data)
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

  // PATCH /children/:id  — редагування (Admin only, BR-017)
  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const child = await updateChild(app, id, parsed.data)
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

  // GET /children/:id/balance  — баланс (ledger-модель, BR-032)
  app.get('/:id/balance', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const balance = await getChildBalance(app, id)
    return { childId: id, balance }
  })
}

