import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { camps } from '../../db/schema/index.js'

export async function listCamps(app: FastifyInstance) {
  return app.db.select().from(camps).orderBy(camps.createdAt)
}

export async function getCampById(app: FastifyInstance, id: string) {
  const [camp] = await app.db.select().from(camps).where(eq(camps.id, id)).limit(1)
  return camp ?? null
}

export async function createCamp(
  app: FastifyInstance,
  data: { name: string; startDate: Date },
) {
  const [camp] = await app.db
    .insert(camps)
    .values({ name: data.name, startDate: data.startDate, status: 'active' })
    .returning()
  return camp
}

export async function updateCamp(
  app: FastifyInstance,
  id: string,
  data: Partial<{ name: string; startDate: Date }>,
) {
  const [camp] = await app.db.update(camps).set(data).where(eq(camps.id, id)).returning()
  return camp ?? null
}

export async function archiveCamp(app: FastifyInstance, id: string) {
  const [camp] = await app.db
    .update(camps)
    .set({ status: 'archived', endDate: new Date() })
    .where(eq(camps.id, id))
    .returning()
  return camp ?? null
}

