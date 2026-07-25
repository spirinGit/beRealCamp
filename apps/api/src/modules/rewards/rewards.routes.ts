import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdmin, requireWorkerRole } from '../../lib/auth.js'
import {
  createRewardAvatarUploadUrl,
  createRewardItemAvatarUploadUrl,
  isAllowedAvatarType,
  isAvatarStorageConfigured,
} from '../../lib/r2-storage.js'
import {
  createReward,
  createRewardItem,
  deleteReward,
  getRewardById,
  getRewardWithItems,
  getRewardWithWorkers,
  listWorkerRewards,
  listRewards,
  updateReward,
  updateRewardItem,
  getRewardWorkers,
  assignWorkerToReward,
  removeWorkerFromReward,
  updateRewardWorkers,
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

const assignWorkersBody = z.object({
  workerIds: z.array(z.string().uuid()),
})

const createItemBody = z.object({
  name: z.string().min(1),
  price: z.number().int().positive(),
  photoUrl: z.string().url().optional(),
})

const updateItemBody = z.object({
  name: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
})

export async function registerRewardsRoutes(app: FastifyInstance) {
  // POST /rewards/avatar-upload-url
  app.post('/avatar-upload-url', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!isAvatarStorageConfigured()) return reply.code(503).send({ error: 'Avatar storage not configured' })
    const { contentType } = request.body as { contentType?: string }
    if (!contentType || !isAllowedAvatarType(contentType)) return reply.code(400).send({ error: 'Unsupported image type' })
    return createRewardAvatarUploadUrl({ campId: request.user.campId, contentType })
  })

  // POST /rewards/items/avatar-upload-url
  app.post('/items/avatar-upload-url', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!isAvatarStorageConfigured()) return reply.code(503).send({ error: 'Avatar storage not configured' })
    const { contentType } = request.body as { contentType?: string }
    if (!contentType || !isAllowedAvatarType(contentType)) return reply.code(400).send({ error: 'Unsupported image type' })
    return createRewardItemAvatarUploadUrl({ campId: request.user.campId, contentType })
  })

  // GET /rewards?campId=  — список точок
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const { campId } = request.query as { campId?: string }
    return listRewards(app, campId ?? request.user.campId)
  })

  // GET /rewards/mine  — свої точки + позиції (для Worker)
  app.get('/mine', { preHandler: [requireWorkerRole] }, async (request, reply) => {
    const rewards = await listWorkerRewards(app, request.user.userId)
    if (rewards.length === 0) return reply.code(404).send({ error: 'No shop assigned to you' })
    return rewards
  })

  // GET /rewards/:id  — точка + позиції + воркери
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const reward = await getRewardWithWorkers(app, id)
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

  // DELETE /rewards/:id
  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const reward = await deleteReward(app, id)
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    return { message: 'Reward deleted' }
  })

  // POST /rewards/:id/assign-workers  — Admin призначає воркерів до точки
  app.post('/:id/assign-workers', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = assignWorkersBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    
    const reward = await getRewardById(app, id)
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    
    await updateRewardWorkers(app, id, parsed.data.workerIds)
    const workers = await getRewardWorkers(app, id)
    
    return { ...reward, workers }
  })

  // POST /rewards/:id/workers/:workerId  — Додати одного воркера
  app.post('/:id/workers/:workerId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, workerId } = request.params as { id: string; workerId: string }
    
    const reward = await getRewardById(app, id)
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    
    const result = await assignWorkerToReward(app, id, workerId)
    if (!result) return reply.code(400).send({ error: 'Worker already assigned to this reward' })
    
    return { message: 'Worker assigned' }
  })

  // DELETE /rewards/:id/workers/:workerId  — Видалити одного воркера
  app.delete('/:id/workers/:workerId', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id, workerId } = request.params as { id: string; workerId: string }
    
    const reward = await getRewardById(app, id)
    if (!reward) return reply.code(404).send({ error: 'Reward not found' })
    
    await removeWorkerFromReward(app, id, workerId)
    return { message: 'Worker removed' }
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
