import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { children, coinTransactions, squads } from '../../db/schema/index.js'

export async function getCampStats(app: FastifyInstance, campId: string) {
  const [[childrenRow], [squadsRow], [earnedRow], [spentRow]] = await Promise.all([
    app.db
      .select({ count: sql<number>`count(*)` })
      .from(children)
      .where(eq(children.campId, campId)),

    app.db
      .select({ count: sql<number>`count(*)` })
      .from(squads)
      .where(eq(squads.campId, campId)),

    app.db
      .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
      .from(coinTransactions)
      .where(and(eq(coinTransactions.campId, campId), sql`${coinTransactions.amount} > 0`)),

    app.db
      .select({ total: sql<number>`coalesce(sum(abs(${coinTransactions.amount})), 0)` })
      .from(coinTransactions)
      .where(and(eq(coinTransactions.campId, campId), sql`${coinTransactions.amount} < 0`)),
  ])

  return {
    childrenCount: Number(childrenRow?.count ?? 0),
    squadsCount: Number(squadsRow?.count ?? 0),
    totalEarned: Number(earnedRow?.total ?? 0),
    totalSpent: Number(spentRow?.total ?? 0),
  }
}

