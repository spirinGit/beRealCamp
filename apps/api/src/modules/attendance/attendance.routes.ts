import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdminOrLeader } from '../../lib/auth.js'
import { getChildById, isLeaderOfSquad } from '../children/children.service.js'
import { markChildAttendance, getSquadAttendanceOverview } from './attendance.service.js'

const markAttendanceBody = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isPresent: z.boolean(),
})

export async function registerAttendanceRoutes(app: FastifyInstance) {
  app.get('/squads/:squadId', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { squadId } = request.params as { squadId: string }

    if (request.user.role === 'Leader') {
      const allowed = await isLeaderOfSquad(app, request.user.userId, squadId)
      if (!allowed) {
        return reply.code(403).send({ error: 'You can only view attendance for your squads' })
      }
    }

    const overview = await getSquadAttendanceOverview(app, squadId)
    if (!overview) return reply.code(404).send({ error: 'Squad not found' })
    return overview
  })

  app.post('/children/:childId', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const { childId } = request.params as { childId: string }
    const parsed = markAttendanceBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    if (request.user.role === 'Leader') {
      const child = await getChildById(app, childId)
      if (!child) return reply.code(404).send({ error: 'Child not found' })

      const allowed = await isLeaderOfSquad(app, request.user.userId, child.squadId)
      if (!allowed) {
        return reply.code(403).send({ error: 'You can only mark attendance for your squads' })
      }
    }

    const result = await markChildAttendance(app, {
      childId,
      day: parsed.data.day,
      isPresent: parsed.data.isPresent,
      markedByUserId: request.user.userId,
    })

    if (!result.ok) {
      const code = result.error === 'Child not found' || result.error === 'Camp not found' ? 404 : 422
      return reply.code(code).send({ error: result.error })
    }

    return reply.code(201).send(result.attendance)
  })
}
