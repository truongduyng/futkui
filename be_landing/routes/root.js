export default async function (fastify, opts) {
  // Vietnamese routes (main)
  fastify.get('/', async function (request, reply) {
    return reply.view('index', {
      title: 'FutKui - Ứng dụng Chat Đội thể thao',
      description: 'FutKui kết nối các đội thể thao và câu lạc bộ với chat thời gian thực, chia sẻ hình ảnh và quản lý nhóm dễ dàng. Hoàn hảo cho giao tiếp đội nhóm.',
      lang: 'vi',
      isHomePage: true
    })
  })

  fastify.get('/privacy', async function (request, reply) {
    return reply.view('privacy', {
      title: 'Chính sách Bảo mật - FutKui',
      description: 'Chính sách bảo mật cho ứng dụng chat đội thể thao FutKui. Tìm hiểu cách chúng tôi bảo vệ dữ liệu và giao tiếp của đội bạn.',
      lang: 'vi'
    })
  })

  fastify.get('/terms', async function (request, reply) {
    return reply.view('terms', {
      title: 'Điều khoản Dịch vụ - FutKui',
      description: 'Điều khoản dịch vụ cho ứng dụng chat đội thể thao FutKui. Hiểu quyền và trách nhiệm của bạn khi sử dụng nền tảng của chúng tôi.',
      lang: 'vi'
    })
  })

  // English routes
  fastify.get('/en', async function (request, reply) {
    return reply.view('en/index', {
      title: 'FutKui - Sports Team Chat App',
      description: 'FutKui connects sports teams and clubs with real-time chat, image sharing, and easy group management. Perfect for team communication.',
      lang: 'en',
      isHomePage: true
    })
  })

  fastify.get('/en/privacy', async function (request, reply) {
    return reply.view('en/privacy', {
      title: 'Privacy Policy - FutKui',
      description: 'Privacy policy for FutKui sports team chat app. Learn how we protect your team\'s data and communications.',
      lang: 'en'
    })
  })

  fastify.get('/en/terms', async function (request, reply) {
    return reply.view('en/terms', {
      title: 'Terms of Service - FutKui',
      description: 'Terms of service for FutKui sports team chat app. Understand your rights and responsibilities when using our platform.',
      lang: 'en'
    })
  })
}
