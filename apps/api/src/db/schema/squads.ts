import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { users } from './users.js'

export const squads = pgTable('squads', {
  id: uuid('id').defaultRandom().primaryKey(),
  campId: uuid('camp_id')
    .references(() => camps.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  description: text('description'),
  schedule: text('schedule'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

export const squadLeaders = pgTable(
  'squad_leaders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    squadId: uuid('squad_id')
      .references(() => squads.id, { onDelete: 'cascade' })
      .notNull(),
    leaderId: uuid('leader_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [unique('squad_leader_unique').on(t.squadId, t.leaderId)],
)

