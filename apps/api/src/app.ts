import Fastify from 'fastify'
import { sql as drizzleSql } from 'drizzle-orm'
import { env } from './config/env.js'
import { registerModules } from './modules/index.js'
import { registerAuthPlugin } from './plugins/auth.js'
import { registerCorsPlugin } from './plugins/cors.js'
import { registerDbPlugin } from './plugins/db.js'

export async function buildApp() {
  const app = Fastify({
    logger: true,
  })

  await registerCorsPlugin(app)
  await registerDbPlugin(app)
  await registerAuthPlugin(app)

  app.get('/health', async () => ({
    status: 'ok',
    service: 'camp-cms-api',
    env: env.NODE_ENV,
  }))

  app.get('/health/db', async () => {
    const result = await app.db.execute(drizzleSql`select 1 as ok`)
    return {
      status: 'ok',
      database: result[0],
    }
  })

  await registerModules(app)

  return app
}

