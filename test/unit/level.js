'use strict'

const { join } = require('path')
const zlib = require('zlib')
const test = require('ava')
const fs = require('fs')

const { prepare, toAscii } = require('../util')
const compression = require('../../src')

const contentPath = join(__dirname, '../../package.json')
const content = fs.readFileSync(contentPath)

const gzipAt = level => zlib.gzipSync(content, { level })

const brotliAt = quality =>
  zlib.brotliCompressSync(content, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality }
  })

const respond = async (encoding, options) => {
  const { req, res } = prepare('GET', encoding)
  compression({ threshold: 0, ...options })(req, res)

  res.writeHead(200, { 'content-type': 'text/plain' })
  fs.createReadStream(contentPath).pipe(res)

  const body = await res.getResponseData()
  return { encoding: res.getHeader('content-encoding'), body: toAscii(body) }
}

const expectBody = async (t, encoding, options, expected) => {
  const response = await respond(encoding, options)
  t.is(response.encoding, encoding)
  t.deepEqual(response.body, toAscii(expected))
}

test('gzip level 2 by default', t => expectBody(t, 'gzip', {}, gzipAt(2)))

test('brotli level 2 by default', t => expectBody(t, 'br', {}, brotliAt(2)))

test('a custom level is used', async t => {
  await expectBody(t, 'gzip', { level: { brotli: 9, gzip: 9 } }, gzipAt(9))
  await expectBody(t, 'br', { level: { brotli: 9, gzip: 9 } }, brotliAt(9))
})

test('a brotli level alone keeps the gzip default', t => expectBody(t, 'gzip', { level: { brotli: 5 } }, gzipAt(2)))

test('a gzip level alone keeps the brotli default', t => expectBody(t, 'br', { level: { gzip: 9 } }, brotliAt(2)))

test('an undefined level keeps its default', async t => {
  await expectBody(t, 'br', { level: { brotli: undefined } }, brotliAt(2))
  await expectBody(t, 'gzip', { level: { gzip: undefined } }, gzipAt(2))
})

test('a null level keeps the defaults', async t => {
  await expectBody(t, 'br', { level: null }, brotliAt(2))
  await expectBody(t, 'gzip', { level: null }, gzipAt(2))
})

test('level 0 is kept, not replaced by the default', async t => {
  await expectBody(t, 'br', { level: { brotli: 0 } }, brotliAt(0))
  await expectBody(t, 'gzip', { level: { gzip: 0 } }, gzipAt(0))
})
