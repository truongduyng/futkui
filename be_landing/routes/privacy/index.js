'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return reply.view('privacy', {
      title: 'Privacy Policy - FutKui',
      description: 'Privacy policy for FutKui sports team chat app. Learn how we protect your team\'s data and communications.'
    })
  })
}
