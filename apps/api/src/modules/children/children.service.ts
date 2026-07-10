import { and, eq, ilike, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { children, coinTransactions, squadLeaders } from '../../db/schema/index.js'

export async function listChildren(app: FastifyInstance, campId: string, squadId?: string) {
  const conditions = [eq(children.campId, campId)]
  if (squadId) conditions.push(eq(children.squadId, squadId))
  return app.db.select().from(children).where(and(...conditions)).orderBy(children.lastName)
}

// Лише діти з загонів лідера (BR-016)
export async function listChildrenForLeader(app: FastifyInstance, leaderId: string) {
  const leaderSquads = app.db
    .select({ squadId: squadLeaders.squadId })
    .from(squadLeaders)
    .where(eq(squadLeaders.leaderId, leaderId))

  return app.db
    .select()
    .from(children)
    .where(sql`${children.squadId} IN (${leaderSquads})`)
    .orderBy(children.lastName)
}

export async function getChildById(app: FastifyInstance, id: string) {
  const [child] = await app.db.select().from(children).where(eq(children.id, id)).limit(1)
  return child ?? null
}

export async function isLeaderOfSquad(
  app: FastifyInstance,
  leaderId: string,
  squadId: string,
): Promise<boolean> {
  const [entry] = await app.db
    .select()
    .from(squadLeaders)
    .where(and(eq(squadLeaders.leaderId, leaderId), eq(squadLeaders.squadId, squadId)))
    .limit(1)
  return !!entry
}

export async function createChild(
  app: FastifyInstance,
  data: {
    campId: string
    squadId: string
    firstName: string
    lastName: string
    parentName?: string
    photoUrl?: string
    dateOfBirth: string
    gender: string
    parentPhone?: string
    medicalNotes?: string
  },
) {
  const [child] = await app.db.insert(children).values(data).returning()
  return child
}

export async function updateChild(
  app: FastifyInstance,
  id: string,
  data: Partial<{
    squadId: string
    firstName: string
    lastName: string
    parentName: string
    photoUrl: string
    dateOfBirth: string
    gender: string
    parentPhone: string
    medicalNotes: string
  }>,
) {
  const [child] = await app.db.update(children).set(data).where(eq(children.id, id)).returning()
  return child ?? null
}

export async function deleteChild(app: FastifyInstance, id: string) {
  const [child] = await app.db.delete(children).where(eq(children.id, id)).returning()
  return child ?? null
}

export async function searchChildren(app: FastifyInstance, campId: string, q: string) {
  const pattern = `%${q}%`
  return app.db
    .select({
      id: children.id,
      campId: children.campId,
      squadId: children.squadId,
      firstName: children.firstName,
      lastName: children.lastName,
      photoUrl: children.photoUrl,
      dateOfBirth: children.dateOfBirth,
    })
    .from(children)
    .where(
      and(
        eq(children.campId, campId),
        or(ilike(children.firstName, pattern), ilike(children.lastName, pattern)),
      ),
    )
    .limit(50)
}

export async function getChildBalance(app: FastifyInstance, childId: string): Promise<number> {
  const [result] = await app.db
    .select({ balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions)
    .where(eq(coinTransactions.childId, childId))
  return Number(result?.balance ?? 0)
}
