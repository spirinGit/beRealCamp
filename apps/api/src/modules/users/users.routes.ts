import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../../lib/auth.js'
import {
  createUserAvatarUploadUrl,
  isAllowedAvatarType,
  isAvatarStorageConfigured,
} from '../../lib/r2-storage.js'
import { createUser, getUserById, listUsers, updateUser } from './users.service.js'

const createBody = z.object({
  campId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Administrator', 'Leader', 'Worker']),
})

const updateBody = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['Administrator', 'Leader', 'Worker']).optional(),
  photoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
})

export async function registerUsersRoutes(app: FastifyInstance) {
  // POST /users/avatar-upload-url
  app.post('/avatar-upload-url', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!isAvatarStorageConfigured()) return reply.code(503).send({ error: 'Avatar storage not configured' })
    const { contentType } = request.body as { contentType?: string }
    if (!contentType || !isAllowedAvatarType(contentType)) return reply.code(400).send({ error: 'Unsupported image type' })
    const { campId } = request.user
    return createUserAvatarUploadUrl({ campId, contentType })
  })
  // GET /users?campId=
  app.get('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { campId } = request.query as { campId?: string }
    if (!campId) return reply.code(400).send({ error: 'campId is required' })
    return listUsers(app, campId)
  })

  // POST /users
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })

    const user = await createUser(app, parsed.data)
    return reply.code(201).send(user)
  })

  // GET /users/:id
  app.get('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await getUserById(app, id)
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return user
  })

  // PATCH /users/:id  — редагування (ім'я, email, роль)
  app.patch('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = updateBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })

    const user = await updateUser(app, id, parsed.data)
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return user
  })

  // PATCH /users/:id/deactivate  — деактивація (BR-008)
  app.patch('/:id/deactivate', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await updateUser(app, id, { isActive: false })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return user
  })
}

