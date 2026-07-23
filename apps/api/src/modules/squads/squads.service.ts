import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { squadLeaders, squads, users } from '../../db/schema/index.js'

export async function listSquads(app: FastifyInstance, campId: string) {
  return app.db.select().from(squads).where(eq(squads.campId, campId)).orderBy(squads.name)
}

// Лише загони, до яких призначено лідера (BR-016)
export async function listSquadsForLeader(app: FastifyInstance, leaderId: string) {
  return app.db
    .select({
      id: squads.id,
      campId: squads.campId,
      name: squads.name,
      color: squads.color,
      description: squads.description,
      schedule: squads.schedule,
      photoUrl: squads.photoUrl,
      createdAt: squads.createdAt,
    })
    .from(squads)
    .innerJoin(squadLeaders, eq(squadLeaders.squadId, squads.id))
    .where(eq(squadLeaders.leaderId, leaderId))
    .orderBy(squads.name)
}

export async function getSquadById(app: FastifyInstance, id: string) {
  const [squad] = await app.db.select().from(squads).where(eq(squads.id, id)).limit(1)
  return squad ?? null
}

export async function createSquad(
  app: FastifyInstance,
  data: { campId: string; name: string; color: string; description?: string; schedule?: string },
) {
  const [squad] = await app.db.insert(squads).values(data).returning()
  return squad
}

export async function updateSquad(
  app: FastifyInstance,
  id: string,
  data: Partial<{ name: string; color: string; description: string; schedule: string; photoUrl: string }>,
) {
  const [squad] = await app.db.update(squads).set(data).where(eq(squads.id, id)).returning()
  return squad ?? null
}

export async function isLeaderOfSquad(app: FastifyInstance, squadId: string, leaderId: string) {
  const [entry] = await app.db
    .select({ id: squadLeaders.id })
    .from(squadLeaders)
    .where(and(eq(squadLeaders.squadId, squadId), eq(squadLeaders.leaderId, leaderId)))
    .limit(1)
  return !!entry
}

export async function getSquadLeaders(app: FastifyInstance, squadId: string) {
  return app.db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(squadLeaders)
    .innerJoin(users, eq(users.id, squadLeaders.leaderId))
    .where(eq(squadLeaders.squadId, squadId))
}

export async function assignLeader(app: FastifyInstance, squadId: string, leaderId: string) {
  // onConflictDoNothing спрацює завдяки unique constraint
  const [entry] = await app.db
    .insert(squadLeaders)
    .values({ squadId, leaderId })
    .onConflictDoNothing()
    .returning()
  return entry ?? null
}

export async function removeLeader(app: FastifyInstance, squadId: string, leaderId: string) {
  const [entry] = await app.db
    .delete(squadLeaders)
    .where(and(eq(squadLeaders.squadId, squadId), eq(squadLeaders.leaderId, leaderId)))
    .returning()
  return entry ?? null
}
