import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authenticate, requireAdminOrLeader, requireRole } from '../../lib/auth.js'
import {
  earnTalents,
  leaderCanAccessChild,
  listTransactions,
  spendTalents,
} from './transactions.service.js'

const earnBody = z.object({
  campId: z.string().uuid(),
  childId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
  comment: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const spendBody = z.object({
  campId: z.string().uuid(),
  childId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1),
  comment: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const requireSpendRole = requireRole('Worker', 'Administrator', 'Leader')

export async function registerTransactionsRoutes(app: FastifyInstance) {
  // GET /transactions?campId=&childId=  — журнал (BR-034)
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { campId, childId } = request.query as { campId?: string; childId?: string }
    const effectiveCampId = campId ?? request.user.campId
    return listTransactions(app, effectiveCampId, childId)
  })

  // POST /transactions/earn  — Leader нараховує таланти (BR-021)
  app.post('/earn', { preHandler: [requireAdminOrLeader] }, async (request, reply) => {
    const parsed = earnBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { role, userId } = request.user

    // Leader може нараховувати лише дітям з свого загону
    if (role === 'Leader') {
      const allowed = await leaderCanAccessChild(app, userId, parsed.data.childId)
      if (!allowed) {
        return reply.code(403).send({ error: 'You can only award talents to children in your squads' })
      }
    }

    const tx = await earnTalents(app, { ...parsed.data, actorUserId: userId })
    return reply.code(201).send(tx)
  })

  // POST /transactions/spend  — Worker/Admin/Leader списує таланти (BR-028, BR-030)
  app.post('/spend', { preHandler: [requireSpendRole] }, async (request, reply) => {
    const parsed = spendBody.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }

    const { role, userId } = request.user

    // Leader може списувати лише дітям зі своїх загонів
    if (role === 'Leader') {
      const allowed = await leaderCanAccessChild(app, userId, parsed.data.childId)
      if (!allowed) {
        return reply.code(403).send({ error: 'You can only spend talents for children in your squads' })
      }
    }

    const result = await spendTalents(app, {
      ...parsed.data,
      actorUserId: userId,
    })

    if (!result.ok) {
      // BR-030: баланс не може стати від'ємним
      return reply.code(422).send({ error: result.error })
    }

    return reply.code(201).send(result.tx)
  })
}
