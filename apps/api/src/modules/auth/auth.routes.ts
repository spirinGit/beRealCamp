import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../lib/auth.js'
import { loginUser } from './auth.service.js'

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function registerAuthRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const parsed = loginBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })

    const result = await loginUser(app, parsed.data.email, parsed.data.password)
    if (!result) return reply.code(401).send({ error: 'Invalid credentials' })

    return result
  })

  // GET /auth/me  (requires JWT)
  app.get('/me', { preHandler: [authenticate] }, async (request) => {
    return request.user
  })
}

