import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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
export const rewardItems = pgTable(
  'reward_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rewardId: uuid('reward_id')
      .references(() => rewards.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    photoUrl: text('photo_url'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [check('reward_items_price_positive_check', sql`${t.price} > 0`)],
)

export const rewardWorkers = pgTable(
  'reward_workers',
  {
    rewardId: uuid('reward_id')
      .references(() => rewards.id, { onDelete: 'cascade' })
      .notNull(),
    workerId: uuid('worker_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: false }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ name: 'reward_workers_reward_worker_pk', columns: [t.rewardId, t.workerId] })],
)

