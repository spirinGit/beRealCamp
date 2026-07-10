import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin, requireWorkerRole } from '../../lib/auth.js'
import {
  createReward,
  createRewardItem,
  getRewardById,
  getRewardWithItems,
  listWorkerRewards,
  listRewards,
  updateReward,
  updateRewardItem,
} from './rewards.service.js'

const createRewardBody = z.object({
  campId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

const updateRewardBody = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
})

const assignWorkerBody = z.object({
  workerId: z.string().uuid().nullable(),
})

const createItemBody = z.object({
  name: z.string().min(1),
  price: z.number().int().positive(),
})

const updateItemBody = z.object({
  name: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export async function registerRewardsRoutes(app: FastifyInstance) {
  // GET /rewards?campId=  — список точок
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const { campId } = request.query as { campId?: string }
    return listRewards(app, campId ?? request.user.campId)
  })

  // GET /rewards/mine  — своя точка + позиції (для Worker)
  app.get('/mine', { preHandler: [requireWorkerRole] }, async (request, reply) => {
    const rewards = await listWorkerRewards(app, request.user.userId)
    if (rewards.length === 0) return reply.code(404).send({ error: 'No shop assigned to you' })
    return rewards
  })

  // GET /rewards/:id  — точка + позиції
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const reward = await getRewardWithItems(app, id)
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    return reward
  })

  // POST /rewards  — Admin створює точку
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createRewardBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    const reward = await createReward(app, parsed.data)
    return reply.code(201).send(reward)
  })

  // PATCH /rewards/:id  — Admin редагує точку
  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateRewardBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const reward = await updateReward(app, id, parsed.data)
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    return reward
  })

  // POST /rewards/:id/assign  — Admin призначає Worker до точки
  app.post('/:id/assign', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = assignWorkerBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const reward = await updateReward(app, id, { workerId: parsed.data.workerId })
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    return reward
  })

  // GET /rewards/:id/items  — позиції в точці
  // POST /rewards/:id/items  — Admin додає позицію (напр. Морозиво 500)
  app.post('/:id/items', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = createItemBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    const item = await createRewardItem(app, { rewardId: id, ...parsed.data })
    return reply.code(201).send(item)
  })

  // PATCH /rewards/:id/items/:itemId  — Admin редагує / вмикає позицію
  app.patch('/:id/items/:itemId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { itemId } = request.params as { id: string; itemId: string }
    const parsed = updateItemBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const item = await updateRewardItem(app, itemId, parsed.data)
    if (!item) return reply.code(404).send({ error: 'Item not found' })
    return item
  })
}
