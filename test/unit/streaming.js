'use strict'

const { join } = require('path')
const zlib = require('zlib')
const test = require('ava')
const fs = require('fs')

const { prepare, toAscii } = require('../util')
const compression = require('../../src')

test('allows piping streams', async t => {
  const pkg = join(__dirname, '../../package.json')
  const gzipped = zlib.gzipSync(fs.readFileSync(pkg))

  const { req, res } = prepare('GET', 'gzip')
  compression({ threshold: 0 })(req, res)

  res.writeHead(200, { 'content-type': 'text/plain' })
  fs.createReadStream(pkg).pipe(res, { end: true })

  const body = await res.getResponseData()

  t.is(res.getHeader('content-encoding'), 'gzip')
  t.deepEqual(toAscii(body), toAscii(gzipped))
})
