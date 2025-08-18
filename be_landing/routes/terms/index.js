'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return reply.view('terms', {
      title: 'Terms of Service - FutKui',
      description: 'Terms of service for FutKui sports team chat app. Understand your rights and responsibilities when using our platform.'
    })
  })
}
