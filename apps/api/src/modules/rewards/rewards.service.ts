import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { rewardItems, rewards, rewardWorkers } from '../../db/schema/index.js'
import { users } from '../../db/schema/index.js'

// --- Точки обслуговування ---

export async function listRewards(app: FastifyInstance, campId: string) {
  return app.db.select().from(rewards).where(eq(rewards.campId, campId)).orderBy(rewards.name)
}

export async function getRewardById(app: FastifyInstance, id: string) {
  const [reward] = await app.db.select().from(rewards).where(eq(rewards.id, id)).limit(1)
  return reward ?? null
}

export async function getRewardWithItems(app: FastifyInstance, id: string) {
  const reward = await getRewardById(app, id)
  if (!reward) return null
  const items = await app.db
    .select()
    .from(rewardItems)
    .where(eq(rewardItems.rewardId, id))
    .orderBy(rewardItems.name)
  return { ...reward, items }
}

export async function getRewardWithWorkers(app: FastifyInstance, id: string) {
  const reward = await getRewardById(app, id)
  if (!reward) return null
  
  const workers = await app.db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      photoUrl: users.photoUrl,
    })
    .from(rewardWorkers)
    .innerJoin(users, eq(users.id, rewardWorkers.workerId))
    .where(eq(rewardWorkers.rewardId, id))
  
  const items = await app.db
    .select()
    .from(rewardItems)
    .where(eq(rewardItems.rewardId, id))
    .orderBy(rewardItems.name)
  
  return { ...reward, workers, items }
}

export async function listWorkerRewards(app: FastifyInstance, workerId: string) {
  const assignedRewards = await app.db
    .select({ id: rewards.id, campId: rewards.campId, name: rewards.name, description: rewards.description, photoUrl: rewards.photoUrl, isActive: rewards.isActive, createdAt: rewards.createdAt })
    .from(rewardWorkers)
    .innerJoin(rewards, eq(rewards.id, rewardWorkers.rewardId))
    .where(eq(rewardWorkers.workerId, workerId))
    .orderBy(rewards.name)

  const rewardsWithItems = await Promise.all(
    assignedRewards.map(async (reward) => {
      const items = await app.db
        .select()
        .from(rewardItems)
        .where(eq(rewardItems.rewardId, reward.id))
        .orderBy(rewardItems.name)

      return { ...reward, items }
    }),
  )

  return rewardsWithItems
}

export async function createReward(
  app: FastifyInstance,
  data: { campId: string; name: string; description?: string; photoUrl?: string },
) {
  const [reward] = await app.db.insert(rewards).values(data).returning()
  return reward
}

export async function updateReward(
  app: FastifyInstance,
  id: string,
  data: Partial<{ name: string; description: string; photoUrl: string; isActive: boolean }>,
) {
  const [reward] = await app.db.update(rewards).set(data).where(eq(rewards.id, id)).returning()
  return reward ?? null
}

export async function deleteReward(app: FastifyInstance, id: string) {
  const [reward] = await app.db.delete(rewards).where(eq(rewards.id, id)).returning()
  return reward ?? null
}

// --- Воркери для точки ---

export async function getRewardWorkers(app: FastifyInstance, rewardId: string) {
  return app.db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      photoUrl: users.photoUrl,
    })
    .from(rewardWorkers)
    .innerJoin(users, eq(users.id, rewardWorkers.workerId))
    .where(eq(rewardWorkers.rewardId, rewardId))
}

export async function assignWorkerToReward(app: FastifyInstance, rewardId: string, workerId: string) {
  const [entry] = await app.db
    .insert(rewardWorkers)
    .values({ rewardId, workerId })
    .onConflictDoNothing()
    .returning()
  return entry ?? null
}

export async function removeWorkerFromReward(app: FastifyInstance, rewardId: string, workerId: string) {
  const [entry] = await app.db
    .delete(rewardWorkers)
    .where(and(eq(rewardWorkers.rewardId, rewardId), eq(rewardWorkers.workerId, workerId)))
    .returning()
  return entry ?? null
}

export async function updateRewardWorkers(app: FastifyInstance, rewardId: string, workerIds: string[]) {
  // Видалити старих
  await app.db.delete(rewardWorkers).where(eq(rewardWorkers.rewardId, rewardId))
  
  // Додати нових
  if (workerIds.length > 0) {
    await app.db.insert(rewardWorkers).values(
      workerIds.map(workerId => ({ rewardId, workerId }))
    )
  }
}

// --- Позиції всередині точки ---

export async function listRewardItems(app: FastifyInstance, rewardId: string) {
  return app.db
    .select()
    .from(rewardItems)
    .where(eq(rewardItems.rewardId, rewardId))
    .orderBy(rewardItems.name)
}

export async function createRewardItem(
  app: FastifyInstance,
  data: { rewardId: string; name: string; price: number; photoUrl?: string },
) {
  const [item] = await app.db.insert(rewardItems).values(data).returning()
  return item
}

export async function updateRewardItem(
  app: FastifyInstance,
  id: string,
  data: Partial<{ name: string; price: number; isActive: boolean; photoUrl: string }>,
) {
  const [item] = await app.db.update(rewardItems).set(data).where(eq(rewardItems.id, id)).returning()
  return item ?? null
}
