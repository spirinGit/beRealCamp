import { pgTable, uuid, unique } from 'drizzle-orm/pg-core'
import { rewards } from './rewards.js'
import { users } from './users.js'

// Зв'язок між воркерами та точками обслуговування (many-to-many)
export const rewardWorkers = pgTable(
  'reward_workers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rewardId: uuid('reward_id')
      .references(() => rewards.id, { onDelete: 'cascade' })
      .notNull(),
    workerId: uuid('worker_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (t) => [unique('reward_workers_unique').on(t.rewardId, t.workerId)],
)
