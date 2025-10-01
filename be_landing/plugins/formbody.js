import fastifyPlugin from 'fastify-plugin'
import fastifyFormbody from '@fastify/formbody'

async function formbodyPlugin(fastify) {
  await fastify.register(fastifyFormbody)
}

export default fastifyPlugin(formbodyPlugin)
