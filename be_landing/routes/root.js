'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return reply.view('index', {
      title: 'FutKui - Sports Team Chat App',
      description: 'FutKui connects sports teams and clubs with real-time chat, image sharing, and easy group management. Perfect for team communication.'
    })
  })
}
