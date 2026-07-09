import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { users } from '../../db/schema/index.js'
import { hashPassword } from '../../lib/password.js'

// Поля без passwordHash — ніколи не повертаємо хеш
const safeFields = {
  id: users.id,
  campId: users.campId,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
}

export async function listUsers(app: FastifyInstance, campId: string) {
  return app.db
    .select(safeFields)
    .from(users)
    .where(eq(users.campId, campId))
    .orderBy(users.lastName)
}

export async function getUserById(app: FastifyInstance, id: string) {
  const [user] = await app.db
    .select(safeFields)
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
  return user ?? null
}

export async function createUser(
  app: FastifyInstance,
  data: {
    campId: string
    firstName: string
    lastName: string
    email: string
    password: string
    role: string
  },
) {
  const passwordHash = await hashPassword(data.password)
  const [user] = await app.db
    .insert(users)
    .values({
      campId: data.campId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: data.role,
    })
    .returning(safeFields)
  return user
}

export async function updateUser(
  app: FastifyInstance,
  id: string,
  data: Partial<{ firstName: string; lastName: string; email: string; role: string; isActive: boolean }>,
) {
  const [user] = await app.db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning(safeFields)
  return user ?? null
}

