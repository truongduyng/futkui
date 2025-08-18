'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return reply.view('index', {
      title: 'FutKui - Real-time Group Chat',
      description: 'Connect instantly with FutKui. The fastest way to create and join group chats with real-time messaging.'
    })
  })
}
