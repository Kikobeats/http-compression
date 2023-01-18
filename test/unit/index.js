'use strict'

const test = require('ava')

const { prepare } = require('../util')
const compression = require('../../src')

test('should export a function', t => {
  t.is(typeof compression, 'function')
})

test('installs as middleware', t => {
  const { req, res } = prepare('GET', 'gzip')
  const middleware = compression()

  let calledNext = false
  middleware(req, res, () => {
    calledNext = true
  })

  t.true(calledNext)
})

test('respect `accept-encoding`', t => {
  {
    const { req, res } = prepare('GET', 'gzip;q=0.5, br;q=1.0')
    compression({ threshold: 0 })(req, res)

    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('hello world'.repeat(20))

    t.is(res.getHeader('content-encoding'), 'br')
  }

  {
    const { req, res } = prepare('GET', null)
    compression({ threshold: 0 })(req, res)

    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('hello world'.repeat(20))

    t.is(res.getHeader('content-encoding'), undefined)
  }
})
