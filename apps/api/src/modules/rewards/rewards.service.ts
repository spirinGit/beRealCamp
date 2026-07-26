import { and, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { rewardItems, rewards, rewardWorkers } from '../../db/schema/index.js'

// --- Точки обслуговування ---

export async function listRewards(app: FastifyInstance, campId: string) {
  const rows = await app.db.select().from(rewards).where(eq(rewards.campId, campId)).orderBy(rewards.name)
  if (rows.length === 0) return []
  const rewardIds = rows.map((r) => r.id)
  const workerRows = await app.db
    .select({ rewardId: rewardWorkers.rewardId, workerId: rewardWorkers.workerId })
    .from(rewardWorkers)
    .where(inArray(rewardWorkers.rewardId, rewardIds))
  const map = new Map<string, string[]>()
  for (const r of rows) map.set(r.id, [])
  for (const r of workerRows) map.get(r.rewardId)?.push(r.workerId)
  return rows.map((r) => ({ ...r, workerIds: map.get(r.id) ?? [] }))
}

export async function getRewardById(app: FastifyInstance, id: string) {
  const [reward] = await app.db.select().from(rewards).where(eq(rewards.id, id)).limit(1)
  return reward ?? null
}

export async function getRewardWithItems(app: FastifyInstance, id: string) {
  const reward = await getRewardById(app, id)
  if (!reward) return null
  const [items, workerRows] = await Promise.all([
    app.db.select().from(rewardItems).where(eq(rewardItems.rewardId, id)).orderBy(rewardItems.name),
    app.db.select({ workerId: rewardWorkers.workerId }).from(rewardWorkers).where(eq(rewardWorkers.rewardId, id)),
  ])
  return { ...reward, workerIds: workerRows.map((r) => r.workerId), items }
}

export async function listWorkerRewards(app: FastifyInstance, workerId: string) {
  const assignments = await app.db
    .select({ rewardId: rewardWorkers.rewardId })
    .from(rewardWorkers)
    .where(eq(rewardWorkers.workerId, workerId))

  if (assignments.length === 0) return []

  const rewardIds = assignments.map((a) => a.rewardId)
  const [assignedRewards, allWorkerRows] = await Promise.all([
    app.db.select().from(rewards).where(inArray(rewards.id, rewardIds)).orderBy(rewards.name),
    app.db
      .select({ rewardId: rewardWorkers.rewardId, workerId: rewardWorkers.workerId })
      .from(rewardWorkers)
      .where(inArray(rewardWorkers.rewardId, rewardIds)),
  ])

  const workerMap = new Map<string, string[]>()
  for (const id of rewardIds) workerMap.set(id, [])
  for (const r of allWorkerRows) workerMap.get(r.rewardId)?.push(r.workerId)

  const rewardsWithItems = await Promise.all(
    assignedRewards.map(async (reward) => {
      const items = await app.db
        .select()
        .from(rewardItems)
        .where(eq(rewardItems.rewardId, reward.id))
        .orderBy(rewardItems.name)
      return { ...reward, workerIds: workerMap.get(reward.id) ?? [], items }
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
  data: Partial<{ name: string; description: string; photoUrl: string; isActive: boolean; workerId: string | null }>,
) {
  const [reward] = await app.db.update(rewards).set(data).where(eq(rewards.id, id)).returning()
  return reward ?? null
}

export async function deleteReward(app: FastifyInstance, id: string) {
  const [reward] = await app.db.delete(rewards).where(eq(rewards.id, id)).returning()
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

export async function assignWorkerToReward(app: FastifyInstance, rewardId: string, workerId: string) {
  await app.db
    .insert(rewardWorkers)
    .values({ rewardId, workerId })
    .onConflictDoNothing()
}

export async function unassignWorkerFromReward(app: FastifyInstance, rewardId: string, workerId: string) {
  await app.db
    .delete(rewardWorkers)
    .where(and(eq(rewardWorkers.rewardId, rewardId), eq(rewardWorkers.workerId, workerId)))
}
