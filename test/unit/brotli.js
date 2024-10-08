'use strict'

const zlib = require('zlib')

const { toAscii, prepare } = require('../util')
const compression = require('../../src')

const test = 'createBrotliCompress' in zlib ? require('ava') : require('ava').skip

test('compresses content with brotli when supported', async t => {
  const { req, res } = prepare('GET', 'br')
  compression({ threshold: 0, level: { brotli: 11 } })(req, res)
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('hello world')

  const body = await res.getResponseData()

  t.is(res.getHeader('content-encoding'), 'br')
  t.deepEqual(toAscii(body), toAscii('\u000b\u0005\u0000hello world\u0003'))
})

test('gives brotli precedence over gzip', t => {
  const { req, res } = prepare('GET', 'br')
  compression({ threshold: 0 })(req, res)
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('hello world'.repeat(20))

  t.is(res.getHeader('content-encoding'), 'br')
})
