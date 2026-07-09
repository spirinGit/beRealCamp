import type { FastifyReply, FastifyRequest } from 'fastify'

type Role = 'Administrator' | 'Leader' | 'Worker'

/**
 * Returns a preHandler that verifies JWT and optionally checks role.
 * Usage:
 *   preHandler: [requireRole()]              // just auth
 *   preHandler: [requireRole('Administrator')] // admin only
 *   preHandler: [requireRole('Administrator', 'Leader')] // admin or leader
 */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
    if (roles.length > 0 && !roles.includes(request.user.role as Role)) {
      return reply.code(403).send({ error: 'Forbidden' })
    }
  }
}

export const authenticate = requireRole()
export const requireAdmin = requireRole('Administrator')
export const requireLeaderRole = requireRole('Leader')
export const requireWorkerRole = requireRole('Worker')
export const requireAdminOrLeader = requireRole('Administrator', 'Leader')
export const requireAdminOrWorker = requireRole('Administrator', 'Worker')
