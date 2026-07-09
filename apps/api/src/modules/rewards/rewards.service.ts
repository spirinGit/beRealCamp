import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { rewardItems, rewards } from '../../db/schema/index.js'

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

export async function getWorkerReward(app: FastifyInstance, workerId: string) {
  const [reward] = await app.db
    .select()
    .from(rewards)
    .where(eq(rewards.workerId, workerId))
    .limit(1)
  if (!reward) return null
  const items = await app.db
    .select()
    .from(rewardItems)
    .where(eq(rewardItems.rewardId, reward.id))
    .orderBy(rewardItems.name)
  return { ...reward, items }
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
  data: Partial<{ name: string; description: string; photoUrl: string; isActive: boolean; workerId: string | null }>,
) {
  const [reward] = await app.db.update(rewards).set(data).where(eq(rewards.id, id)).returning()
  return reward ?? null
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
  data: { rewardId: string; name: string; price: number },
) {
  const [item] = await app.db.insert(rewardItems).values(data).returning()
  return item
}

export async function updateRewardItem(
  app: FastifyInstance,
  id: string,
  data: Partial<{ name: string; price: number; isActive: boolean }>,
) {
  const [item] = await app.db.update(rewardItems).set(data).where(eq(rewardItems.id, id)).returning()
  return item ?? null
}

