import { and, desc, eq, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { children, coinTransactions, squadLeaders, users } from '../../db/schema/index.js'

function isUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'
}

async function findTransactionByClientRequestId(db: any, clientRequestId: string) {
  const [existing] = await db
    .select()
    .from(coinTransactions)
    .where(eq(coinTransactions.clientRequestId, clientRequestId))
    .limit(1)

  return existing ?? null
}

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
    .select({
      id: coinTransactions.id,
      campId: coinTransactions.campId,
      childId: coinTransactions.childId,
      actorUserId: coinTransactions.actorUserId,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
      type: coinTransactions.type,
      amount: coinTransactions.amount,
      reason: coinTransactions.reason,
      comment: coinTransactions.comment,
      metadata: coinTransactions.metadata,
      createdAt: coinTransactions.createdAt,
    })
    .from(coinTransactions)
    .leftJoin(users, eq(users.id, coinTransactions.actorUserId))
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
    clientRequestId?: string
    metadata?: Record<string, unknown>
  },
) {
  if (data.clientRequestId) {
    const existing = await findTransactionByClientRequestId(app.db, data.clientRequestId)
    if (existing) return existing
  }

  try {
    const [tx] = await app.db
      .insert(coinTransactions)
      .values({
        campId: data.campId,
        childId: data.childId,
        actorUserId: data.actorUserId,
        type: 'earn',
        amount: Math.abs(data.amount),
        reason: data.reason,
        comment: data.comment ?? null,
        clientRequestId: data.clientRequestId ?? null,
        metadata: data.metadata ?? {},
      })
      .returning()
    return tx
  } catch (error) {
    if (data.clientRequestId && isUniqueViolation(error)) {
      const existing = await findTransactionByClientRequestId(app.db, data.clientRequestId)
      if (existing) return existing
    }
    throw error
  }
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
    clientRequestId?: string
    metadata?: Record<string, unknown>
  },
): Promise<{ ok: true; tx: typeof coinTransactions.$inferSelect } | { ok: false; error: string }> {
  return app.db.transaction(async (tx) => {
    const lockResult = await tx.execute(sql`select id from ${children} where ${children.id} = ${data.childId} for update`)
    if (lockResult.length === 0) {
      return { ok: false as const, error: 'Child not found' }
    }

    if (data.clientRequestId) {
      const existing = await findTransactionByClientRequestId(tx, data.clientRequestId)
      if (existing) return { ok: true as const, tx: existing }
    }

    const [balanceRow] = await tx
      .select({ balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
      .from(coinTransactions)
      .where(eq(coinTransactions.childId, data.childId))

    const balance = Number(balanceRow?.balance ?? 0)
    if (balance < data.amount) {
      return { ok: false as const, error: 'Insufficient balance' }
    }

    try {
      const [createdTx] = await tx
        .insert(coinTransactions)
        .values({
          campId: data.campId,
          childId: data.childId,
          actorUserId: data.actorUserId,
          type: 'spend',
          amount: -Math.abs(data.amount),
          reason: data.reason,
          comment: data.comment ?? null,
          clientRequestId: data.clientRequestId ?? null,
          metadata: data.metadata ?? {},
        })
        .returning()

      return { ok: true as const, tx: createdTx }
    } catch (error) {
      if (data.clientRequestId && isUniqueViolation(error)) {
        const existing = await findTransactionByClientRequestId(tx, data.clientRequestId)
        if (existing) return { ok: true as const, tx: existing }
      }
      throw error
    }
  })
}

export async function bulkEarnTalents(
  app: FastifyInstance,
  data: {
    campId: string
    childIds: string[]
    actorUserId: string
    amount: number
    reason: string
    comment?: string
    clientRequestId?: string
    metadata?: Record<string, unknown>
  },
): Promise<{ ok: true; count: number } | { ok: false; error: string; failedChildId?: string }> {
  return app.db.transaction(async (tx) => {
    const results = []

    for (const childId of data.childIds) {
      if (data.clientRequestId) {
        const existing = await findTransactionByClientRequestId(tx, data.clientRequestId)
        if (existing) {
          results.push(existing)
          continue
        }
      }

      try {
        const [createdTx] = await tx
          .insert(coinTransactions)
          .values({
            campId: data.campId,
            childId,
            actorUserId: data.actorUserId,
            type: 'earn',
            amount: Math.abs(data.amount),
            reason: data.reason,
            comment: data.comment ?? null,
            clientRequestId: data.clientRequestId ? `${data.clientRequestId}:${childId}` : null,
            metadata: data.metadata ?? {},
          })
          .returning()
        results.push(createdTx)
      } catch (error) {
        if (data.clientRequestId && isUniqueViolation(error)) {
          const existing = await findTransactionByClientRequestId(tx, data.clientRequestId)
          if (existing) {
            results.push(existing)
            continue
          }
        }
        return { ok: false as const, error: `Failed to earn for child: ${error instanceof Error ? error.message : 'Unknown error'}`, failedChildId: childId }
      }
    }

    return { ok: true as const, count: results.length }
  })
}

export async function bulkSpendTalents(
  app: FastifyInstance,
  data: {
    campId: string
    childIds: string[]
    actorUserId: string
    amount: number
    reason: string
    comment?: string
    clientRequestId?: string
    metadata?: Record<string, unknown>
  },
): Promise<{ ok: true; count: number } | { ok: false; error: string; failedChildId?: string }> {
  return app.db.transaction(async (tx) => {
    const results = []

    for (const childId of data.childIds) {
      // Lock child row for update
      const lockResult = await tx.execute(sql`select id from ${children} where ${children.id} = ${childId} for update`)
      if (lockResult.length === 0) {
        return { ok: false as const, error: 'Child not found', failedChildId: childId }
      }

      if (data.clientRequestId) {
        const existing = await findTransactionByClientRequestId(tx, data.clientRequestId)
        if (existing) {
          results.push(existing)
          continue
        }
      }

      // Check balance
      const [balanceRow] = await tx
        .select({ balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
        .from(coinTransactions)
        .where(eq(coinTransactions.childId, childId))

      const balance = Number(balanceRow?.balance ?? 0)
      if (balance < data.amount) {
        return { ok: false as const, error: `Insufficient balance for child. Current: ${balance}, Required: ${data.amount}`, failedChildId: childId }
      }

      try {
        const [createdTx] = await tx
          .insert(coinTransactions)
          .values({
            campId: data.campId,
            childId,
            actorUserId: data.actorUserId,
            type: 'spend',
            amount: -Math.abs(data.amount),
            reason: data.reason,
            comment: data.comment ?? null,
            clientRequestId: data.clientRequestId ? `${data.clientRequestId}:${childId}` : null,
            metadata: data.metadata ?? {},
          })
          .returning()
        results.push(createdTx)
      } catch (error) {
        if (data.clientRequestId && isUniqueViolation(error)) {
          const existing = await findTransactionByClientRequestId(tx, data.clientRequestId)
          if (existing) {
            results.push(existing)
            continue
          }
        }
        return { ok: false as const, error: `Failed to spend for child: ${error instanceof Error ? error.message : 'Unknown error'}`, failedChildId: childId }
      }
    }

    return { ok: true as const, count: results.length }
  })
}

