import type { FastifyInstance } from 'fastify'
import { registerAuditLogRoutes } from './audit-log/audit-log.routes.js'
import { registerAuthRoutes } from './auth/auth.routes.js'
import { registerCampsRoutes } from './camps/camps.routes.js'
import { registerChildrenRoutes } from './children/children.routes.js'
import { registerCoinRulesRoutes } from './coin-rules/coin-rules.routes.js'
import { registerRewardsRoutes } from './rewards/rewards.routes.js'
import { registerSquadsRoutes } from './squads/squads.routes.js'
import { registerStatsRoutes } from './stats/stats.routes.js'
import { registerTransactionsRoutes } from './transactions/transactions.routes.js'
import { registerUsersRoutes } from './users/users.routes.js'

export async function registerModules(app: FastifyInstance) {
  await app.register(registerAuthRoutes, { prefix: '/auth' })
  await app.register(registerCampsRoutes, { prefix: '/camps' })
  await app.register(registerUsersRoutes, { prefix: '/users' })
  await app.register(registerSquadsRoutes, { prefix: '/squads' })
  await app.register(registerChildrenRoutes, { prefix: '/children' })
  await app.register(registerCoinRulesRoutes, { prefix: '/coin-rules' })
  await app.register(registerTransactionsRoutes, { prefix: '/transactions' })
  await app.register(registerRewardsRoutes, { prefix: '/rewards' })
  await app.register(registerStatsRoutes, { prefix: '/stats' })
  await app.register(registerAuditLogRoutes, { prefix: '/audit-log' })
}

