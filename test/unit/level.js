'use strict'

const { join } = require('path')
const zlib = require('zlib')
const test = require('ava')
const fs = require('fs')

const { prepare, toAscii } = require('../util')
const compression = require('../../src')

const contentPath = join(__dirname, '../../package.json')
const content = fs.readFileSync(contentPath)

test('gzip level 1 by default', async t => {
  const compressed = zlib.gzipSync(content, { level: 1 })

  const { req, res } = prepare('GET', 'gzip')
  compression({ threshold: 0 })(req, res)

  res.writeHead(200, { 'content-type': 'text/plain' })
  fs.createReadStream(contentPath).pipe(res)

  const body = await res.getResponseData()

  t.is(res.getHeader('content-encoding'), 'gzip')
  t.deepEqual(toAscii(body), toAscii(compressed))
})

test('brotli level 0 by default', async t => {
  const compressed = zlib.brotliCompressSync(content, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 0
    }
  })

  const { req, res } = prepare('GET', 'br')
  compression({ threshold: 0 })(req, res)

  res.writeHead(200, { 'content-type': 'text/plain' })
  fs.createReadStream(contentPath).pipe(res)

  const body = await res.getResponseData()

  t.is(res.getHeader('content-encoding'), 'br')
  t.deepEqual(toAscii(body), toAscii(compressed))
})
