import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAdmin } from '../../lib/auth.js'
import { createCampPromoCode, listCampPromoCodes, redeemPromoCodeByChild } from './promo-codes.service.js'

const createBody = z.object({
  campId: z.string().uuid().optional(),
  rewardPoints: z.number().int().positive(),
})

const redeemBody = z.object({
  childId: z.string().uuid(),
  promoCode: z
    .string()
    .trim()
    .min(4)
    .max(16)
    .regex(/^[A-Za-z0-9]+$/),
})

export async function registerPromoCodesRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAdmin] }, async (request) => {
    const { campId } = request.query as { campId?: string }
    return listCampPromoCodes(app, campId ?? request.user.campId)
  })

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })

    const created = await createCampPromoCode(app, {
      campId: parsed.data.campId ?? request.user.campId,
      rewardPoints: parsed.data.rewardPoints,
      createdByUserId: request.user.userId,
    })

    return reply.code(201).send(created)
  })

  app.post('/public/:publicAccessCode/redeem', async (request, reply) => {
    const { publicAccessCode } = request.params as { publicAccessCode: string }
    const parsed = redeemBody.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })

    const result = await redeemPromoCodeByChild(app, {
      publicAccessCode,
      childId: parsed.data.childId,
      promoCode: parsed.data.promoCode,
    })

    if (!result.ok) {
      if (result.error === 'Camp not found' || result.error === 'Child not found' || result.error === 'Code not found') {
        return reply.code(404).send({ error: result.error })
      }
      return reply.code(422).send({ error: result.error })
    }

    return result
  })
}