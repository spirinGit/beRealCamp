import { desc, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { auditLogs } from '../../db/schema/index.js'

export async function listAuditLogs(
  app: FastifyInstance,
  campId: string,
  limit = 500,
) {
  return app.db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.campId, campId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
}

