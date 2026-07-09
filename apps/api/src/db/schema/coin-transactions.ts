import { integer, pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { children } from './children.js'
import { users } from './users.js'

export const coinTransactions = pgTable('coin_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  campId: uuid('camp_id')
    .references(() => camps.id, { onDelete: 'cascade' })
    .notNull(),
  childId: uuid('child_id')
    .references(() => children.id, { onDelete: 'cascade' })
    .notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  comment: text('comment'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

