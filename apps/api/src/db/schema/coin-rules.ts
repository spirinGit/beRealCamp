import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'

export const coinRules = pgTable('coin_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  campId: uuid('camp_id')
    .references(() => camps.id, { onDelete: 'cascade' })
    .notNull(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  points: integer('points').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

