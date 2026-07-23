import { sql } from 'drizzle-orm'
import { check, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { children } from './children.js'
import { users } from './users.js'

export const coinTransactions = pgTable(
  'coin_transactions',
  {
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
    clientRequestId: text('client_request_id'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [
    unique('coin_transactions_client_request_id_unique').on(t.clientRequestId),
    check(
      'coin_transactions_amount_sign_check',
      sql`((${t.type} = 'earn' and ${t.amount} > 0) or (${t.type} = 'spend' and ${t.amount} < 0))`,
    ),
  ],
)

