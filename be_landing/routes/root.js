export default async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return reply.view('index', {
      title: 'FutKui - Sports Team Chat App',
      description: 'FutKui connects sports teams and clubs with real-time chat, image sharing, and easy group management. Perfect for team communication.'
    })
  })

  fastify.get('/privacy', async function (request, reply) {
    return reply.view('privacy', {
      title: 'Privacy Policy - FutKui',
      description: 'Privacy policy for FutKui sports team chat app. Learn how we protect your team\'s data and communications.'
    })
  })

  fastify.get('/terms', async function (request, reply) {
    return reply.view('terms', {
      title: 'Terms of Service - FutKui',
      description: 'Terms of service for FutKui sports team chat app. Understand your rights and responsibilities when using our platform.'
    })
  })
}
