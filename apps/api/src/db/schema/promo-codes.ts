import { pgTable, text, timestamp, unique, uuid, integer } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { children } from './children.js'
import { users } from './users.js'

export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    campId: uuid('camp_id')
      .references(() => camps.id, { onDelete: 'cascade' })
      .notNull(),
    code: text('code').notNull(),
    rewardPoints: integer('reward_points').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    activatedByChildId: uuid('activated_by_child_id').references(() => children.id, { onDelete: 'set null' }),
    activatedAt: timestamp('activated_at', { withTimezone: false }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [
    unique('promo_codes_code_unique').on(t.code),
  ],
)