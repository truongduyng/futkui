'use strict'

const fp = require('fastify-plugin')
const path = require('node:path')

module.exports = fp(async function (fastify, opts) {
  await fastify.register(require('@fastify/view'), {
    engine: {
      ejs: require('ejs')
    },
    root: path.join(__dirname, '..', 'views'),
    viewExt: 'ejs'
  })
})