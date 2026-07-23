import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { childAttendance, children, coinTransactions, squads } from '../../db/schema/index.js'

export async function getCampStats(app: FastifyInstance, campId: string) {
  const today = new Date().toISOString().slice(0, 10)
  const [[childrenRow], [squadsRow], [presentTodayRow], [earnedRow], [spentRow]] = await Promise.all([
    app.db
      .select({ count: sql<number>`count(*)` })
      .from(children)
      .where(eq(children.campId, campId)),

    app.db
      .select({ count: sql<number>`count(*)` })
      .from(squads)
      .where(eq(squads.campId, campId)),

    app.db
      .select({ count: sql<number>`count(*)` })
      .from(childAttendance)
      .innerJoin(children, eq(children.id, childAttendance.childId))
      .where(
        and(
          eq(children.campId, campId),
          eq(childAttendance.day, today),
          eq(childAttendance.isPresent, true),
        ),
      ),

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
    presentTodayCount: Number(presentTodayRow?.count ?? 0),
    totalEarned: Number(earnedRow?.total ?? 0),
    totalSpent: Number(spentRow?.total ?? 0),
  }
}

