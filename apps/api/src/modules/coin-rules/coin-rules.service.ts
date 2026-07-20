import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { coinRules } from '../../db/schema/index.js'

function baseCoinRuleSelect() {
  return {
    id: coinRules.id,
    campId: coinRules.campId,
    key: coinRules.key,
    label: coinRules.label,
    points: coinRules.points,
    isActive: coinRules.isActive,
    createdAt: coinRules.createdAt,
  }
}

function withAchievementSelect() {
  return {
    ...baseCoinRuleSelect(),
    isAchievement: coinRules.isAchievement,
  }
}

function fullCoinRuleSelect() {
  return {
    ...withAchievementSelect(),
    description: coinRules.description,
    photoUrl: coinRules.photoUrl,
  }
}

export async function listCoinRules(app: FastifyInstance, campId: string) {
  try {
    return await app.db
      .select(fullCoinRuleSelect())
      .from(coinRules)
      .where(eq(coinRules.campId, campId))
      .orderBy(coinRules.label)
  } catch {
    try {
      const rows = await app.db
        .select(withAchievementSelect())
        .from(coinRules)
        .where(eq(coinRules.campId, campId))
        .orderBy(coinRules.label)

      return rows.map((rule) => ({
        ...rule,
        description: null,
        photoUrl: null,
      }))
    } catch {
      const rows = await app.db
        .select(baseCoinRuleSelect())
        .from(coinRules)
        .where(eq(coinRules.campId, campId))
        .orderBy(coinRules.label)

      return rows.map((rule) => ({
        ...rule,
        description: null,
        photoUrl: null,
        isAchievement: false,
      }))
    }
  }
}

export async function getCoinRuleById(app: FastifyInstance, id: string) {
  try {
    const [rule] = await app.db.select(fullCoinRuleSelect()).from(coinRules).where(eq(coinRules.id, id)).limit(1)
    return rule ?? null
  } catch {
    try {
      const [rule] = await app.db.select(withAchievementSelect()).from(coinRules).where(eq(coinRules.id, id)).limit(1)
      return rule
        ? {
            ...rule,
            description: null,
            photoUrl: null,
          }
        : null
    } catch {
      const [rule] = await app.db.select(baseCoinRuleSelect()).from(coinRules).where(eq(coinRules.id, id)).limit(1)
      return rule
        ? {
            ...rule,
            description: null,
            photoUrl: null,
            isAchievement: false,
          }
        : null
    }
  }
}

export async function createCoinRule(
  app: FastifyInstance,
  data: { campId: string; key: string; label: string; description?: string; photoUrl?: string; isAchievement?: boolean; points: number },
) {
  try {
    const [rule] = await app.db.insert(coinRules).values(data).returning()
    return rule
  } catch {
    const { description: _description, photoUrl: _photoUrl, isAchievement: _isAchievement, ...baseData } = data
    const [rule] = await app.db.insert(coinRules).values(baseData).returning()
    return {
      ...rule,
      description: null,
      photoUrl: null,
      isAchievement: false,
    }
  }
}

export async function updateCoinRule(
  app: FastifyInstance,
  id: string,
  data: Partial<{ key: string; label: string; description: string | null; photoUrl: string | null; isAchievement: boolean; points: number; isActive: boolean }>,
) {
  try {
    const [rule] = await app.db.update(coinRules).set(data).where(eq(coinRules.id, id)).returning()
    return rule ?? null
  } catch {
    const { description: _description, photoUrl: _photoUrl, isAchievement: _isAchievement, ...baseData } = data
    const [rule] = await app.db.update(coinRules).set(baseData).where(eq(coinRules.id, id)).returning()
    return rule
      ? {
          ...rule,
          description: null,
          photoUrl: null,
          isAchievement: false,
        }
      : null
  }
}

