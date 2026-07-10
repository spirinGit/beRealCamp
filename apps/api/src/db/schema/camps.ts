import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

export const camps = pgTable(
  'camps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    publicAccessCode: text('public_access_code'),
    childGuidelines: text('child_guidelines'),
    startDate: timestamp('start_date', { withTimezone: false }).notNull(),
    endDate: timestamp('end_date', { withTimezone: false }), // set automatically on archive
    status: text('status', { enum: ['active', 'archived'] }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [unique('camp_public_access_code_unique').on(t.publicAccessCode)],
)
