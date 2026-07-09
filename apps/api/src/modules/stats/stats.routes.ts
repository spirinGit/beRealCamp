import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../../lib/auth.js'
import { getCampStats } from './stats.service.js'

export async function registerStatsRoutes(app: FastifyInstance) {
  // GET /stats?campId=  — загальна статистика табору (BR-040)
  app.get('/', { preHandler: [requireAdmin] }, async (request) => {
    const { campId } = request.query as { campId?: string }
    return getCampStats(app, campId ?? request.user.campId)
  })
}

