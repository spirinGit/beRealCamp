import type { FastifyInstance } from 'fastify'
import { db, sql } from '../db/client.js'

export async function registerDbPlugin(app: FastifyInstance) {
  app.decorate('db', db)

  app.addHook('onClose', async () => {
    await sql.end()
  })
}

