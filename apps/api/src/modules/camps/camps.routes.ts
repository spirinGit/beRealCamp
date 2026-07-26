import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin } from '../../lib/auth.js'
import {
  archiveCamp,
  createCamp,
  ensureCampPublicAccessCode,
  getCampById,
  getPublicChildProfile,
  listCamps,
  listPublicSquadChildren,
  listPublicSquads,
  listPublicShopItems,
  searchPublicChildren,
  updateCamp,
} from './camps.service.js'

const createBody = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

const updateBody = z.object({
  name: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  childGuidelines: z.string().max(8000).optional(),
})

export async function registerCampsRoutes(app: FastifyInstance) {
  // GET /camps/public/:code
  app.get('/public/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const result = await listPublicSquads(app, code)
    if (!result) return reply.code(404).send({ error: 'Camp not found' })
    return result
  })

  // GET /camps/public/:code/squads/:squadId/children
  app.get('/public/:code/squads/:squadId/children', async (request, reply) => {
    const { code, squadId } = request.params as { code: string; squadId: string }
    const result = await listPublicSquadChildren(app, code, squadId)
    if (!result) return reply.code(404).send({ error: 'Camp not found' })
    if (!result.squad) return reply.code(404).send({ error: 'Squad not found' })
    return result
  })

  // GET /camps/public/:code/children?q=
  app.get('/public/:code/children', async (request, reply) => {
    const { code } = request.params as { code: string }
    const { q } = request.query as { q?: string }
    if (!q) return reply.code(400).send({ error: 'q is required' })
    const result = await searchPublicChildren(app, code, q)
    if (!result) return reply.code(404).send({ error: 'Camp not found' })
    return result
  })

  // GET /camps/public/:code/children/:childId
  app.get('/public/:code/children/:childId', async (request, reply) => {
    const { code, childId } = request.params as { code: string; childId: string }
    const result = await getPublicChildProfile(app, code, childId)
    if (!result) return reply.code(404).send({ error: 'Camp not found' })
    if (!result.child) return reply.code(404).send({ error: 'Child not found' })
    return result
  })

  // GET /camps/public/:code/shop
  app.get('/public/:code/shop', async (request, reply) => {
    const { code } = request.params as { code: string }
    const result = await listPublicShopItems(app, code)
    if (!result) return reply.code(404).send({ error: 'Camp not found' })
    return result
  })

  // GET /camps
  app.get('/', { preHandler: [requireAdmin] }, async () => {
    return listCamps(app)
  })

  // GET /camps/current/public-code - для лідерів
  app.get('/current/public-code', { preHandler: [authenticate] }, async (request) => {
    const campId = request.user?.campId
    if (!campId) {
      return { error: 'No camp assigned' }
    }
    const camp = await getCampById(app, campId)
    if (!camp) {
      return { error: 'Camp not found' }
    }
    return {
      id: camp.id,
      publicAccessCode: camp.publicAccessCode,
    }
  })

  // POST /camps
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })

    const camp = await createCamp(app, {
      name: parsed.data.name,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
    })
    return reply.code(201).send(camp)
  })

  // POST /camps/:id/public-link
  app.post('/:id/public-link', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const camp = await ensureCampPublicAccessCode(app, id)
    if (!camp) return reply.code(404).send({ error: 'Camp not found' })
    return {
      id: camp.id,
      name: camp.name,
      publicAccessCode: camp.publicAccessCode,
    }
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

    const data: Partial<{ name: string; startDate: Date; endDate: Date; childGuidelines: string | null }> = {}
    if (parsed.data.name) data.name = parsed.data.name
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate)
    if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate)
    if (parsed.data.childGuidelines !== undefined) {
      const trimmed = parsed.data.childGuidelines.trim()
      data.childGuidelines = trimmed.length ? trimmed : null
    }

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
