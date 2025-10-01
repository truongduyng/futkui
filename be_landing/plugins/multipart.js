import fastifyPlugin from 'fastify-plugin'
import fastifyMultipart from '@fastify/multipart'

async function multipartPlugin(fastify) {
  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    attachFieldsToBody: false, // Don't automatically parse all multipart
  })
}

export default fastifyPlugin(multipartPlugin)
