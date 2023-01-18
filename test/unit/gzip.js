'use strict'

const test = require('ava')

const { prepare } = require('../util')
const compression = require('../../src')

test('compresses content over threshold', t => {
  const { req, res } = prepare('GET', 'gzip')

  compression()(req, res)
  res.writeHead(200, { 'content-type': 'text/plain' })
  res.write('hello world'.repeat(1000))
  res.end()

  t.is(res.getHeader('content-encoding'), 'gzip')
})

test('compresses content with no content-type', t => {
  const { req, res } = prepare('GET', 'gzip')
  compression({ threshold: 0 })(req, res)
  res.end('hello world')

  t.is(res.getHeader('content-encoding'), 'gzip')
})

test('ignores content with unmatched content-type', async t => {
  const { req, res } = prepare('GET', 'gzip')
  compression({ threshold: 0 })(req, res)
  res.writeHead(200, { 'content-type': 'image/jpeg' })
  const content = 'hello world'
  res.end(content)

  t.is(res.hasHeader('content-encoding'), false)
  t.is(await res.getResponseText(), content)
})

test('preserves plaintext below threshold', async t => {
  const { req, res } = prepare('GET', 'gzip')
  compression()(req, res)
  res.writeHead(200, { 'content-type': 'text/plain' })
  const content = 'hello world'.repeat(20)
  res.end(content)

  t.is(res.hasHeader('content-encoding'), false)
  t.is(await res.getResponseText(), content)
})
