import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin, requireAdminOrLeader } from '../../lib/auth.js'
import {
  assignLeader,
  createSquad,
  getSquadById,
  getSquadLeaders,
  listSquads,
  listSquadsForLeader,
  removeLeader,
  updateSquad,
} from './squads.service.js'

const createBody = z.object({
  campId: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().min(1),
  description: z.string().optional(),
})

const updateBody = z.object({
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  description: z.string().optional(),
})

const assignLeaderBody = z.object({
  leaderId: z.string().uuid(),
})

export async function registerSquadsRoutes(app: FastifyInstance) {
  // GET /squads?campId=  — admin бачить всі, leader — лише свої (BR-016)
  app.get('/', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { campId } = request.query as { campId?: string }
    const { role, userId, campId: userCampId } = request.user

    if (role === 'Leader') {
      return listSquadsForLeader(app, userId)
    }
    return listSquads(app, campId ?? userCampId)
  })

  // POST /squads
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const squad = await createSquad(app, parsed.data)
    return reply.code(201).send(squad)
  })

  // GET /squads/:id
  app.get('/:id', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const squad = await getSquadById(app, id)
    if (!squad) return reply.code(404).send({ error: 'Squad not found' })
    return squad
  })

  // PATCH /squads/:id
  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const squad = await updateSquad(app, id, parsed.data)
    if (!squad) return reply.code(404).send({ error: 'Squad not found' })
    return squad
  })

  // GET /squads/:id/leaders
  app.get('/:id/leaders', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    return getSquadLeaders(app, id)
  })

  // POST /squads/:id/leaders  — призначити лідера (BR-014)
  app.post('/:id/leaders', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = assignLeaderBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const entry = await assignLeader(app, id, parsed.data.leaderId)
    return reply.code(201).send(entry ?? { message: 'Already assigned' })
  })

  // DELETE /squads/:id/leaders/:leaderId  — відписати лідера
  app.delete('/:id/leaders/:leaderId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, leaderId } = request.params as { id: string; leaderId: string }
    const entry = await removeLeader(app, id, leaderId)
    if (!entry) return reply.code(404).send({ error: 'Assignment not found' })
    return { message: 'Leader removed' }
  })
}

