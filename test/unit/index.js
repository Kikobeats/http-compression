'use strict'

const test = require('ava')

const { prepare, get, runServer } = require('../util')
const createCompression = require('../../src')

test('export a function', t => {
  t.is(typeof createCompression, 'function')
})

test('installs as middleware', t => {
  const { req, res } = prepare('GET', 'gzip')
  const compression = createCompression()

  let calledNext = false
  compression(req, res, () => {
    calledNext = true
  })

  t.true(calledNext)
})

test('install as non middleware', async t => {
  const compression = createCompression({ level: 1, threshold: 4 })

  const url = await runServer(t, (req, res) => {
    compression(req, res)
    res.end('hello world!'.repeat(1000))
  })

  const { res } = await get(url, {
    headers: {
      'accept-encoding': 'br'
    }
  })

  t.is(res.headers['content-encoding'], 'br')
  t.is(res.headers['transfer-encoding'], 'chunked')
  t.is(res.headers['content-length'], undefined)
})

test('allow server to work if not compressing', async t => {
  const handler = (req, res) => {
    res.setHeader('content-type', 'text/plain')
    res.end('OK')
  }

  const url = await runServer(t, (req, res) =>
    createCompression({ level: 1, threshold: 4 })(req, res, () =>
      handler(req, res)
    )
  )

  const { res, data } = await get(url, {
    headers: {
      'accept-encoding': 'gzip'
    }
  })

  t.is(res.statusCode, 200)
  t.is(data.toString(), 'OK')

  t.is(res.headers['content-type'], 'text/plain')
  t.is(res.headers['content-encoding'], undefined)
  t.is(res.headers['transfer-encoding'], 'chunked')
  t.is(res.headers['content-length'], undefined)
})

test('respect `accept-encoding`', t => {
  {
    const { req, res } = prepare('GET', 'gzip;q=0.5, br;q=1.0')
    createCompression({ threshold: 0 })(req, res)

    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('hello world'.repeat(20))

    t.is(res.getHeader('content-encoding'), 'br')
  }

  {
    const { req, res } = prepare('GET', null)
    createCompression({ threshold: 0 })(req, res)

    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('hello world'.repeat(20))

    t.is(res.getHeader('content-encoding'), undefined)
  }
})

test('respect `res.statusCode`', async t => {
  const handler = (req, res) => {
    res.statusCode = 201
    res.end('hello world')
  }

  const compression = createCompression({ threshold: 0 })

  const url = await runServer(t, (req, res) =>
    compression(req, res, () => handler(req, res))
  )

  const { res, data } = await get(url, {
    headers: {
      'accept-encoding': 'br'
    }
  })

  t.is(res.headers['content-encoding'], 'br')
  t.is(res.statusCode, 201)
  t.is(data.toString(), 'hello world')
})

test('respect `res.writeHead`', async t => {
  const handler = (_, res) => {
    res.writeHead(201)
    res.end('hello world')
  }

  const compression = createCompression({ threshold: 0 })

  const url = await runServer(t, (req, res) =>
    compression(req, res, () => handler(req, res))
  )

  const { res, data } = await get(url, {
    headers: {
      'accept-encoding': 'br'
    }
  })

  t.is(res.headers['content-encoding'], 'br')
  t.is(res.statusCode, 201)
  t.is(data.toString(), 'hello world')
})
