'use strict'

const test = require('ava')
const zlib = require('zlib')

const { toAscii, prepare } = require('./util')
const compression = require('..')

const suite = 'createBrotliCompress' in zlib ? test : test.skip

suite('compresses content with brotli when supported', async t => {
  const { req, res } = prepare('GET', 'br')
  compression({ brotli: true, threshold: 0 })(req, res)
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('hello world')

  const body = await res.getResponseData()

  t.is(res.getHeader('content-encoding'), 'br')

  t.deepEqual(toAscii(body), toAscii('\u000b\u0005\u0000hello world\u0003'))
})

suite('gives brotli precedence over gzip', t => {
  const { req, res } = prepare('GET', 'br')
  compression({ brotli: true, threshold: 0 })(req, res)
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.end('hello world'.repeat(20))

  t.is(res.getHeader('content-encoding'), 'br')
})
