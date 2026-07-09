import { pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { squads } from './squads.js'

export const children = pgTable('children', {
  id: uuid('id').defaultRandom().primaryKey(),
  campId: uuid('camp_id')
    .references(() => camps.id, { onDelete: 'cascade' })
    .notNull(),
  squadId: uuid('squad_id')
    .references(() => squads.id, { onDelete: 'restrict' })
    .notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  photoUrl: text('photo_url'),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: text('gender').notNull(),
  parentPhone: text('parent_phone').notNull(),
  medicalNotes: text('medical_notes'),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

