import { pgTable, text, timestamp, uuid, integer, unique } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { squads } from './squads.js'
import { users } from './users.js'

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  campId: uuid('camp_id')
    .references(() => camps.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description'),
  code: text('code').notNull(),
  rewardPoints: integer('reward_points').notNull(),
  penaltyPoints: integer('penalty_points').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: false }).notNull(),
  createdByUserId: uuid('created_by_user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const eventSquads = pgTable(
  'event_squads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    squadId: uuid('squad_id')
      .references(() => squads.id, { onDelete: 'cascade' })
      .notNull(),
    status: text('status', { enum: ['pending', 'completed', 'failed'] }).default('pending').notNull(),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: false }),
    resolutionSource: text('resolution_source', { enum: ['admin', 'leader_code', 'timeout'] }),
    transactionAppliedAt: timestamp('transaction_applied_at', { withTimezone: false }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [unique('event_squad_unique').on(t.eventId, t.squadId)],
)
