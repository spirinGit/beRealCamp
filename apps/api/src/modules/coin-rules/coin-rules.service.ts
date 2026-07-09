import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { coinRules } from '../../db/schema/index.js'

export async function listCoinRules(app: FastifyInstance, campId: string) {
  return app.db
    .select()
    .from(coinRules)
    .where(eq(coinRules.campId, campId))
    .orderBy(coinRules.label)
}

export async function getCoinRuleById(app: FastifyInstance, id: string) {
  const [rule] = await app.db.select().from(coinRules).where(eq(coinRules.id, id)).limit(1)
  return rule ?? null
}

export async function createCoinRule(
  app: FastifyInstance,
  data: { campId: string; key: string; label: string; points: number },
) {
  const [rule] = await app.db.insert(coinRules).values(data).returning()
  return rule
}

export async function updateCoinRule(
  app: FastifyInstance,
  id: string,
  data: Partial<{ key: string; label: string; points: number; isActive: boolean }>,
) {
  const [rule] = await app.db.update(coinRules).set(data).where(eq(coinRules.id, id)).returning()
  return rule ?? null
}

