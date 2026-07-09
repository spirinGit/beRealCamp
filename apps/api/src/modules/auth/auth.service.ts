import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { users } from '../../db/schema/index.js'
import { verifyPassword } from '../../lib/password.js'

export async function loginUser(app: FastifyInstance, email: string, password: string) {
  const [user] = await app.db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user || !user.isActive) return null

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return null

  const token = app.jwt.sign({
    userId: user.id,
    role: user.role as 'Administrator' | 'Leader' | 'Worker',
    campId: user.campId,
  })

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      campId: user.campId,
    },
  }
}

