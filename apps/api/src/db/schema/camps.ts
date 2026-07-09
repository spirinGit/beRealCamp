import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const camps = pgTable('camps', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  startDate: timestamp('start_date', { withTimezone: false }).notNull(),
  endDate: timestamp('end_date', { withTimezone: false }),  // set automatically on archive
  status: text('status', { enum: ['active', 'archived'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

