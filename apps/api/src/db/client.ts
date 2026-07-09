import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../config/env.js'

export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  // SSL вмикаємо якщо URL містить sslmode=require (Neon, Railway тощо)
  ssl: env.DATABASE_URL.includes('sslmode=require') ? 'require' : undefined,
})

export const db = drizzle({
  client: sql,
  casing: 'snake_case',
})

