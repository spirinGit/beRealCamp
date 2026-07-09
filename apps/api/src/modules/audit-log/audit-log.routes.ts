import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../../lib/auth.js'
import { listAuditLogs } from './audit-log.service.js'

export async function registerAuditLogRoutes(app: FastifyInstance) {
  // GET /audit-log?campId=  — журнал всіх дій (BR-035)
  app.get('/', { preHandler: [requireAdmin] }, async (request) => {
    const { campId } = request.query as { campId?: string }
    return listAuditLogs(app, campId ?? request.user.campId)
  })
}

