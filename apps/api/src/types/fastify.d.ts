import type { db } from '../db/client.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string
      role: 'Administrator' | 'Leader' | 'Worker'
      campId: string
    }
    user: {
      userId: string
      role: 'Administrator' | 'Leader' | 'Worker'
      campId: string
    }
  }
}

