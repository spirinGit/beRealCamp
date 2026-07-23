import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { camps, children, coinTransactions, promoCodes } from '../../db/schema/index.js'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function createRandomCode(length = 8) {
  let result = ''
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length)
    result += CODE_ALPHABET[index]
  }
  return result
}

async function createUniqueCode(db: FastifyInstance['db']) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = createRandomCode(8)
    const [existing] = await db
      .select({ id: promoCodes.id })
      .from(promoCodes)
      .where(eq(promoCodes.code, candidate))
      .limit(1)

    if (!existing) return candidate
  }

  throw new Error('Failed to generate unique promo code')
}

export async function listCampPromoCodes(app: FastifyInstance, campId: string) {
  return app.db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      rewardPoints: promoCodes.rewardPoints,
      activatedByChildId: promoCodes.activatedByChildId,
      activatedAt: promoCodes.activatedAt,
      createdAt: promoCodes.createdAt,
      activatedChildFirstName: children.firstName,
      activatedChildLastName: children.lastName,
    })
    .from(promoCodes)
    .leftJoin(children, eq(children.id, promoCodes.activatedByChildId))
    .where(eq(promoCodes.campId, campId))
    .orderBy(desc(promoCodes.createdAt))
}

export async function createCampPromoCode(
  app: FastifyInstance,
  args: { campId: string; rewardPoints: number; createdByUserId: string },
) {
  const code = await createUniqueCode(app.db)
  const [created] = await app.db
    .insert(promoCodes)
    .values({
      campId: args.campId,
      code,
      rewardPoints: args.rewardPoints,
      createdByUserId: args.createdByUserId,
    })
    .returning()

  return created
}

export async function redeemPromoCodeByChild(
  app: FastifyInstance,
  args: { publicAccessCode: string; childId: string; promoCode: string },
) {
  const normalizedCode = args.promoCode.trim().toUpperCase()

  const [camp] = await app.db
    .select({ id: camps.id })
    .from(camps)
    .where(eq(camps.publicAccessCode, args.publicAccessCode))
    .limit(1)

  if (!camp) return { ok: false as const, error: 'Camp not found' }

  const [child] = await app.db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.id, args.childId), eq(children.campId, camp.id)))
    .limit(1)

  if (!child) return { ok: false as const, error: 'Child not found' }

  return app.db.transaction(async (tx) => {
    const [activated] = await tx
      .update(promoCodes)
      .set({ activatedByChildId: child.id, activatedAt: new Date() })
      .where(
        and(
          eq(promoCodes.campId, camp.id),
          eq(promoCodes.code, normalizedCode),
          isNull(promoCodes.activatedAt),
        ),
      )
      .returning({ id: promoCodes.id, rewardPoints: promoCodes.rewardPoints, code: promoCodes.code })

    if (!activated) {
      const [existing] = await tx
        .select({ id: promoCodes.id, activatedAt: promoCodes.activatedAt })
        .from(promoCodes)
        .where(and(eq(promoCodes.campId, camp.id), eq(promoCodes.code, normalizedCode)))
        .limit(1)

      if (!existing) return { ok: false as const, error: 'Code not found' }
      return { ok: false as const, error: 'Code already activated' }
    }

    await tx.insert(coinTransactions).values({
      campId: camp.id,
      childId: child.id,
      actorUserId: null,
      type: 'earn',
      amount: Math.abs(activated.rewardPoints),
      reason: `Бонус-код ${activated.code}`,
      comment: null,
      metadata: {
        promoCodeId: activated.id,
        promoCode: activated.code,
      },
    })

    const [balanceRow] = await tx
      .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
      .from(coinTransactions)
      .where(and(eq(coinTransactions.childId, child.id), eq(coinTransactions.campId, camp.id)))

    return {
      ok: true as const,
      code: activated.code,
      pointsAwarded: Math.abs(activated.rewardPoints),
      balance: Number(balanceRow?.total ?? 0),
    }
  })
}