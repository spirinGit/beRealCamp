import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin, requireAdminOrLeader, requireLeaderRole } from '../../lib/auth.js'
import {
  createEvent,
  getEventAdminDetails,
  listEventsForAdmin,
  listEventsForLeader,
  setEventSquadStatusByAdmin,
  submitEventCodeByLeader,
} from './events.service.js'

const createEventBody = z.object({
  campId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  code: z.string().min(1),
  rewardPoints: z.number().int().positive(),
  penaltyPoints: z.number().int().nonnegative(),
  endsAt: z.string().datetime(),
  squadIds: z.array(z.string().uuid()).min(1),
})

const updateParticipantBody = z.object({
  status: z.enum(['completed', 'failed']),
})

const submitCodeBody = z.object({
  squadId: z.string().uuid(),
  code: z.string().min(1),
})

const listQuery = z.object({
  campId: z.string().uuid().optional(),
  view: z.enum(['active', 'history']).optional(),
})

export async function registerEventsRoutes(app: FastifyInstance) {
  app.get('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = listQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() })
    }
    return listEventsForAdmin(app, parsed.data.campId ?? request.user.campId, parsed.data.view ?? 'active')
  })

  app.post('/admin', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createEventBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const event = await createEvent(app, {
      ...parsed.data,
      endsAt: new Date(parsed.data.endsAt),
      campId: parsed.data.campId ?? request.user.campId,
      createdByUserId: request.user.userId,
    })
    return reply.code(201).send(event)
  })

  app.get('/admin/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = listQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() })
    }
    const event = await getEventAdminDetails(app, parsed.data.campId ?? request.user.campId, id)
    if (!event) return reply.code(404).send({ error: 'Event not found' })
    return event
  })

  app.patch('/admin/:id/squads/:squadId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, squadId } = request.params as { id: string; squadId: string }
    const queryParsed = listQuery.safeParse(request.query)
    const parsed = updateParticipantBody.safeParse(request.body)
    if (!queryParsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: queryParsed.error.flatten() })
    }
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const result = await setEventSquadStatusByAdmin(app, {
      eventId: id,
      squadId,
      campId: queryParsed.data.campId ?? request.user.campId,
      actorUserId: request.user.userId,
      status: parsed.data.status,
    })
    if (!result.ok) {
      return reply.code(422).send({ error: result.error })
    }
    return { ok: true }
  })

  app.get('/leader', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const parsed = listQuery.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() })
    }

    if (request.user.role === 'Administrator') {
      return listEventsForAdmin(app, request.user.campId, parsed.data.view ?? 'active')
    }

    return listEventsForLeader(app, {
      campId: request.user.campId,
      leaderId: request.user.userId,
      view: parsed.data.view ?? 'active',
    })
  })

  app.post('/:id/submit-code', { preHandler: [requireLeaderRole] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = submitCodeBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const result = await submitEventCodeByLeader(app, {
      eventId: id,
      squadId: parsed.data.squadId,
      code: parsed.data.code,
      campId: request.user.campId,
      actorUserId: request.user.userId,
    })
    if (!result.ok) {
      return reply.code(422).send({ error: result.error })
    }
    return { ok: true }
  })
}
