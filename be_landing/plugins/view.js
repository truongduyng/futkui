import fp from 'fastify-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyView from '@fastify/view'
import ejs from 'ejs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default fp(async function (fastify, opts) {
  await fastify.register(fastifyView, {
    engine: {
      ejs: ejs
    },
    root: path.join(__dirname, '..', 'views'),
    viewExt: 'ejs'
  })
})