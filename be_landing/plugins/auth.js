import fastifyPlugin from 'fastify-plugin'
import { init } from '@instantdb/admin'

async function authPlugin(fastify) {
  // Initialize InstantDB admin for token validation
  const db = init({
    appId: process.env.INSTANT_APP_ID,
    adminToken: process.env.INSTANT_ADMIN_TOKEN
  })

  // Custom authentication decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      // Get token from header, cookie, or query parameter
      const token = request.headers['authorization']?.replace('Bearer ', '') ||
                    request.headers['token'] ||
                    request.cookies?.admin_token

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' })
      }

      // console.log('Validating token:', token)

      // Verify token with InstantDB
      const user = await db.auth.verifyToken(token)

      if (!user) {
        return reply.status(401).send({ error: 'Invalid token' })
      }

      // Store user in request for later use
      request.user = user
    } catch (error) {
      console.error('Token validation error:', error)
      fastify.log.error('Token validation error:', error)
      return reply.status(401).send({ error: 'Authentication failed' })
    }
  })

  // Admin role requirement decorator
  fastify.decorate('requireAdmin', async function (request, reply) {
    try {
      // Query user's profile
      const query = {
        profiles: {
          $: {
            where: {
              'user.id': request.user.id
            }
          },
          user: {}
        }
      }

      const result = await db.query(query)
      const profile = result.profiles?.[0]

      if (!profile) {
        return reply.status(403).send({ error: 'Profile not found' })
      }

      if (profile.type !== 'admin') {
        return reply.status(403).send({ error: 'Admin access required' })
      }

      // Store profile in request for later use
      request.profile = profile
    } catch (error) {
      console.error('Admin check error:', error)
      fastify.log.error('Admin check error:', error)
      return reply.status(403).send({ error: 'Admin verification failed' })
    }
  })
}

export default fastifyPlugin(authPlugin)
