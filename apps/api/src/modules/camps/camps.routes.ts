import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../../lib/auth.js'
import { archiveCamp, createCamp, getCampById, listCamps, updateCamp } from './camps.service.js'

const createBody = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
})

const updateBody = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
})

export async function registerCampsRoutes(app: FastifyInstance) {
  // GET /camps
  app.get('/', { preHandler: [requireAdmin] }, async () => {
    return listCamps(app)
  })

  // POST /camps
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })

    const camp = await createCamp(app, {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
    })
    return reply.code(201).send(camp)
  })

  // GET /camps/:id
  app.get('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const camp = await getCampById(app, id)
    if (!camp) return reply.code(404).send({ error: 'Camp not found' })
    return camp
  })

  // PATCH /camps/:id
  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })

    const data: Partial<{ name: string; startDate: Date }> = {}
    if (parsed.data.name) data.name = parsed.data.name
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate)

    const camp = await updateCamp(app, id, data)
    if (!camp) return reply.code(404).send({ error: 'Camp not found' })
    return camp
  })

  // PATCH /camps/:id/archive  — архівує табір і проставляє endDate
  app.patch('/:id/archive', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const camp = await archiveCamp(app, id)
    if (!camp) return reply.code(404).send({ error: 'Camp not found' })
    return camp
  })
}

