import { boolean, date, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { children } from './children.js'
import { users } from './users.js'

export const childAttendance = pgTable(
  'child_attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    campId: uuid('camp_id')
      .references(() => camps.id, { onDelete: 'cascade' })
      .notNull(),
    childId: uuid('child_id')
      .references(() => children.id, { onDelete: 'cascade' })
      .notNull(),
    day: date('day').notNull(),
    isPresent: boolean('is_present').notNull(),
    markedByUserId: uuid('marked_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: false }).defaultNow().notNull(),
    note: text('note'),
  },
  (t) => [unique('child_attendance_child_day_unique').on(t.childId, t.day)],
)
