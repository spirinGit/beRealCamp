import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { camps } from './camps.js'
import { users } from './users.js'

// Точка обслуговування: Магазин, Батут тощо
export const rewards = pgTable('rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  campId: uuid('camp_id')
    .references(() => camps.id, { onDelete: 'cascade' })
    .notNull(),
  workerId: uuid('worker_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  description: text('description'),
  photoUrl: text('photo_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

// Позиції всередині точки: Морозиво 500, Стрибок 1000 тощо
export const rewardItems = pgTable('reward_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  rewardId: uuid('reward_id')
    .references(() => rewards.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
})

