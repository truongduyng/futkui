import { init } from '@instantdb/admin'

export default async function (fastify, opts) {
  // Initialize InstantDB admin - you'll need to set these environment variables
  const db = init({
    appId: process.env.INSTANT_APP_ID,
    adminToken: process.env.INSTANT_ADMIN_TOKEN
  })

  // DELETE /api/account - Delete user account
  fastify.delete('/api/account', {
    preHandler: fastify.authenticate
  }, async function (request, reply) {
    try {
      // Get authenticated user from the bearer token
      const authenticatedUser = request.user
      
      if (!authenticatedUser) {
        return reply.code(401).send({ 
          error: 'Authentication required' 
        })
      }

      // Delete the authenticated user's account
      const result = await db.auth.deleteUser({ id: authenticatedUser.id })

      if (result.error) {
        fastify.log.error('Failed to delete user account:', result.error)
        return reply.code(400).send({ 
          error: 'Failed to delete account',
          details: result.error 
        })
      }

      return reply.send({ 
        success: true, 
        message: 'Account deleted successfully',
        deletedUser: result.user
      })
    } catch (error) {
      fastify.log.error('Error deleting account:', error)
      return reply.code(500).send({ 
        error: 'Internal server error while deleting account' 
      })
    }
  })
}