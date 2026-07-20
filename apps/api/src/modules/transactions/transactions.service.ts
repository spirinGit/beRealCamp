import { and, desc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { children, coinTransactions, squadLeaders } from '../../db/schema/index.js'

export async function getChildBalance(app: FastifyInstance, childId: string): Promise<number> {
  const [result] = await app.db
    .select({ balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions)
    .where(eq(coinTransactions.childId, childId))
  return Number(result?.balance ?? 0)
}

// Перевіряє, чи лідер має доступ до дитини (перевіряємо загін дитини)
export async function leaderCanAccessChild(
  app: FastifyInstance,
  leaderId: string,
  childId: string,
): Promise<boolean> {
  const [child] = await app.db
    .select({ squadId: children.squadId })
    .from(children)
    .where(eq(children.id, childId))
    .limit(1)
  if (!child) return false

  const [entry] = await app.db
    .select()
    .from(squadLeaders)
    .where(and(eq(squadLeaders.leaderId, leaderId), eq(squadLeaders.squadId, child.squadId)))
    .limit(1)
  return !!entry
}

export async function listTransactions(
  app: FastifyInstance,
  campId: string,
  childId?: string,
) {
  const conditions = [eq(coinTransactions.campId, campId)]
  if (childId) conditions.push(eq(coinTransactions.childId, childId))

  return app.db
    .select()
    .from(coinTransactions)
    .where(and(...conditions))
    .orderBy(desc(coinTransactions.createdAt))
    .limit(200)
}

export async function earnTalents(
  app: FastifyInstance,
  data: {
    campId: string
    childId: string
    actorUserId: string
    amount: number
    reason: string
    comment?: string
    metadata?: Record<string, unknown>
  },
) {
  const [tx] = await app.db
    .insert(coinTransactions)
    .values({
      campId: data.campId,
      childId: data.childId,
      actorUserId: data.actorUserId,
      type: 'earn',
      amount: Math.abs(data.amount), // завжди додатні
      reason: data.reason,
      comment: data.comment ?? null,
      metadata: data.metadata ?? {},
    })
    .returning()
  return tx
}

export async function spendTalents(
  app: FastifyInstance,
  data: {
    campId: string
    childId: string
    actorUserId: string
    amount: number
    reason: string
    comment?: string
    metadata?: Record<string, unknown>
  },
): Promise<{ ok: true; tx: typeof coinTransactions.$inferSelect } | { ok: false; error: string }> {
  const balance = await getChildBalance(app, data.childId)

  if (balance < data.amount) {
    return { ok: false, error: 'Insufficient balance' }
  }

  const [tx] = await app.db
    .insert(coinTransactions)
    .values({
      campId: data.campId,
      childId: data.childId,
      actorUserId: data.actorUserId,
      type: 'spend',
      amount: -Math.abs(data.amount), // завжди відемне
      reason: data.reason,
      comment: data.comment ?? null,
      metadata: data.metadata ?? {},
    })
    .returning()
  return { ok: true, tx }
}

