import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'

export async function registerCorsPlugin(app: FastifyInstance) {
  await app.register(cors, {
    origin: true,
  })
}

