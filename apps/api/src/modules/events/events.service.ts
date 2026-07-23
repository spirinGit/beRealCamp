import { and, asc, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { children, coinTransactions, eventSquads, events, squadLeaders, squads } from '../../db/schema/index.js'

type EventSquadStatus = 'pending' | 'completed' | 'failed'
type ResolutionSource = 'admin' | 'leader_code' | 'timeout'

async function resolveEventSquad(
  app: FastifyInstance,
  args: {
    eventId: string
    campId: string
    squadId: string
    actorUserId: string
    status: Exclude<EventSquadStatus, 'pending'>
    source: ResolutionSource
  },
) {
  const [event] = await app.db
    .select()
    .from(events)
    .where(and(eq(events.id, args.eventId), eq(events.campId, args.campId)))
    .limit(1)

  if (!event) return { ok: false as const, error: 'Event not found' }

  const [entry] = await app.db
    .select()
    .from(eventSquads)
    .where(and(eq(eventSquads.eventId, args.eventId), eq(eventSquads.squadId, args.squadId)))
    .limit(1)

  if (!entry) return { ok: false as const, error: 'Squad is not a participant of this event' }
  const result = await app.db.transaction(async (tx) => {
    const resolvedAt = new Date()
    const [updatedEntry] = await tx
      .update(eventSquads)
      .set({
        status: args.status,
        resolvedByUserId: args.actorUserId,
        resolvedAt,
        resolutionSource: args.source,
        transactionAppliedAt: resolvedAt,
      })
      .where(
        and(
          eq(eventSquads.eventId, args.eventId),
          eq(eventSquads.squadId, args.squadId),
          eq(eventSquads.status, 'pending'),
        ),
      )
      .returning({ id: eventSquads.id })

    if (!updatedEntry) {
      return { ok: false as const, error: 'Event outcome already fixed for this squad' }
    }

    const squadChildren = await tx
      .select({ id: children.id })
      .from(children)
      .where(and(eq(children.campId, args.campId), eq(children.squadId, args.squadId)))

    if (squadChildren.length > 0) {
      const amount =
        args.status === 'completed' ? Math.abs(event.rewardPoints) : -Math.abs(event.penaltyPoints)
      const txType = args.status === 'completed' ? 'earn' : 'spend'
      const reason = `${event.title}: ${args.status === 'completed' ? 'виконано' : 'невиконано'}`

      await tx.insert(coinTransactions).values(
        squadChildren.map((child) => ({
          campId: args.campId,
          childId: child.id,
          actorUserId: args.actorUserId,
          type: txType,
          amount,
          reason,
          comment: null,
          metadata: {
            eventId: args.eventId,
            squadId: args.squadId,
            outcome: args.status,
          },
        })),
      )
    }

    return { ok: true as const }
  })

  return result
}

export async function settleExpiredEventSquads(app: FastifyInstance, campId: string) {
  const pendingExpired = await app.db
    .select({
      eventId: eventSquads.eventId,
      squadId: eventSquads.squadId,
      title: events.title,
      rewardPoints: events.rewardPoints,
      penaltyPoints: events.penaltyPoints,
    })
    .from(eventSquads)
    .innerJoin(events, eq(events.id, eventSquads.eventId))
    .where(
      and(
        eq(events.campId, campId),
        eq(eventSquads.status, 'pending'),
        isNull(eventSquads.transactionAppliedAt),
        lt(events.endsAt, new Date()),
      ),
    )

  for (const item of pendingExpired) {
    await app.db.transaction(async (tx) => {
      const [updatedEntry] = await tx
        .update(eventSquads)
        .set({
          status: 'failed',
          resolvedAt: new Date(),
          resolutionSource: 'timeout',
          transactionAppliedAt: new Date(),
        })
        .where(
          and(
            eq(eventSquads.eventId, item.eventId),
            eq(eventSquads.squadId, item.squadId),
            eq(eventSquads.status, 'pending'),
            isNull(eventSquads.transactionAppliedAt),
          ),
        )
        .returning({ id: eventSquads.id })

      if (!updatedEntry) return

      const squadChildren = await tx
        .select({ id: children.id })
        .from(children)
        .where(and(eq(children.campId, campId), eq(children.squadId, item.squadId)))

      if (squadChildren.length > 0) {
        await tx.insert(coinTransactions).values(
          squadChildren.map((child) => ({
            campId,
            childId: child.id,
            actorUserId: null,
            type: 'spend',
            amount: -Math.abs(item.penaltyPoints),
            reason: `${item.title}: невиконано`,
            comment: null,
            metadata: {
              eventId: item.eventId,
              squadId: item.squadId,
              outcome: 'failed',
            },
          })),
        )
      }
    })
  }
}

export async function createEvent(
  app: FastifyInstance,
  data: {
    campId: string
    title: string
    description?: string
    code: string
    rewardPoints: number
    penaltyPoints: number
    endsAt: Date
    squadIds: string[]
    createdByUserId: string
  },
) {
  const [event] = await app.db
    .insert(events)
    .values({
      campId: data.campId,
      title: data.title,
      description: data.description ?? null,
      code: data.code,
      rewardPoints: data.rewardPoints,
      penaltyPoints: data.penaltyPoints,
      endsAt: data.endsAt,
      createdByUserId: data.createdByUserId,
    })
    .returning()

  await app.db.insert(eventSquads).values(data.squadIds.map((squadId) => ({ eventId: event.id, squadId })))

  return event
}

export async function listEventsForAdmin(
  app: FastifyInstance,
  campId: string,
  view: 'active' | 'history',
) {
  await settleExpiredEventSquads(app, campId)

  const now = new Date()
  const base = app.db
    .select()
    .from(events)
    .where(
      and(
        eq(events.campId, campId),
        view === 'active'
          ? or(eq(events.endsAt, now), gt(events.endsAt, now))
          : or(lt(events.endsAt, now), eq(events.endsAt, now)),
      ),
    )
    .orderBy(view === 'active' ? asc(events.endsAt) : desc(events.endsAt))

  return base
}

export async function getEventAdminDetails(app: FastifyInstance, campId: string, eventId: string) {
  await settleExpiredEventSquads(app, campId)

  const [event] = await app.db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.campId, campId)))
    .limit(1)
  if (!event) return null

  const participants = await app.db
    .select({
      squadId: eventSquads.squadId,
      squadName: squads.name,
      status: eventSquads.status,
      resolvedAt: eventSquads.resolvedAt,
      resolutionSource: eventSquads.resolutionSource,
    })
    .from(eventSquads)
    .innerJoin(squads, eq(squads.id, eventSquads.squadId))
    .where(eq(eventSquads.eventId, event.id))
    .orderBy(squads.name)

  return { ...event, participants }
}

export async function setEventSquadStatusByAdmin(
  app: FastifyInstance,
  args: {
    eventId: string
    squadId: string
    campId: string
    actorUserId: string
    status: 'completed' | 'failed'
  },
) {
  return resolveEventSquad(app, {
    eventId: args.eventId,
    squadId: args.squadId,
    campId: args.campId,
    actorUserId: args.actorUserId,
    status: args.status,
    source: 'admin',
  })
}

export async function listEventsForLeader(
  app: FastifyInstance,
  args: { campId: string; leaderId: string; view: 'active' | 'history' },
) {
  await settleExpiredEventSquads(app, args.campId)

  const now = new Date()
  const leaderSquads = app.db
    .select({ squadId: squadLeaders.squadId })
    .from(squadLeaders)
    .where(eq(squadLeaders.leaderId, args.leaderId))

  const rows = await app.db
    .select({
      eventId: events.id,
      title: events.title,
      description: events.description,
      code: events.code,
      rewardPoints: events.rewardPoints,
      penaltyPoints: events.penaltyPoints,
      endsAt: events.endsAt,
      squadId: eventSquads.squadId,
      squadName: squads.name,
      status: eventSquads.status,
      resolvedAt: eventSquads.resolvedAt,
    })
    .from(eventSquads)
    .innerJoin(events, eq(events.id, eventSquads.eventId))
    .innerJoin(squads, eq(squads.id, eventSquads.squadId))
    .where(
      and(
        eq(events.campId, args.campId),
        sql`${eventSquads.squadId} IN (${leaderSquads})`,
        args.view === 'active'
          ? or(eq(events.endsAt, now), gt(events.endsAt, now))
          : or(lt(events.endsAt, now), eq(events.endsAt, now)),
      ),
    )
    .orderBy(args.view === 'active' ? asc(events.endsAt) : desc(events.endsAt), squads.name)

  return rows
}

export async function submitEventCodeByLeader(
  app: FastifyInstance,
  args: {
    eventId: string
    squadId: string
    code: string
    campId: string
    actorUserId: string
  },
) {
  const [leaderSquad] = await app.db
    .select()
    .from(squadLeaders)
    .where(and(eq(squadLeaders.leaderId, args.actorUserId), eq(squadLeaders.squadId, args.squadId)))
    .limit(1)
  if (!leaderSquad) return { ok: false as const, error: 'You do not manage this squad' }

  const [event] = await app.db
    .select()
    .from(events)
    .where(and(eq(events.id, args.eventId), eq(events.campId, args.campId)))
    .limit(1)
  if (!event) return { ok: false as const, error: 'Event not found' }
  if (event.endsAt < new Date()) return { ok: false as const, error: 'Event has already ended' }
  if (event.code !== args.code.trim()) return { ok: false as const, error: 'Invalid event code' }

  return resolveEventSquad(app, {
    eventId: args.eventId,
    squadId: args.squadId,
    campId: args.campId,
    actorUserId: args.actorUserId,
    status: 'completed',
    source: 'leader_code',
  })
}
