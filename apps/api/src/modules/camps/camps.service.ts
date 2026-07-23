import { randomUUID } from 'node:crypto'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import {
  camps,
  children,
  coinRules,
  coinTransactions,
  rewardItems,
  rewards,
  squadLeaders,
  squads,
  users,
} from '../../db/schema/index.js'

export async function listCamps(app: FastifyInstance) {
  return app.db.select().from(camps).orderBy(camps.createdAt)
}

export async function getCampById(app: FastifyInstance, id: string) {
  const [camp] = await app.db.select().from(camps).where(eq(camps.id, id)).limit(1)
  return camp ?? null
}

export async function getCampByPublicAccessCode(app: FastifyInstance, publicAccessCode: string) {
  const [camp] = await app.db
    .select()
    .from(camps)
    .where(eq(camps.publicAccessCode, publicAccessCode))
    .limit(1)
  return camp ?? null
}

export async function createCamp(
  app: FastifyInstance,
  data: { name: string; startDate: Date; endDate: Date },
) {
  const [camp] = await app.db
    .insert(camps)
    .values({ name: data.name, startDate: data.startDate, endDate: data.endDate, status: 'active' })
    .returning()
  return camp
}

export async function updateCamp(
  app: FastifyInstance,
  id: string,
  data: Partial<{
    name: string
    publicAccessCode: string | null
    childGuidelines: string | null
    startDate: Date
    endDate: Date
  }>,
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

function createPublicAccessCode() {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

export async function ensureCampPublicAccessCode(app: FastifyInstance, id: string) {
  const existing = await getCampById(app, id)
  if (!existing) return null
  if (existing.publicAccessCode) return existing

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const publicAccessCode = createPublicAccessCode()
    const [conflict] = await app.db
      .select({ id: camps.id })
      .from(camps)
      .where(eq(camps.publicAccessCode, publicAccessCode))
      .limit(1)

    if (conflict) continue

    const [updated] = await app.db
      .update(camps)
      .set({ publicAccessCode })
      .where(eq(camps.id, id))
      .returning()

    if (updated) return updated
  }

  throw new Error('Failed to generate unique public access code for camp')
}

async function getBalancesMap(app: FastifyInstance, childIds: string[]) {
  if (childIds.length === 0) return new Map<string, number>()

  const rows = await app.db
    .select({
      childId: coinTransactions.childId,
      balance: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)`,
    })
    .from(coinTransactions)
    .where(inArray(coinTransactions.childId, childIds))
    .groupBy(coinTransactions.childId)

  return new Map(rows.map((row) => [row.childId, Number(row.balance ?? 0)]))
}

function toPublicCampSummary(camp: typeof camps.$inferSelect) {
  return {
    id: camp.id,
    name: camp.name,
    startDate: camp.startDate,
    endDate: camp.endDate,
    status: camp.status,
    publicAccessCode: camp.publicAccessCode,
    childGuidelines: camp.childGuidelines,
  }
}

async function getPublicSquadLeadersMap(app: FastifyInstance, squadIds: string[]) {
  if (squadIds.length === 0) {
    return new Map<string, Array<{ id: string; firstName: string; lastName: string; photoUrl: string | null }>>()
  }

  const rows = await app.db
    .select({
      squadId: squadLeaders.squadId,
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      photoUrl: users.photoUrl,
    })
    .from(squadLeaders)
    .innerJoin(users, eq(users.id, squadLeaders.leaderId))
    .where(inArray(squadLeaders.squadId, squadIds))
    .orderBy(users.lastName, users.firstName)

  const grouped = new Map<string, Array<{ id: string; firstName: string; lastName: string; photoUrl: string | null }>>()

  for (const row of rows) {
    const leaders = grouped.get(row.squadId) ?? []
    leaders.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      photoUrl: row.photoUrl,
    })
    grouped.set(row.squadId, leaders)
  }

  return grouped
}

export async function listPublicSquads(app: FastifyInstance, publicAccessCode: string) {
  const camp = await getCampByPublicAccessCode(app, publicAccessCode)
  if (!camp) return null

  const squadRows = await app.db
    .select({
      id: squads.id,
      name: squads.name,
      color: squads.color,
      description: squads.description,
      photoUrl: squads.photoUrl,
      childCount: sql<number>`count(${children.id})`,
    })
    .from(squads)
    .leftJoin(children, eq(children.squadId, squads.id))
    .where(eq(squads.campId, camp.id))
    .groupBy(squads.id)
    .orderBy(squads.name)

  const leadersMap = await getPublicSquadLeadersMap(
    app,
    squadRows.map((squad) => squad.id),
  )

  return {
    camp: toPublicCampSummary(camp),
    squads: squadRows.map((squad) => ({
      ...squad,
      childCount: Number(squad.childCount ?? 0),
      leaders: leadersMap.get(squad.id) ?? [],
    })),
  }
}

export async function listPublicSquadChildren(
  app: FastifyInstance,
  publicAccessCode: string,
  squadId: string,
) {
  const camp = await getCampByPublicAccessCode(app, publicAccessCode)
  if (!camp) return null

  const [squad] = await app.db
    .select({
      id: squads.id,
      name: squads.name,
      color: squads.color,
      description: squads.description,
      photoUrl: squads.photoUrl,
    })
    .from(squads)
    .where(and(eq(squads.id, squadId), eq(squads.campId, camp.id)))
    .limit(1)

  if (!squad) return { camp, squad: null, children: [] }

  const childRows = await app.db
    .select({
      id: children.id,
      firstName: children.firstName,
      lastName: children.lastName,
      photoUrl: children.photoUrl,
    })
    .from(children)
    .where(eq(children.squadId, squad.id))
    .orderBy(children.lastName, children.firstName)

  const balances = await getBalancesMap(
    app,
    childRows.map((child) => child.id),
  )
  const leadersMap = await getPublicSquadLeadersMap(app, [squad.id])

  return {
    camp: toPublicCampSummary(camp),
    squad: {
      ...squad,
      leaders: leadersMap.get(squad.id) ?? [],
    },
    children: childRows.map((child) => ({
      ...child,
      balance: balances.get(child.id) ?? 0,
    })),
  }
}

export async function searchPublicChildren(app: FastifyInstance, publicAccessCode: string, query: string) {
  const camp = await getCampByPublicAccessCode(app, publicAccessCode)
  if (!camp) return null

  const pattern = `%${query}%`
  const childRows = await app.db
    .select({
      id: children.id,
      firstName: children.firstName,
      lastName: children.lastName,
      photoUrl: children.photoUrl,
      squadId: squads.id,
      squadName: squads.name,
      squadColor: squads.color,
    })
    .from(children)
    .innerJoin(squads, eq(squads.id, children.squadId))
    .where(
      and(
        eq(children.campId, camp.id),
        or(ilike(children.firstName, pattern), ilike(children.lastName, pattern)),
      ),
    )
    .orderBy(children.lastName, children.firstName)
    .limit(50)

  const balances = await getBalancesMap(
    app,
    childRows.map((child) => child.id),
  )

  return {
    camp: toPublicCampSummary(camp),
    children: childRows.map((child) => ({
      ...child,
      balance: balances.get(child.id) ?? 0,
    })),
  }
}

export async function getPublicChildProfile(
  app: FastifyInstance,
  publicAccessCode: string,
  childId: string,
) {
  const camp = await getCampByPublicAccessCode(app, publicAccessCode)
  if (!camp) return null

  const [child] = await app.db
    .select({
      id: children.id,
      firstName: children.firstName,
      lastName: children.lastName,
      photoUrl: children.photoUrl,
      squadId: squads.id,
      squadName: squads.name,
      squadColor: squads.color,
      campId: children.campId,
    })
    .from(children)
    .innerJoin(squads, eq(squads.id, children.squadId))
    .where(and(eq(children.id, childId), eq(children.campId, camp.id)))
    .limit(1)

  if (!child) return { camp, child: null }

  const balance = await app.db
    .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions)
    .where(and(eq(coinTransactions.childId, child.id), eq(coinTransactions.campId, camp.id)))

  const transactions = await app.db
    .select({
      id: coinTransactions.id,
      type: coinTransactions.type,
      amount: coinTransactions.amount,
      reason: coinTransactions.reason,
      metadata: coinTransactions.metadata,
      createdAt: coinTransactions.createdAt,
    })
    .from(coinTransactions)
    .where(and(eq(coinTransactions.childId, child.id), eq(coinTransactions.campId, camp.id)))
    .orderBy(desc(coinTransactions.createdAt))
    .limit(100)

  const achievementRules = await app.db
    .select({
      id: coinRules.id,
      label: coinRules.label,
      description: coinRules.description,
      photoUrl: coinRules.photoUrl,
    })
    .from(coinRules)
    .where(and(eq(coinRules.campId, camp.id), eq(coinRules.isAchievement, true)))

  const achievementRuleByLabel = new Map(achievementRules.map((rule) => [rule.label.trim().toLowerCase(), rule]))
  const achievementRuleById = new Map(achievementRules.map((rule) => [rule.id, rule]))

  const transactionsWithAchievementMeta = transactions.map((tx) => {
    const metadata = (tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : null) as Record<string, unknown> | null
    const hasAchievementFlag = metadata?.isAchievement === true
    if (tx.amount <= 0) return tx

    const metadataAchievementKey = typeof metadata?.achievementKey === 'string' ? metadata.achievementKey : null
    const ruleIdFromMetadata = metadataAchievementKey?.startsWith('rule:') ? metadataAchievementKey.slice(5) : null
    const matchedRuleById = ruleIdFromMetadata ? achievementRuleById.get(ruleIdFromMetadata) : undefined
    const matchedRuleByLabel = achievementRuleByLabel.get(tx.reason.trim().toLowerCase())
    const matchedRule = matchedRuleById ?? matchedRuleByLabel

    if (!hasAchievementFlag && !matchedRule) return tx

    return {
      ...tx,
      metadata: {
        ...(metadata ?? {}),
        isAchievement: hasAchievementFlag || !!matchedRule,
        achievementKey: metadataAchievementKey ?? (matchedRule ? `rule:${matchedRule.id}` : tx.reason.trim().toLowerCase()),
        // Prefer live rule media so profile shelf reflects updates from admin rules.
        rulePhotoUrl: matchedRule ? matchedRule.photoUrl : (typeof metadata?.rulePhotoUrl === 'string' ? metadata.rulePhotoUrl : null),
        ruleDescription:
          matchedRule
            ? matchedRule.description
            : (typeof metadata?.ruleDescription === 'string' ? metadata.ruleDescription : null),
      },
    }
  })

  return {
    camp: toPublicCampSummary(camp),
    child: {
      ...child,
      balance: Number(balance[0]?.total ?? 0),
      transactions: transactionsWithAchievementMeta,
    },
  }
}

export async function listPublicShopItems(app: FastifyInstance, publicAccessCode: string) {
  const camp = await getCampByPublicAccessCode(app, publicAccessCode)
  if (!camp) return null

  const shopRows = await app.db
    .select({
      rewardId: rewards.id,
      rewardName: rewards.name,
      rewardDescription: rewards.description,
      rewardPhotoUrl: rewards.photoUrl,

      itemId: rewardItems.id,
      itemName: rewardItems.name,
      itemPrice: rewardItems.price,
      itemPhotoUrl: rewardItems.photoUrl,
    })
    .from(rewards)
    .innerJoin(rewardItems, eq(rewardItems.rewardId, rewards.id))
    .where(
      and(
        eq(rewards.campId, camp.id),
        eq(rewards.isActive, true),
        eq(rewardItems.isActive, true),
      ),
    )
    .orderBy(rewards.name, rewardItems.price, rewardItems.name)

  const grouped = new Map<
    string,
    {
      id: string
      name: string
      description: string | null
      photoUrl: string | null
      items: Array<{
        id: string
        name: string
        price: number
        photoUrl: string | null
      }>
    }
  >()

  for (const row of shopRows) {
    const existing = grouped.get(row.rewardId)

    if (existing) {
      existing.items.push({
        id: row.itemId,
        name: row.itemName,
        price: row.itemPrice,
        photoUrl: row.itemPhotoUrl,
      })
      continue
    }

    grouped.set(row.rewardId, {
      id: row.rewardId,
      name: row.rewardName,
      description: row.rewardDescription,
      photoUrl: row.rewardPhotoUrl,
      items: [
        {
          id: row.itemId,
          name: row.itemName,
          price: row.itemPrice,
          photoUrl: row.itemPhotoUrl,
        },
      ],
    })
  }

  return {
    camp: toPublicCampSummary(camp),
    rewards: Array.from(grouped.values()),
  }
}
